#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cosmo Club Paris - Premium Image Generation
Uses Gemini 2.5 Flash Image and Gemini 3 Pro Image Preview (Nano Banana)

Usage:
    python generate-cosmo-images.py                    # Generate all 9 images
    python generate-cosmo-images.py --pro              # Use Pro model for better quality
    python generate-cosmo-images.py --image hero-bar   # Generate specific image
"""

import argparse
import os
import sys
import json
from pathlib import Path
from datetime import datetime
import time

# Load environment
def load_env():
    """Load .env files"""
    env_paths = [
        Path.home() / ".claude" / "skills" / ".env",
        Path.home() / ".claude" / ".env"
    ]
    for env_path in env_paths:
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        if key not in os.environ:
                            os.environ[key] = value.strip('"\'')

load_env()

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("❌ Error: google-genai package not installed.")
    print("Install with: pip3 install google-genai")
    sys.exit(1)

# Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("❌ Error: GEMINI_API_KEY not set")
    sys.exit(1)

GEMINI_FLASH = "gemini-2.5-flash-image"
GEMINI_PRO = "gemini-3-pro-image-preview"

OUTPUT_DIR = Path("/Users/benjaminamouyal/Desktop/Claude/cosmo-club/public/brand/ai")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Image specifications
IMAGES = [
    {
        "id": "hero-bar",
        "filename": "hero-bar-cocktails.png",
        "section": "bar-a-cocktails",
        "title": "Hero Bar à Cocktails",
        "orientation": "landscape",
        "size": (1792, 1008),
        "prompt": "Ultra-luxury photorealistic martini cocktail. Deep burgundy-red grenat cocktail in crystal coupe glass, shot 3/4 overhead angle. Fine gold leaf floating on surface, frost on glass rim, single golden light reflection on crystal. Delicate wisps of white smoke. Dark navy-black #0A0A0A background. Studio lighting: dramatic key light from upper left, cinematic 4K quality. Style: Ruinart luxury campaign meets nocturnal Paris nightclub. Subtle film grain. Hyper-detailed."
    },
    {
        "id": "hero-barista",
        "filename": "hero-barista.png",
        "section": "barista",
        "title": "Hero Barista",
        "orientation": "landscape",
        "size": (1792, 1008),
        "prompt": "Overhead view luxury matcha latte. Vibrant matcha green latte with intricate fern latte art in white microfoam. Minimalist white ceramic cup on brushed brass saucer, resting on dark teak-stained wooden tray. Lush tropical green foliage background, soft warm raking light from side. Kinfolk magazine meets nocturnal editorial. 4K studio photography. Subtle shadows, warm gold undertones."
    },
    {
        "id": "bento-bar",
        "filename": "bento-bar-cocktails.png",
        "section": "bar-a-cocktails",
        "title": "Bento Card Bar",
        "orientation": "portrait",
        "size": (768, 1024),
        "prompt": "Elegant burgundy-red #8B1A1A cocktail in crystal glass, low-angle shot. Garnished with fresh berries and gold leaf. Gradient background: deep black #0A0A0A at top transitioning to rich burgundy. Gold accent (cocktail pick or zest). Cinematic lighting, dark moody, premium luxury nightclub editorial style. 4K detail, film grain."
    },
    {
        "id": "bento-barista",
        "filename": "bento-barista.png",
        "section": "barista",
        "title": "Bento Card Barista",
        "orientation": "portrait",
        "size": (768, 1024),
        "prompt": "Ube purple latte 3/4 side view. Creamy white rosette latte art on violet-lavender ube latte surface. Minimalist white ceramic cup. Pure black #0A0A0A background with subtle violet halo glow around cup. Studio lighting, luxe Instagram-aesthetic, dramatic. 4K professional photography."
    },
    {
        "id": "gallery-event",
        "filename": "gallery-event.png",
        "section": "evenements",
        "title": "Gallery Event",
        "orientation": "portrait",
        "size": (864, 1080),
        "prompt": "Cinematic celebration moment: hands clinking burgundy-red #8B1A1A cocktails, shallow depth of field blurred background with bokeh lights in warm gold and red tones. Bordeaux color cast, nocturnal ambiance. Premium wedding/corporate event aesthetic. Neon bokeh, dramatic cinematic lighting, 4K."
    },
    {
        "id": "latte-matcha",
        "filename": "latte-matcha.png",
        "section": "lattes",
        "title": "Latte Matcha",
        "orientation": "square",
        "size": (1024, 1024),
        "prompt": "Perfect overhead symmetrical matcha latte. Vibrant green matcha milk foam with intricate white rosette or fern latte art, centered. Minimalist white ceramic cup on black surface. Pure black #0A0A0A background. Soft studio diffused light from directly above. Photography studio 4K quality. No shadows."
    },
    {
        "id": "latte-ube",
        "filename": "latte-ube.png",
        "section": "lattes",
        "title": "Latte Ube",
        "orientation": "square",
        "size": (1024, 1024),
        "prompt": "Overhead perfect symmetrical ube latte. Rich purple-mauve latte surface with white latte art (heart or rosette center). Matte black ceramic cup on black background #0A0A0A. Extremely subtle violet halo glow. Studio lighting, centered composition, 4K luxury product photography."
    },
    {
        "id": "latte-blue",
        "filename": "latte-blue.png",
        "section": "lattes",
        "title": "Latte Blue",
        "orientation": "square",
        "size": (1024, 1024),
        "prompt": "Overhead perfect symmetrical butterfly pea flower blue latte. Periwinkle-blue latte with swirled lemon juice marbling effect. White ceramic cup on black background #0A0A0A. Subtle blue halo glow. Studio center lighting, 4K. Clean, luxe, Instagrammable."
    },
    {
        "id": "latte-golden",
        "filename": "latte-golden.png",
        "section": "lattes",
        "title": "Latte Golden",
        "orientation": "square",
        "size": (1024, 1024),
        "prompt": "Overhead perfect symmetrical golden turmeric latte. Warm saffron-gold milk with dusted cardamom powder on surface. Natural brown ceramic cup on black background #0A0A0A. Subtle warm gold halo glow. Studio diffused light, 4K photography. Luxe wellness aesthetic."
    }
]

def generate_image(prompt: str, filename: str, pro: bool = False) -> bool:
    """Generate image using Gemini Nano Banana"""
    try:
        model_name = GEMINI_PRO if pro else GEMINI_FLASH
        print(f"     Generating with {model_name}...")

        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
                image_config=types.ImageConfig(
                    aspect_ratio="16:9"  # Will adjust per image
                ),
            )
        )

        # Extract image data from response
        image_data = None
        if response and response.candidates:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    if part.inline_data.mime_type.startswith('image/'):
                        image_data = part.inline_data.data
                        break

        if image_data:
            output_path = OUTPUT_DIR / filename
            with open(output_path, "wb") as f:
                f.write(image_data)
            print(f"     ✅ Saved: {filename}")
            return True
        else:
            print(f"     ⚠️  No image returned from API")
            return False

    except Exception as e:
        print(f"     ❌ Error: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Generate Cosmo Club Paris images")
    parser.add_argument("--pro", action="store_true", help="Use Pro model (higher quality)")
    parser.add_argument("--image", type=str, help="Generate specific image by ID")
    args = parser.parse_args()

    print("\n" + "="*70)
    print("🎨 COSMO CLUB PARIS - Premium Image Generation")
    print("="*70)
    print(f"Model: {'Gemini 3 Pro Image Preview' if args.pro else 'Gemini 2.5 Flash Image'}")
    print(f"Output: {OUTPUT_DIR}")
    print("="*70 + "\n")

    images_to_generate = IMAGES
    if args.image:
        images_to_generate = [img for img in IMAGES if img["id"] == args.image]
        if not images_to_generate:
            print(f"❌ Image '{args.image}' not found")
            sys.exit(1)

    generated = 0
    failed = 0

    for i, img in enumerate(images_to_generate, 1):
        print(f"\n[{i}/{len(images_to_generate)}] {img['title']}")
        print(f"     File: {img['filename']}")
        print(f"     Size: {img['size'][0]}x{img['size'][1]} ({img['orientation']})")
        print(f"     Prompt: {img['prompt'][:70]}...")

        if generate_image(img["prompt"], img["filename"], pro=args.pro):
            generated += 1
            time.sleep(1)  # Rate limiting
        else:
            failed += 1

    print("\n" + "="*70)
    print(f"✅ Generated: {generated}/{len(images_to_generate)}")
    if failed > 0:
        print(f"❌ Failed: {failed}")
    print("="*70 + "\n")

    if generated == len(images_to_generate):
        print("🎉 All images generated successfully!")
        print("📝 Next: Update images-config.json with new paths")

if __name__ == "__main__":
    main()
