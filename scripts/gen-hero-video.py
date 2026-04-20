#!/usr/bin/env python3
"""
Generate a hero video via Google Veo for the Cosmo Club homepage.

Usage:
    python3 scripts/gen-hero-video.py                    # veo-3.0-fast, 5s (default)
    python3 scripts/gen-hero-video.py --model veo-3.0    # quality
    python3 scripts/gen-hero-video.py --model veo-2.0    # cheapest
    python3 scripts/gen-hero-video.py --seconds 8
"""
from __future__ import annotations

import argparse
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


MODELS = {
    "veo-2.0": "veo-2.0-generate-001",
    "veo-3.0": "veo-3.0-generate-001",
    "veo-3.0-fast": "veo-3.0-fast-generate-001",
    "veo-3.1": "veo-3.1-generate-preview",
    "veo-3.1-fast": "veo-3.1-fast-generate-preview",
    "veo-3.1-lite": "veo-3.1-lite-generate-preview",
}

HERO_HOME_PROMPT = (
    "Cinematic slow-motion editorial scene at golden hour in a Parisian event cocktail "
    "bar. Three crystal coupe glasses filled with deep garnet red cocktails, tiny gold "
    "leaf flakes gently shimmering on the surface, sit on a pale cream marble bar top. "
    "A small vase with dried wheat stems. Ivory linen curtain in the background, softly "
    "moving as if a gentle breeze passes. Warm golden daylight streams through, creating "
    "soft amber bokeh. Camera movement: a slow subtle push-in (dolly forward), barely "
    "perceptible, just 2-3% zoom over the clip. Shallow depth of field. Pale biscuit "
    "cream and garnet tones. Airy and luxurious, Ruinart meets Aesop store aesthetic. "
    "Subtle film grain. No people, no text, no logos."
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="veo-3.0-fast", choices=list(MODELS))
    parser.add_argument("--seconds", type=int, default=5)
    parser.add_argument("--out", default="public/brand/ai/hero-home.mp4")
    parser.add_argument("--prompt", default=HERO_HOME_PROMPT)
    args = parser.parse_args()

    out_path = Path(__file__).resolve().parent.parent / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    model_id = MODELS[args.model]
    print(f"→ Model: {model_id}")
    print(f"→ Duration: {args.seconds}s")
    print(f"→ Output: {out_path}")
    print()

    t0 = time.time()
    print("⏳ Submitting Veo generation…")
    op = client.models.generate_videos(
        model=model_id,
        prompt=args.prompt,
        config=types.GenerateVideosConfig(
            aspect_ratio="16:9",
            duration_seconds=args.seconds,
            number_of_videos=1,
        ),
    )

    # Poll until done
    poll_n = 0
    while not op.done:
        poll_n += 1
        elapsed = time.time() - t0
        print(f"   polling… ({poll_n}, {elapsed:.0f}s elapsed)")
        time.sleep(10)
        op = client.operations.get(op)

    elapsed = time.time() - t0
    print(f"✓ Generation done in {elapsed:.1f}s")

    # Save
    response = op.response
    videos = getattr(response, "generated_videos", None) or []
    if not videos:
        print(f"✗ No video returned. Response: {response}", file=sys.stderr)
        sys.exit(1)

    for i, gen in enumerate(videos):
        video = gen.video
        path = out_path if i == 0 else out_path.with_stem(f"{out_path.stem}-{i}")
        client.files.download(file=video)
        video.save(str(path))
        size_mb = os.path.getsize(path) / (1024 * 1024)
        print(f"✓ Saved {path.name} ({size_mb:.2f} MB)")

    print("\nDone.")


if __name__ == "__main__":
    main()
