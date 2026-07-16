"""
Sweep CLIP plant-probability thresholds for precision / recall.

Layout (default under ``evals/clip_eval_images/``)::

    clip_eval_images/
      plant/         # ground-truth plants  (label=True)
      non_plant/     # ground-truth non-plants (label=False)

Run from ``apps/backend-py``::

    uv run python -m evals.clip_threshold
    uv run python -m evals.clip_threshold --data-dir /path/to/clip_eval_images
    uv run python -m evals.clip_threshold --step 0.01 --start 0.50 --stop 0.85

Scores each image once, then evaluates every cutoff in the sweep.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# Allow ``uv run python -m evals.clip_threshold`` with package under src/
_SRC = Path(__file__).resolve().parents[1] / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from backend_py.capabilities.clip_plant import plant_probability  # noqa: E402
from backend_py.config import config  # noqa: E402

_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}

_DEFAULT_DATA_DIR = Path(__file__).resolve().parent / "clip_eval_images"


def _collect_labeled_images(data_dir: Path) -> tuple[list[Path], list[bool]]:
    plant_dir = data_dir / "plant"
    non_plant_dir = data_dir / "non_plant"

    if not plant_dir.is_dir() or not non_plant_dir.is_dir():
        raise SystemExit(
            f"Expected {plant_dir} and {non_plant_dir}.\n"
            "Add images under plant/ (True) and non_plant/ (False), then re-run."
        )

    paths: list[Path] = []
    labels: list[bool] = []

    for path in sorted(plant_dir.iterdir()):
        if path.suffix.lower() in _IMAGE_SUFFIXES and path.is_file():
            paths.append(path)
            labels.append(True)

    for path in sorted(non_plant_dir.iterdir()):
        if path.suffix.lower() in _IMAGE_SUFFIXES and path.is_file():
            paths.append(path)
            labels.append(False)

    if not paths:
        raise SystemExit(f"No images found under {plant_dir} or {non_plant_dir}.")

    return paths, labels


def _score_images(paths: list[Path]) -> np.ndarray:
    scores: list[float] = []
    for i, path in enumerate(paths, start=1):
        with Image.open(path) as img:
            rgb = img.convert("RGB")
            score = plant_probability(rgb)
        scores.append(score)
        print(f"[{i}/{len(paths)}] {path.name}: plant_prob={score:.3f}", flush=True)
    return np.array(scores, dtype=float)


def sweep_thresholds(
    scores: np.ndarray,
    truth: np.ndarray,
    *,
    start: float = 0.05,
    stop: float = 1.0,
    step: float = 0.05,
) -> None:
    """Print precision / recall for each threshold (model already scored once)."""
    print()
    print(
        f"{'threshold':>10}  {'precision':>10}  {'recall':>10}  "
        f"{'tp':>4}  {'fp':>4}  {'fn':>4}"
    )
    current = config.clip_plant_threshold
    best_f1 = -1.0
    best_t = current

    for t in np.arange(start, stop, step):
        predicted = scores >= t
        tp = int(np.sum(predicted & truth))
        fp = int(np.sum(predicted & ~truth))
        fn = int(np.sum(~predicted & truth))
        precision = tp / (tp + fp) if tp + fp else 1.0
        recall = tp / (tp + fn) if tp + fn else 1.0
        f1 = (
            2 * precision * recall / (precision + recall)
            if precision + recall
            else 0.0
        )
        marker = "  <-- current" if abs(t - current) < step / 2 else ""
        print(
            f"{t:10.2f}  {precision:10.2f}  {recall:10.2f}  "
            f"{tp:4d}  {fp:4d}  {fn:4d}{marker}"
        )
        if f1 > best_f1:
            best_f1 = f1
            best_t = float(t)

    print()
    print(f"Current CLIP_PLANT_THRESHOLD={current:.2f}")
    print(f"Best F1 on this set ≈ threshold={best_t:.2f} (F1={best_f1:.2f})")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="CLIP plant-probability threshold precision/recall sweep"
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=_DEFAULT_DATA_DIR,
        help=f"Folder with plant/ and non_plant/ (default: {_DEFAULT_DATA_DIR})",
    )
    parser.add_argument("--start", type=float, default=0.05)
    parser.add_argument("--stop", type=float, default=1.0)
    parser.add_argument("--step", type=float, default=0.05)
    args = parser.parse_args()

    paths, labels = _collect_labeled_images(args.data_dir.resolve())
    n_pos = sum(labels)
    n_neg = len(labels) - n_pos
    print(f"Loaded {len(paths)} images ({n_pos} plant, {n_neg} non_plant)")
    print("Scoring with CLIP ViT-B/32 (once per image)…")

    scores = _score_images(paths)
    truth = np.array(labels, dtype=bool)

    sweep_thresholds(
        scores,
        truth,
        start=args.start,
        stop=args.stop,
        step=args.step,
    )


if __name__ == "__main__":
    main()
