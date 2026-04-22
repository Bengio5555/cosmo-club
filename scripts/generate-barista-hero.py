#!/usr/bin/env python3
"""
Generate a 16:9 Barista hero shot featuring the 4 signature lattes
(matcha / ube / blue / golden) staged on a premium barista bar.

Uses Gemini Nano Banana in multi-image composition mode: the 4 previously
generated latte shots are passed as visual references so that the lattes
in the new hero shot stay color-accurate and on-brand.

Usage:
    GEMINI_API_KEY=... python3 scripts/generate-barista-hero.py \
        [--model flash|pro] [--out <dir>] [--lattes-dir generated-lattes]
"""

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path


MODELS = {
    "flash": "gemini-2.5-flash-image",
    "pro": "gemini-3-pro-image-preview",
}

ASPECT_RATIO = "16:9"

PROMPT = """
Photo-realistic editorial hero shot for a Parisian cocktail-club & barista
brand. Wide cinematic 16:9 landscape framing. No humans. No hands. No text.
No logos.

Scene:
A premium barista bar counter — dark walnut wood counter with subtle grain,
warm directional lighting from the left (late afternoon / golden-hour),
softly out-of-focus vintage espresso machine silhouette in the blurred
background. The four signature iced lattes from the provided reference
images are staged in a line along the counter, slightly angled three-quarter
view, evenly spaced, each in a tall clear tumbler glass exactly matching
the reference drinks:

  1. Matcha latte (jade green → white milk foam top), bright green matcha
     powder in a tiny mortar beside it.
  2. Ube latte (deep violet-purple → white milk foam), soft violet ube
     powder beside.
  3. Blue butterfly-pea latte (navy-blue marbled → white foam), ultramarine
     powder beside.
  4. Golden turmeric latte (amber-gold → cream foam), orange-gold turmeric
     powder beside.

Props: a light beige linen cloth runs under the glasses, a small light-wood
spoon rests in the foreground, tiny scattered powder specks near each
drink in its matching color. Subtle natural garnishes: a single matcha
whisk near the matcha, dried blue cornflower petals near the blue, a
cinnamon stick near the golden, a few taro leaves near the ube — all very
discreet, staged like a boutique magazine cover.

Lighting & finish:
Warm soft daylight from the left, creamy highlights on the glass, glossy
condensation droplets, gentle shadows on the walnut surface, shallow depth
of field with the background slightly bokehed. Subtle film grain, editorial
Kinfolk / Cereal mood, premium nocturnal-Parisian feel. Rich contrast but
soft. Muted creamy background wall.

The drinks must look EXACTLY like the colors of the four reference images
provided — same gradient drink, same glass shape, same proportion, same
ice cubes. Keep photorealism, no stylization, no illustration.
""".strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=MODELS.keys(), default="flash")
    parser.add_argument("--out", default="generated-lattes")
    parser.add_argument("--lattes-dir", default="generated-lattes")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY not set.", file=sys.stderr)
        sys.exit(1)

    try:
        from google import genai
        from google.genai import types
        from PIL import Image
    except ImportError as e:
        print(f"❌ Missing dep: {e}. Run: pip install google-genai pillow", file=sys.stderr)
        sys.exit(1)

    lattes_dir = Path(args.lattes_dir)
    required = ["latte-blue.png", "latte-matcha.png", "latte-ube.png", "latte-golden.png"]
    ref_images = []
    for fname in required:
        p = lattes_dir / fname
        if not p.exists():
            print(f"❌ Missing reference: {p}", file=sys.stderr)
            print("   Run scripts/generate-lattes.py first.", file=sys.stderr)
            sys.exit(2)
        ref_images.append(Image.open(p))
    print(f"✅ Loaded {len(ref_images)} reference lattes.")

    client = genai.Client(api_key=api_key)
    model_name = MODELS[args.model]
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")

    print(f"🎨 Generating Barista hero (model={model_name}, {ASPECT_RATIO})…")
    # Multi-image + prompt. Gemini Nano Banana accepts a list of contents.
    contents = [PROMPT, *ref_images]
    response = client.models.generate_content(
        model=model_name,
        contents=contents,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(aspect_ratio=ASPECT_RATIO),
        ),
    )

    image_bytes = None
    if response.candidates:
        for part in response.candidates[0].content.parts:
            if hasattr(part, "inline_data") and part.inline_data:
                image_bytes = part.inline_data.data
                break

    if not image_bytes:
        print("❌ No image returned by Gemini.", file=sys.stderr)
        if response.candidates:
            text_parts = [
                getattr(p, "text", "")
                for p in response.candidates[0].content.parts
                if hasattr(p, "text")
            ]
            if any(text_parts):
                print("   Model response text:", " ".join(t for t in text_parts if t))
        sys.exit(3)

    out_timestamped = out_dir / f"hero-barista-{ts}.png"
    out_stable = out_dir / "hero-barista.png"
    out_timestamped.write_bytes(image_bytes)
    out_stable.write_bytes(image_bytes)
    print(f"✅ {out_timestamped}")
    print(f"✅ {out_stable}  (overwrite target for admin slot: barista.hero)")


if __name__ == "__main__":
    main()
