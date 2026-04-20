#!/usr/bin/env python3
"""
Batch AI image generation for Cosmo Club Paris (Gemini Nano Banana / 2.5 Flash Image).

Usage:
    GEMINI_API_KEY=xxx python3 scripts/gen-images.py
    GEMINI_API_KEY=xxx python3 scripts/gen-images.py --only hero-bar,latte-matcha
    GEMINI_API_KEY=xxx python3 scripts/gen-images.py --model pro   # higher quality, slower
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

# Load .env.local if python-dotenv is missing (lightweight parser)
def _load_env_local():
    root = Path(__file__).resolve().parent.parent
    env_file = root / ".env.local"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
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

MODELS = {
    "flash": "gemini-2.5-flash-image",
    "pro": "gemini-3-pro-image-preview",
}

DA_PREFIX = (
    "Editorial daylight photography, premium Parisian luxury mood, references "
    "Aesop stores, Kinfolk magazine, Cereal magazine, Ruinart daytime campaigns. "
    "Background: warm cream/biscuit tones (light linen, pale marble, blond oak, "
    "matte ivory ceramic surface — NEVER dark, NEVER black). "
    "Accents of deep garnet red (the cocktail / subject itself) and muted antique gold. "
    "Soft directional natural daylight from the side, bright but moody, warm shadows, "
    "film-like, 4K, professional studio photography, photorealistic (NOT illustration, "
    "NOT cartoon, NOT 3D render), rule of thirds. "
    "No text, no labels, no logos, no watermarks, no color codes in the image."
)

IMAGES = [
    {
        "id": "hero-home",
        "label": "Hero HOME (16:9 — ambiance bar événementiel)",
        "aspect": "16:9",
        "prompt": (
            "Wide editorial scene of an elegant event cocktail bar at sunset golden "
            "hour: a pale cream marble bar top with three crystal coupe glasses filled "
            "with deep garnet cocktails (gold leaf floating), a small vase with dried "
            "wheat stems, a linen napkin folded to the side, a single brass spoon. "
            "Background softly out of focus: ivory linen curtain with warm golden "
            "daylight streaming through, creating soft bokeh. Pale biscuit and cream "
            "tones dominant, occasional garnet red accents from the drinks. Shot from "
            "a slightly low angle, shallow depth of field, Ruinart campaign meets "
            "Aesop store, airy and luxurious, film grain, no text, no people."
        ),
    },
    {
        "id": "hero-bar",
        "label": "Hero bar à cocktails (16:9)",
        "aspect": "16:9",
        "prompt": (
            "Close-up three-quarter view of a single elegant martini glass filled "
            "with deep garnet red Cosmopolitan-style cocktail, tiny flecks of gold "
            "leaf floating on the surface catching light, rim frost, single garnish "
            "of orange zest, small raspberry. Pale cream linen tablecloth background "
            "(warm beige #E8D9B4), slightly blurred. Soft daylight from the left, warm "
            "natural shadows. Biscuit-tone palette, bright but not stark. Shot on "
            "Hasselblad, 85mm, f/2.5, editorial magazine look, Aesop-store mood."
        ),
    },
    {
        "id": "hero-barista",
        "label": "Hero barista (16:9)",
        "aspect": "16:9",
        "prompt": (
            "Overhead flat-lay top-down view of a matcha latte in a minimalist matte "
            "cream porcelain cup with delicate fern rosetta latte art in ivory foam "
            "over vibrant matcha green. Cup rests on a pale blond oak tray on a cream "
            "linen surface. Composition includes a sprig of fresh mint and a small "
            "brass spoon. Soft warm daylight, Kinfolk magazine aesthetic, biscuit-cream "
            "palette background, bright but intimate."
        ),
    },
    {
        "id": "bento-bar",
        "label": "Bento card — Bar à cocktails (3:4)",
        "aspect": "3:4",
        "prompt": (
            "Elegant close-up food photography: a single hand-crafted deep red cocktail "
            "in a crystal coupe glass, shot from low three-quarter angle. Garnished "
            "with a fresh raspberry and a thin dehydrated orange wheel, a tiny gold "
            "leaf flake floating on top. Pale cream marble surface underneath, "
            "soft ivory background wall very slightly blurred (warm biscuit tones). "
            "Daylight from window, airy Aesop campaign style. No text or labels."
        ),
    },
    {
        "id": "bento-barista",
        "label": "Bento card — Barista (3:4)",
        "aspect": "3:4",
        "prompt": (
            "NOT a cocktail, NOT a glass, NOT red. This is specifically a CUP OF "
            "COFFEE, an UBE LATTE. Three-quarter angled close-up of a wide-brimmed "
            "CERAMIC COFFEE CUP (matte white or cream, like a cappuccino mug) filled "
            "with creamy vibrant lavender-purple liquid (ube latte), topped with "
            "white/ivory foam featuring a delicate rosetta latte art heart pattern. "
            "The cup rests on a pale cream linen napkin on a blond oak wooden table. "
            "Background: soft out-of-focus warm cream wall, daylight window nearby. "
            "Tiny crushed cardamom flecks scattered on the linen. Aesop-store mood, "
            "Kinfolk magazine editorial, natural warm daylight from the side. "
            "The subject must clearly read as a COFFEE/LATTE, not a cocktail. "
            "No alcohol, no wine glass, no cocktail stem — just a coffee mug."
        ),
    },
    {
        "id": "gallery-event",
        "label": "Gallery event (4:5)",
        "aspect": "4:5",
        "prompt": (
            "Bright editorial still life photograph: a cluster of elegant crystal "
            "cocktail coupes on a pale cream marble bar top, filled with deep garnet "
            "cocktails with tiny gold leaf flakes floating. Warm out-of-focus ivory "
            "and gold bokeh of soft daylight through linen curtains in the background. "
            "Warm biscuit and ivory color grading, shallow depth of field. No people "
            "visible, just the cocktails and minimalist decor. Magazine photography."
        ),
    },
    {
        "id": "latte-matcha",
        "label": "Latte Matcha (1:1 top-view)",
        "aspect": "1:1",
        "prompt": (
            "Perfectly symmetrical overhead top-down view of a matcha latte in a "
            "minimalist matte cream porcelain cup, viewed straight down. Vibrant "
            "matcha green surface with a precise ivory fern rosetta latte art. "
            "Pale cream linen background (warm biscuit tone #E8D9B4), soft side "
            "daylight. Cup fills 85 percent of the square frame. Clean composition, "
            "magazine food photography, hyperreal, no text."
        ),
    },
    {
        "id": "latte-ube",
        "label": "Latte Ube (1:1 top-view)",
        "aspect": "1:1",
        "prompt": (
            "Overhead top-down view of an ube latte. The cup fills 85 percent of the "
            "square frame, cropped close. Matte cream porcelain cup, deep lavender-"
            "purple latte with a crisp ivory rosetta latte art pattern. Pale cream "
            "linen background (biscuit tone). Soft natural daylight, studio food "
            "photography, clean and bright. Tightly centered on the cup."
        ),
    },
    {
        "id": "latte-blue",
        "label": "Latte Blue (1:1 top-view)",
        "aspect": "1:1",
        "prompt": (
            "Overhead top-down view of a butterfly-pea-flower blue latte. The cup "
            "fills 85 percent of the square frame. Matte cream porcelain cup, "
            "periwinkle blue liquid with a marbled citrus swirl pattern. Pale cream "
            "linen background (biscuit tone). Soft natural daylight, food photography, "
            "tightly centered on the cup."
        ),
    },
    {
        "id": "latte-golden",
        "label": "Latte Golden (1:1 top-view)",
        "aspect": "1:1",
        "prompt": (
            "Overhead top-down view of a turmeric golden latte. The cup fills 85 "
            "percent of the square frame. Matte warm beige ceramic cup, warm saffron-"
            "gold latte with a starburst sprinkle of cinnamon and cardamom in the "
            "foam. Pale cream linen background (biscuit tone). Soft natural daylight, "
            "food photography, tightly centered on the cup."
        ),
    },
]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="Comma-separated image IDs to generate")
    parser.add_argument("--model", default="flash", choices=["flash", "pro"])
    parser.add_argument("--out", default="public/brand/ai")
    args = parser.parse_args()

    out_dir = Path(__file__).resolve().parent.parent / args.out
    out_dir.mkdir(parents=True, exist_ok=True)

    targets = IMAGES
    if args.only:
        wanted = {s.strip() for s in args.only.split(",")}
        targets = [i for i in IMAGES if i["id"] in wanted]
        if not targets:
            print(f"No matching images in --only={args.only}", file=sys.stderr)
            sys.exit(1)

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    model_id = MODELS[args.model]
    print(f"→ Model: {model_id}")
    print(f"→ Output: {out_dir}")
    print(f"→ {len(targets)} image(s) to generate\n")

    for i, spec in enumerate(targets, 1):
        full_prompt = (
            f"{DA_PREFIX}\n\nAspect ratio: {spec['aspect']}.\n\n{spec['prompt']}"
        )
        print(f"[{i}/{len(targets)}] {spec['label']} …", end=" ", flush=True)
        t0 = time.time()
        try:
            response = client.models.generate_content(
                model=model_id,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(aspect_ratio=spec["aspect"]),
                ),
            )
        except Exception as e:
            print(f"✗ {e}")
            continue

        saved = 0
        try:
            candidate = response.candidates[0] if response.candidates else None
            parts = candidate.content.parts if candidate and candidate.content else None
            for part in (parts or []):
                if getattr(part, "inline_data", None) and part.inline_data.data:
                    img = Image.open(BytesIO(part.inline_data.data))
                    out_path = out_dir / f"{spec['id']}.png"
                    img.save(out_path, "PNG", optimize=True)
                    saved += 1
                    print(f"✓ {out_path.name} ({img.width}×{img.height}, {round(os.path.getsize(out_path)/1024)}KB, {time.time()-t0:.1f}s)")
                    break
        except Exception as inner:
            print(f"✗ parse error: {inner}")
            continue
        if not saved:
            reason = ""
            if response.candidates and response.candidates[0].finish_reason:
                reason = f" (finish_reason={response.candidates[0].finish_reason})"
            if response.prompt_feedback and getattr(response.prompt_feedback, "block_reason", None):
                reason += f" (block_reason={response.prompt_feedback.block_reason})"
            print(f"✗ no image in response{reason}")

    print("\nDone.")


if __name__ == "__main__":
    main()
