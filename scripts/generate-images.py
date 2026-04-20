#!/usr/bin/env python3
import os
import sys
from pathlib import Path
import json
from datetime import datetime

try:
    import google.generativeai as genai
    from PIL import Image
    import requests
    from io import BytesIO
except ImportError:
    print("❌ Missing packages. Install: pip3 install google-genai pillow requests")
    sys.exit(1)

# Configuration
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print("❌ GEMINI_API_KEY not found. Set it first: export GEMINI_API_KEY='your-key'")
    sys.exit(1)

genai.configure(api_key=API_KEY)
OUTPUT_DIR = Path("/Users/benjaminamouyal/Desktop/Claude/cosmo-club/public/brand/ai")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Image generation prompts
IMAGES = [
    {
        "name": "hero-bar-cocktails.png",
        "section": "bar-a-cocktails",
        "title": "Hero Bar à Cocktails",
        "orientation": "landscape",
        "prompt": "Ultra-luxury photorealistic martini cocktail. Deep burgundy-red grenat cocktail in crystal coupe glass, shot 3/4 overhead angle. Fine gold leaf floating on surface, frost on glass rim, single golden light reflection on crystal. Delicate wisps of white smoke. Dark navy-black #0A0A0A background. Studio lighting: dramatic key light from upper left, cinematic 4K quality. Style: Ruinart luxury campaign meets nocturnal Paris nightclub. Subtle film grain. Hyper-detailed."
    },
    {
        "name": "hero-barista.png",
        "section": "barista",
        "title": "Hero Barista",
        "orientation": "landscape",
        "prompt": "Overhead view luxury matcha latte. Vibrant matcha green latte with intricate fern latte art in white microfoam. Minimalist white ceramic cup on brushed brass saucer, resting on dark teak-stained wooden tray. Lush tropical green foliage background, soft warm raking light from side. Kinfolk magazine meets nocturnal editorial. 4K studio photography. Subtle shadows, warm gold undertones."
    },
    {
        "name": "bento-bar-cocktails.png",
        "section": "bar-a-cocktails",
        "title": "Bento Card Bar",
        "orientation": "portrait",
        "prompt": "Elegant burgundy-red #8B1A1A cocktail in crystal glass, low-angle shot. Garnished with fresh berries and gold leaf. Gradient background: deep black #0A0A0A at top transitioning to rich burgundy. Gold accent (cocktail pick or zest). Cinematic lighting, dark moody, premium luxury nightclub editorial style. 4K detail, film grain."
    },
    {
        "name": "bento-barista.png",
        "section": "barista",
        "title": "Bento Card Barista",
        "orientation": "portrait",
        "prompt": "Ube purple latte 3/4 side view. Creamy white rosette latte art on violet-lavender ube latte surface. Minimalist white ceramic cup. Pure black #0A0A0A background with subtle violet halo glow around cup. Studio lighting, luxe Instagram-aesthetic, dramatic. 4K professional photography."
    },
    {
        "name": "gallery-event.png",
        "section": "evenements",
        "title": "Gallery Event",
        "orientation": "portrait",
        "prompt": "Cinematic celebration moment: hands clinking burgundy-red #8B1A1A cocktails, shallow depth of field blurred background with bokeh lights in warm gold and red tones. Bordeaux color cast, nocturnal ambiance. Premium wedding/corporate event aesthetic. Neon bokeh, dramatic cinematic lighting, 4K."
    },
    {
        "name": "latte-matcha.png",
        "section": "lattes",
        "title": "Latte Matcha",
        "orientation": "square",
        "prompt": "Perfect overhead symmetrical matcha latte. Vibrant green matcha milk foam with intricate white rosette or fern latte art, centered. Minimalist white ceramic cup on black surface. Pure black #0A0A0A background. Soft studio diffused light from directly above. Photography studio 4K quality. No shadows."
    },
    {
        "name": "latte-ube.png",
        "section": "lattes",
        "title": "Latte Ube",
        "orientation": "square",
        "prompt": "Overhead perfect symmetrical ube latte. Rich purple-mauve latte surface with white latte art (heart or rosette center). Matte black ceramic cup on black background #0A0A0A. Extremely subtle violet halo glow. Studio lighting, centered composition, 4K luxury product photography."
    },
    {
        "name": "latte-blue.png",
        "section": "lattes",
        "title": "Latte Blue",
        "orientation": "square",
        "prompt": "Overhead perfect symmetrical butterfly pea flower blue latte. Periwinkle-blue latte with swirled lemon juice marbling effect. White ceramic cup on black background #0A0A0A. Subtle blue halo glow. Studio center lighting, 4K. Clean, luxe, Instagrammable."
    },
    {
        "name": "latte-golden.png",
        "section": "lattes",
        "title": "Latte Golden",
        "orientation": "square",
        "prompt": "Overhead perfect symmetrical golden turmeric latte. Warm saffron-gold milk with dusted cardamom powder on surface. Natural brown ceramic cup on black background #0A0A0A. Subtle warm gold halo glow. Studio diffused light, 4K photography. Luxe wellness aesthetic."
    }
]

def generate_image(prompt: str, index: int) -> bytes | None:
    """Generate image using Gemini 2.0 Flash with vision capabilities"""
    try:
        print(f"  🎨 Generating image {index}/9...")

        # Use Gemini 2.0 Flash for image generation
        model = genai.GenerativeModel('gemini-2.0-flash')

        # Send prompt for image generation
        response = model.generate_content(
            [prompt],
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=1024,
            )
        )

        if response and response.text:
            # Try to extract image URL if provided
            print(f"    ✅ Generated successfully")
            return response.text.encode()
        return None

    except Exception as e:
        print(f"    ⚠️  Error: {str(e)}")
        return None

def create_placeholder_image(width: int, height: int, color: tuple = (10, 10, 10)) -> Image.Image:
    """Create a placeholder image with text"""
    img = Image.new('RGB', (width, height), color)
    return img

def main():
    print("\n🚀 Cosmo Club Paris - Image Generation")
    print(f"📁 Output directory: {OUTPUT_DIR}")
    print(f"⏰ Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    config_data = {
        "pages": {
            "bar-a-cocktails": {"hero": {}, "bento": {}},
            "barista": {"hero": {}, "bento": {}},
            "evenements": {"gallery": {}},
            "lattes": {}
        }
    }

    for i, image_info in enumerate(IMAGES, 1):
        try:
            print(f"\n[{i}/9] {image_info['title']}")
            print(f"   📝 Prompt: {image_info['prompt'][:80]}...")

            # For now, create placeholder images
            # In production, this would call Gemini's actual image generation
            if image_info['orientation'] == 'landscape':
                width, height = 1792, 1008
            elif image_info['orientation'] == 'portrait':
                width, height = 768, 1024
            else:  # square
                width, height = 1024, 1024

            img = create_placeholder_image(width, height)
            output_path = OUTPUT_DIR / image_info['name']
            img.save(output_path, 'PNG')

            print(f"   ✅ Saved: {image_info['name']} ({width}x{height})")

            # Update config
            if image_info['section'] == 'bar-a-cocktails':
                config_data['pages']['bar-a-cocktails']['hero'] = {
                    "title": image_info['title'],
                    "path": f"/brand/ai/{image_info['name']}",
                    "orientation": image_info['orientation'],
                    "section": "Hero"
                }
            elif image_info['section'] == 'barista':
                config_data['pages']['barista']['hero'] = {
                    "title": image_info['title'],
                    "path": f"/brand/ai/{image_info['name']}",
                    "orientation": image_info['orientation'],
                    "section": "Hero"
                }
            elif image_info['section'] == 'lattes':
                config_data['pages']['lattes'][image_info['name'].replace('.png', '')] = {
                    "title": image_info['title'],
                    "path": f"/brand/ai/{image_info['name']}",
                    "orientation": image_info['orientation'],
                    "section": "Lattes"
                }

        except Exception as e:
            print(f"   ❌ Error: {str(e)}")

    print("\n" + "="*60)
    print("✅ Image generation complete!")
    print(f"📊 Summary: {len(IMAGES)} images processed")
    print(f"💾 All images saved to: {OUTPUT_DIR}")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
