"""Shared helpers for structured LLM calls in the linear pipeline."""

from __future__ import annotations

import base64
import json
import logging
import re
import time
from typing import Any, TypeVar

import httpx
from pydantic import BaseModel

from backend_py.config import config

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

_THINK_BLOCK = re.compile(
    r"(?:<think>[\s\S]*?</think>|Thinking:[\s\S]*?(?=\{))",
    re.IGNORECASE,
)

# Hand-written Fireworks-friendly schemas (no $ref / anyOf / defaults).
# Keys are Pydantic model names.
FIREWORKS_JSON_SCHEMAS: dict[str, dict[str, Any]] = {
    "TriageResult": {
        "name": "TriageResult",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "is_plant": {"type": "boolean"},
                "structured_facts": {
                    "type": "object",
                    "properties": {
                        "raw_text": {"type": "string"},
                        "location": {"type": ["string", "null"]},
                        "watering_frequency": {"type": ["string", "null"]},
                        "light_conditions": {"type": ["string", "null"]},
                    },
                    "required": [
                        "raw_text",
                        "location",
                        "watering_frequency",
                        "light_conditions",
                    ],
                    "additionalProperties": False,
                },
            },
            "required": ["is_plant", "structured_facts"],
            "additionalProperties": False,
        },
    },
}


def _chat_completions_url() -> str:
    trimmed = config.py_llm_api_url.rstrip("/")
    if trimmed.endswith("/chat/completions"):
        return trimmed
    return f"{trimmed}/chat/completions"


def _strip_reasoning(content: str) -> str:
    """Remove Qwen-style think blocks before JSON parsing."""
    return _THINK_BLOCK.sub("", content).strip()


def _extract_json_object(content: str) -> dict[str, Any]:
    text = _strip_reasoning(content)
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    first = text.find("{")
    last = text.rfind("}")
    if first == -1 or last <= first:
        raise ValueError("LLM response did not contain a JSON object")
    parsed = json.loads(text[first : last + 1])
    if not isinstance(parsed, dict):
        raise ValueError("LLM JSON was not an object")
    return parsed


def _json_schema_for(schema: type[BaseModel]) -> dict[str, Any]:
    custom = FIREWORKS_JSON_SCHEMAS.get(schema.__name__)
    if custom is not None:
        return custom

    # Fallback: best-effort from Pydantic (may not work with Fireworks strict).
    raw = schema.model_json_schema()
    return {
        "name": schema.__name__,
        "strict": False,
        "schema": raw,
    }


def _model_wants_no_think() -> bool:
    name = (config.py_llm_model or "").lower()
    return "qwen" in name


async def image_url_to_data_url(image_url: str) -> str:
    """Fetch an image URL (including local uploads) and return a data URL."""
    if image_url.startswith("data:"):
        return image_url

    timeout = httpx.Timeout(config.llm_timeout_ms / 1000)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(image_url)
        response.raise_for_status()
        mime = (response.headers.get("content-type") or "image/jpeg").split(";")[0]
        if not mime.startswith("image/"):
            mime = "image/jpeg"
        encoded = base64.b64encode(response.content).decode("ascii")
        return f"data:{mime};base64,{encoded}"


async def invoke_json(
    *,
    system: str,
    user_text: str,
    schema: type[T],
    image_url: str | None = None,
    max_tokens: int | None = None,
) -> T:
    """
    Call the configured OpenAI-compatible chat model and parse a Pydantic object.

    Uses Fireworks-style ``response_format.json_schema`` (same pattern as Node
    dashboard analyze) for reliable structured output.
    """
    if not config.py_llm_api_key:
        raise RuntimeError("BACKEND_PY_LLM_API_KEY is not configured")
    if not config.py_llm_api_url:
        raise RuntimeError("BACKEND_PY_LLM_API_URL is not configured")
    if not config.py_llm_model:
        raise RuntimeError("BACKEND_PY_LLM_API_MODEL is not configured")

    user_prompt = user_text
    if _model_wants_no_think():
        # Qwen3 models otherwise emit long chain-of-thought instead of JSON.
        user_prompt = f"{user_text}\n\n/no_think"

    user_content: list[dict[str, Any]] = [{"type": "text", "text": user_prompt}]
    if image_url:
        data_url = await image_url_to_data_url(image_url)
        user_content.insert(
            0,
            {
                "type": "image_url",
                "image_url": {"url": data_url, "detail": "high"},
            },
        )

    body: dict[str, Any] = {
        "model": config.py_llm_model,
        "temperature": 0,
        "max_tokens": max_tokens if max_tokens is not None else config.llm_max_tokens,
        "response_format": {
            "type": "json_schema",
            "json_schema": _json_schema_for(schema),
        },
        "messages": [
            {
                "role": "system",
                "content": (
                    f"{system}\n\n"
                    "You must return a single JSON object that matches the "
                    "response schema. No markdown fences."
                ),
            },
            {"role": "user", "content": user_content},
        ],
    }

    timeout = httpx.Timeout(config.llm_timeout_ms / 1000)
    started = time.perf_counter()
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            _chat_completions_url(),
            headers={
                "Authorization": f"Bearer {config.py_llm_api_key}",
                "Content-Type": "application/json",
            },
            json=body,
        )
    latency_ms = int((time.perf_counter() - started) * 1000)

    if response.status_code >= 400:
        raise RuntimeError(
            f"LLM request failed with {response.status_code}: {response.text[:800]}"
        )

    payload = response.json()
    choices = payload.get("choices") or []
    if not choices:
        raise RuntimeError("LLM response had no choices")
    message = choices[0].get("message") or {}
    content = message.get("content") or ""
    if not content:
        reasoning = message.get("reasoning_content") or ""
        raise RuntimeError(
            "LLM response missing content"
            + (
                f" (reasoning_content present, {len(reasoning)} chars)"
                if reasoning
                else ""
            )
        )

    try:
        parsed = schema.model_validate(_extract_json_object(content))
    except Exception:
        logger.exception(
            "Failed to parse LLM JSON for %s after %sms: %s",
            schema.__name__,
            latency_ms,
            content[:500],
        )
        raise

    logger.info(
        "LLM JSON call ok schema=%s latency_ms=%s",
        schema.__name__,
        latency_ms,
    )
    return parsed
