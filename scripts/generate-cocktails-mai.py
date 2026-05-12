#!/usr/bin/env python3
"""
Generate three photo-realistic shots of the May signature cocktails:
L'Effleurée, Le Velours Grenat, L'Or Solaire.

Strategy — keep a strictly shared art direction (lens, light, surface,
mood) and let only the glassware, liquid colour and garnish change.
Three frames that read as the same shoot, the same wall, the same hour
of the day. That's what makes the trio feel like a Cosmo Club series
rather than three random renders.

Usage:
    GEMINI_API_KEY=... python3 scripts/generate-cocktails-mai.py \\
        [--model flash|pro] [--out <dir>]

Outputs PNGs into ./generated-cocktails-mai/ by default.
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

ASPECT_RATIO = "3:4"

# Shared art direction — the *frame* that doesn't move across the trio.
# Light, surface, lens vocabulary all stay identical so the three shots
# read as a single carnet de saison.
BASE_ART_DIRECTION = """
Photo-realistic editorial still life of a single signature cocktail.
Premium Parisian cocktail bar aesthetic, inspired by Ruinart and Aesop
editorial photography — nocturnal, sensual, restrained.

Composition (MUST stay identical across the three frames):
- Portrait 3:4 framing.
- Single glass slightly off-centre, generous negative space upper-right.
- Camera angle: three-quarter, ~25° above the rim, ~35 cm distance.
- Surface: hand-troweled deep-noir plaster tabletop with subtle warm
  cream undertones (#2a1f14 → #ede3c9 micro-gradient), faint grain.
- Background: blurred dark grenat curtain folds (~#2a0e0e) with a single
  soft warm light source from upper-left, painterly fall-off into
  near-black on the right edge.
- Lighting: one large diffused sidelight (key) + a faint warm rim from
  the back-left simulating a candle. Long, soft shadows.
- Lens: 85mm equivalent, f/2.0, subtle film grain, slight halation on
  the highlights of the liquid.
- Colour palette: brand grenat #8B1A1A, antique gold #C9A961, cream
  #ede3c9, near-black #0A0A0A. No saturated blues, no pure whites.
- Garnish placed deliberately — never the centre, slightly off-axis.
- Cinematic, editorial, magazine-quality. No text, no logos, no people,
  no extra glassware, no garnish anywhere except where described.
""".strip()


COCKTAILS = [
    {
        "slug": "leffleuree",
        "name": "L'Effleurée",
        "prompt": """
Subject of this frame: a pale, almost-clear cocktail in a vintage
coupe glass — fine stem, shallow round bowl. The liquid is the colour
of dawn: a transparent very pale gold barely tinted by elderflower,
with the cleanest tonic still rising in tiny bubbles. Two paper-thin
diagonal slices of cucumber float on the surface, slightly overlapping.
A single edible flower — a small pansy or capucine in warm coral —
rests on the rim, off-axis to the upper-right.

The glass should catch the warm key light along its right edge with a
delicate specular highlight; the stem casts a clean elongated shadow
on the plaster surface. Coupe rim slightly frosted (just-came-out-of-the-freezer
condensation). No ice cubes visible — the cocktail is served chilled,
nothing else.

Mood: floral, whispered, the very first hours of an aperitif.
""".strip(),
    },
    {
        "slug": "velours-grenat",
        "name": "Le Velours Grenat",
        "prompt": """
Subject of this frame: a deep grenat-red cocktail in a heavy-bottom
crystal tumbler (Old Fashioned glass), faceted sides, ~10cl serve. The
liquid is the brand grenat #8B1A1A but with a velvety almost-purple
depth from the balsamique réduit, glossy and slow-moving. A single
large hand-cut ice cube fills most of the glass — perfectly clear, with
visible interior facets where the light refracts.

Three fresh raspberries sit on top of the ice, beside a curled lime
zest still showing fresh pith. A few specks of pink peppercorn rest
on the rim. Condensation on the lower third of the tumbler.

The glass should catch the warm key light with a tall vertical specular
on one facet, and a soft warm rim glow on the opposite side. The
liquid's surface reflects the curtain folds in the background as a
narrow distorted band of darker red.

Mood: dense, structured, the end of a dinner that gets longer than
planned.
""".strip(),
    },
    {
        "slug": "or-solaire",
        "name": "L'Or Solaire",
        "prompt": """
Subject of this frame: a warm amber-gold cocktail in a heavy
hand-thrown porcelain cup — matte cream exterior, glossy white inside,
slightly irregular rim, no handle (a coffee-cup shape but slightly
wider). The liquid below is a deep golden honey-amber from the
turmeric-infused rum + filtered espresso emulsion, topped with a thin
crown of pale-gold microfoam in which a faint swirl of curcuma is
visible.

A single thin slice of fresh curcuma root rests on the foam, off-axis;
a few green cardamom pods sit alongside it on the porcelain saucer
under the cup. A wisp of steam should NOT be visible — the cocktail
is barely warm, served before the foam falls.

The porcelain should catch the warm key light with a soft diffused
sheen along its right curve (no harsh specular — porcelain reads
matte). The cup casts a wide soft shadow on the plaster. A whisper of
golden flare from the upper-left light source on the corner of the
foam.

Mood: alchemical, transitional, the hour where a bar becomes a
barista.
""".strip(),
    },
]


def build_full_prompt(cocktail: dict) -> str:
    return (
        BASE_ART_DIRECTION
        + "\n\nThis specific frame:\n"
        + cocktail["prompt"]
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=MODELS.keys(), default="pro")
    parser.add_argument(
        "--out",
        default=str(Path(__file__).resolve().parent.parent / "generated-cocktails-mai"),
    )
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print(
            "ERROR: GEMINI_API_KEY env var is required.\n"
            "Usage: GEMINI_API_KEY=... python3 scripts/generate-cocktails-mai.py",
            file=sys.stderr,
        )
        return 2

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print(
            "ERROR: google-genai package is missing. Install with:\n"
            "    pip3 install google-genai",
            file=sys.stderr,
        )
        return 2

    client = genai.Client(api_key=api_key)
    model = MODELS[args.model]
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")

    for cocktail in COCKTAILS:
        print(f"→ {cocktail['name']} ({cocktail['slug']})…", flush=True)
        prompt = build_full_prompt(cocktail)
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(aspect_ratio=ASPECT_RATIO),
                ),
            )
        except Exception as err:
            print(f"  ✗ generation failed: {err}", file=sys.stderr)
            continue

        image_bytes = None
        for part in response.candidates[0].content.parts:
            if getattr(part, "inline_data", None):
                image_bytes = part.inline_data.data
                break

        if not image_bytes:
            print("  ✗ no image returned", file=sys.stderr)
            continue

        stamped = out_dir / f"{cocktail['slug']}-{stamp}.png"
        canonical = out_dir / f"{cocktail['slug']}.png"
        stamped.write_bytes(image_bytes)
        canonical.write_bytes(image_bytes)
        print(f"  ✓ saved {canonical.name}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
