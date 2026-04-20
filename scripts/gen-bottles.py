#!/usr/bin/env python3
"""
Generate 3 bottle photos (20cl, 50cl, 1L) in Cosmo Club style,
using a user-provided reference image for style guidance.

Usage:
    python3 scripts/gen-bottles.py
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path


def _load_env_local():
    root = Path(__file__).resolve().parent.parent
    env_file = root / ".env.local"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


_load_env_local()

if not os.environ.get("GEMINI_API_KEY"):
    print("✗ GEMINI_API_KEY missing", file=sys.stderr)
    sys.exit(1)

from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO


REFERENCE_PATH = "public/brand/references/bottles-reference.jpg"

BOTTLES = [
    {
        "id": "bottle-20cl",
        "label": "Bottle 20 cl (3:4)",
        "aspect": "3:4",
        "prompt": (
            "Product photography of a SINGLE small apothecary glass bottle (20cl size), "
            "matching the style of the reference image exactly: minimalist cream paper "
            "label with clean serif typography, blond natural wood cap, clear glass showing "
            "deep garnet-red cocktail liquid inside. The label reads 'COSMO CLUB' in "
            "understated serif, with '20 CL' small text at the bottom corner. Bottle "
            "centered in frame, standing on a dark polished marble surface with subtle "
            "veining. Background: soft pale cream wall, slightly out of focus, warm natural "
            "daylight from the left creating gentle shadow on the right. Same color palette "
            "and mood as the reference: airy, editorial, luxurious, minimalist. "
            "Shot from slightly below eye-level, f/2.8, soft film grain, Ruinart-style "
            "product photography. No other objects, just the one bottle."
        ),
    },
    {
        "id": "bottle-50cl",
        "label": "Bottle 50 cl (3:4)",
        "aspect": "3:4",
        "prompt": (
            "Product photography of a SINGLE medium glass bottle (50cl size — slightly "
            "taller and wider than a 20cl), in IDENTICAL style to the reference image: "
            "minimalist cream paper label with clean serif typography, blond natural wood "
            "cap, clear glass showing deep garnet-red cocktail liquid inside. The label "
            "reads 'COSMO CLUB' in understated serif, with '50 CL' small text at the "
            "bottom corner. Bottle centered in frame on a dark polished marble surface. "
            "Pale cream wall background, warm natural daylight from the left, same airy "
            "editorial mood as the reference. EXACT same camera angle, framing, lighting "
            "and mood as the 20cl version. Only the bottle size changes."
        ),
    },
    {
        "id": "bottle-1L",
        "label": "Bottle 1 L (3:4)",
        "aspect": "3:4",
        "prompt": (
            "Product photography of a SINGLE large glass bottle (1 litre size — wider "
            "apothecary shape, clearly bigger than 20cl or 50cl), in IDENTICAL style to "
            "the reference image: minimalist cream paper label with clean serif typography, "
            "blond natural wood cap, clear glass showing deep garnet-red cocktail liquid "
            "inside. The label reads 'COSMO CLUB' in understated serif, with '1 L' small "
            "text at the bottom corner. Bottle centered in frame on a dark polished marble "
            "surface. Pale cream wall background, warm natural daylight from the left, "
            "same airy editorial mood as the reference. EXACT same camera angle, framing "
            "and lighting as the 20cl and 50cl versions. Only the bottle size changes."
        ),
    },
]


def main():
    root = Path(__file__).resolve().parent.parent
    out_dir = root / "public" / "brand" / "ai"
    out_dir.mkdir(parents=True, exist_ok=True)

    ref_path = root / REFERENCE_PATH
    if not ref_path.exists():
        print(f"✗ Reference image not found at {ref_path}", file=sys.stderr)
        sys.exit(1)

    ref_image = Image.open(ref_path)
    print(f"→ Reference loaded: {ref_path.name} ({ref_image.size})")

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    model_id = "gemini-2.5-flash-image"
    print(f"→ Model: {model_id}")
    print(f"→ Output: {out_dir}")
    print(f"→ {len(BOTTLES)} bottle(s) to generate\n")

    for i, spec in enumerate(BOTTLES, 1):
        print(f"[{i}/{len(BOTTLES)}] {spec['label']} …", end=" ", flush=True)
        t0 = time.time()
        try:
            response = client.models.generate_content(
                model=model_id,
                contents=[ref_image, spec["prompt"]],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(aspect_ratio=spec["aspect"]),
                ),
            )
        except Exception as e:
            print(f"✗ {e}")
            continue

        saved = False
        try:
            candidate = response.candidates[0] if response.candidates else None
            parts = candidate.content.parts if candidate and candidate.content else None
            for part in (parts or []):
                if getattr(part, "inline_data", None) and part.inline_data.data:
                    img = Image.open(BytesIO(part.inline_data.data))
                    out_path = out_dir / f"{spec['id']}.png"
                    img.save(out_path, "PNG", optimize=True)
                    saved = True
                    elapsed = time.time() - t0
                    size_kb = round(os.path.getsize(out_path) / 1024)
                    print(f"✓ {out_path.name} ({img.width}×{img.height}, {size_kb}KB, {elapsed:.1f}s)")
                    break
        except Exception as inner:
            print(f"✗ parse error: {inner}")
            continue
        if not saved:
            print("✗ no image in response")

    print("\nDone.")


if __name__ == "__main__":
    main()
