"""Local CLIP ViT-B/32 zero-shot plant image check."""

from __future__ import annotations

import logging
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

import httpx
import open_clip
import torch
from PIL import Image

from backend_py.config import config

logger = logging.getLogger(__name__)

_PLANT_PROMPTS = (
    "a photo of a houseplant",
    "a photo of a potted plant",
    "a photo of green leaves on a plant",
    "a close-up of a plant leaf",
)

_NON_PLANT_PROMPTS = (
    "a photo of a person",
    "a photo of a car",
    "a photo of a dog or cat",
    "a photo of food on a plate",
    "a photo of furniture indoors",
    "a photo of a building",
)


@lru_cache
def _clip_bundle() -> tuple[torch.nn.Module, object, object, torch.device]:
    """Load CLIP ViT-B/32 once per process."""
    device = torch.device(config.clip_device)
    model, _, preprocess = open_clip.create_model_and_transforms(
        "ViT-B-32",
        pretrained="openai",
        force_quick_gelu=True,
    )
    model = model.to(device)
    model.eval()
    tokenizer = open_clip.get_tokenizer("ViT-B-32")
    logger.info("Loaded local CLIP ViT-B/32 on %s", device)
    return model, preprocess, tokenizer, device


def _upload_path_from_url(image_url: str) -> Path | None:
    """Map a public upload URL to a local file under UPLOAD_DIR when possible."""
    parsed = urlparse(image_url)
    path = parsed.path or ""
    marker = "/uploads/plant-photos/"
    if marker not in path:
        return None
    relative = path.split(marker, 1)[1]
    if not relative or ".." in relative:
        return None
    root = Path(config.upload_dir)
    if not root.is_absolute():
        root = config.workspace_root / root
    candidate = root / relative
    return candidate if candidate.is_file() else None


async def _load_image(image_url: str) -> Image.Image:
    local = _upload_path_from_url(image_url)
    if local is not None:
        return Image.open(local).convert("RGB")

    if image_url.startswith("data:"):
        # data:image/...;base64,...
        header, _, data = image_url.partition(",")
        import base64

        raw = base64.b64decode(data)
        return Image.open(BytesIO(raw)).convert("RGB")

    timeout = httpx.Timeout(config.llm_timeout_ms / 1000)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(image_url)
        response.raise_for_status()
        return Image.open(BytesIO(response.content)).convert("RGB")


@torch.inference_mode()
def plant_probability(image: Image.Image) -> float:
    """
    Zero-shot plant probability via CLIP ViT-B/32.

    Returns the softmax mass on plant prompts in ``[0, 1]``.
    """
    model, preprocess, tokenizer, device = _clip_bundle()
    image_tensor = preprocess(image).unsqueeze(0).to(device)

    prompts = [*_PLANT_PROMPTS, *_NON_PLANT_PROMPTS]
    text = tokenizer(list(prompts)).to(device)

    image_features = model.encode_image(image_tensor)
    text_features = model.encode_text(text)
    image_features = image_features / image_features.norm(dim=-1, keepdim=True)
    text_features = text_features / text_features.norm(dim=-1, keepdim=True)

    logits = (100.0 * image_features @ text_features.T).softmax(dim=-1)[0]
    return float(logits[: len(_PLANT_PROMPTS)].sum().item())


@torch.inference_mode()
def _score_is_plant(image: Image.Image) -> tuple[bool, float]:
    """Returns (is_plant, plant_probability) using ``CLIP_PLANT_THRESHOLD``."""
    plant_prob = plant_probability(image)
    return plant_prob >= config.clip_plant_threshold, plant_prob


async def image_is_plant(image_url: str) -> tuple[bool, float]:
    """Classify whether ``image_url`` depicts a plant. Raises on load/model errors."""
    import asyncio

    image = await _load_image(image_url)
    return await asyncio.to_thread(_score_is_plant, image)
