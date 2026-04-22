#!/usr/bin/env python3
"""
Generate 4 cohesive latte product shots via Gemini Nano Banana.

Strategy: generate the Blue latte first (closest to the user's reference),
then use Gemini's image-editing mode to produce the 3 other colorways from
that same base image — keeping composition, angle, props and lighting
perfectly consistent across the series.

Usage:
    GEMINI_API_KEY=... python3 scripts/generate-lattes.py \
        [--model flash|pro] [--out <dir>]

Outputs PNG files into ./generated-lattes/ by default. Do NOT drop the
folder into /public/brand/ai/ unreviewed — preview first.
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

ASPECT_RATIO = "3:4"  # portrait product shot


# Master art-direction shared by every shot — identical framing.
BASE_ART_DIRECTION = """
Photo-realistic editorial product shot of an iced latte drink.

Composition (MUST stay identical across the series):
- Portrait 3:4 framing, product centered slightly left with negative space at top.
- A tall straight clear tumbler glass placed on a small light-wood tray.
- Camera angle: three-quarter slightly elevated (~25°), realistic depth.
- Light beige linen cloth crumpled under the tray.
- Small stone mortar positioned top-right behind the tray, partially blurred.
- Light wooden spoon in the foreground diagonal, laid on the linen, with raw
  powder spilled beside it.
- Background: soft creamy-white / light ivory, gentle bokeh, second matching
  jar/glass blurred in the back-left (out of focus).

Lighting & texture:
- Natural soft daylight from the right, gentle blue-grey shadows.
- Clean highlights on the glass, fine condensation droplets on the outside.
- Subtle film grain, editorial Kinfolk / Cereal magazine mood.
- 4K sharpness on the glass and powder, tasteful shallow depth of field.

Drink:
- Ice cubes visible inside the glass.
- Vertical gradient / marbled swirl from the drink's main color at the bottom
  to a creamy white milk foam layer at the top.

Strict constraints:
- No text. No watermark. No logo. No straw. No hand. No human.
- Same composition, framing, props, lighting direction on every shot so that
  the 4 images feel like a single shoot.
""".strip()


VARIATIONS = [
    # (slug, human name, color brief for Gemini)
    (
        "latte-blue",
        "Blue butterfly pea latte",
        "Drink color: deep navy-blue at the bottom blending into indigo, then "
        "into pale blue, then white milk foam at top. Powder in the spoon and "
        "mortar is vivid ultramarine-blue butterfly pea powder. A few tiny "
        "dried blue cornflower petals rest on the tray (very subtle).",
    ),
    (
        "latte-matcha",
        "Matcha latte",
        "Drink color: deep vibrant jade green at the bottom fading up into "
        "pistachio green, then milky white foam at top. Powder in the spoon "
        "and mortar is bright grass-green matcha. A thin bamboo whisk (chasen) "
        "rests subtly behind the mortar.",
    ),
    (
        "latte-ube",
        "Ube (purple yam) latte",
        "Drink color: rich violet-purple at the bottom blending up into "
        "lavender, then creamy white foam at top. Powder in the spoon and "
        "mortar is soft violet ube powder. Very faint mauve cast on the linen.",
    ),
    (
        "latte-golden",
        "Golden turmeric latte",
        "Drink color: warm amber-gold at the bottom fading up into saffron "
        "yellow, then warm cream-white foam at top. Powder in the spoon and "
        "mortar is bright orange-gold turmeric. A broken cinnamon stick and "
        "two cardamom pods rest on the tray (subtle, autumnal warmth).",
    ),
]


def build_first_prompt(variation):
    _slug, name, color_brief = variation
    return (
        f"{BASE_ART_DIRECTION}\n\n"
        f"Subject: {name}.\n"
        f"{color_brief}\n"
        "Render as a premium product photograph for a Paris cocktail-club website."
    )


def build_edit_prompt(variation):
    """Prompt for image-editing mode: keep composition, change only color."""
    _slug, name, color_brief = variation
    return (
        "Use the provided reference image as the EXACT composition, framing, "
        "camera angle, props, tray, linen, mortar, spoon position, background "
        "and lighting. Do not move or replace any prop. Only change the drink "
        "inside the glass and the powder color so that the same shoot now "
        f"features a {name}.\n\n"
        f"{color_brief}\n\n"
        "Keep the same ice, same glass shape, same condensation, same grain, "
        "same shallow depth of field and soft daylight from the right. "
        "Output must feel like the 2nd photo from the same editorial shoot — "
        "identical staging, different colorway. No text, no logo, no straw."
    )


def gemini_generate(client, model_name, prompt, reference_image=None):
    from google.genai import types

    contents = [prompt, reference_image] if reference_image else prompt
    response = client.models.generate_content(
        model=model_name,
        contents=contents,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(aspect_ratio=ASPECT_RATIO),
        ),
    )
    if not response.candidates:
        return None
    for part in response.candidates[0].content.parts:
        if hasattr(part, "inline_data") and part.inline_data:
            return part.inline_data.data
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=MODELS.keys(), default="flash")
    parser.add_argument("--out", default="generated-lattes")
    parser.add_argument(
        "--only",
        help="Comma-separated slugs to (re)generate, e.g. 'latte-golden,latte-ube'",
    )
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY not set.", file=sys.stderr)
        sys.exit(1)

    try:
        from google import genai
        from PIL import Image
    except ImportError as e:
        print(f"❌ Missing dep: {e}. Run: pip install google-genai pillow", file=sys.stderr)
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    model_name = MODELS[args.model]
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")

    only = set(s.strip() for s in args.only.split(",")) if args.only else None

    # 1. Generate the Blue latte as the master reference.
    master_slug, master_name, _ = VARIATIONS[0]  # always blue
    print(f"🎨 [1/4] Master shot — {master_name}  (model={model_name}, {ASPECT_RATIO})")
    master_bytes = gemini_generate(client, model_name, build_first_prompt(VARIATIONS[0]))
    if not master_bytes:
        print("❌ Failed to generate master image.", file=sys.stderr)
        sys.exit(2)

    master_path = out_dir / f"{master_slug}-{ts}.png"
    master_path.write_bytes(master_bytes)
    print(f"   ✅ {master_path}")

    # Save a copy under the stable admin slot filename too.
    stable_master = out_dir / f"{master_slug}.png"
    stable_master.write_bytes(master_bytes)

    # 2. Use the master as a reference for the 3 other variants.
    from io import BytesIO

    master_image = Image.open(BytesIO(master_bytes))

    for i, variation in enumerate(VARIATIONS[1:], start=2):
        slug, name, _ = variation
        if only and slug not in only:
            print(f"⏭  [{i}/4] {name} skipped (--only filter)")
            continue

        print(f"🎨 [{i}/4] Variant — {name}  (editing from master)")
        variant_bytes = gemini_generate(
            client,
            model_name,
            build_edit_prompt(variation),
            reference_image=master_image,
        )
        if not variant_bytes:
            print(f"   ⚠️  Failed — you can retry with --only {slug}")
            continue

        variant_path = out_dir / f"{slug}-{ts}.png"
        variant_path.write_bytes(variant_bytes)
        stable_path = out_dir / f"{slug}.png"
        stable_path.write_bytes(variant_bytes)
        print(f"   ✅ {variant_path}")

    print("\n🎉 Done.")
    print(f"   Preview the 4 shots in: {out_dir.resolve()}")
    print(
        "   Once happy, upload via /admin → page 'lattes' into the slots\n"
        "   latte-matcha, latte-ube, latte-blue, latte-golden\n"
        "   OR copy the stable files over public/brand/ai/ and commit."
    )


if __name__ == "__main__":
    main()
