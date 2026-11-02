#!/usr/bin/env bash
# Régénère la plaquette PDF jointe à l'accusé de réception des demandes
# de devis (voir app/api/devis/route.ts).
#
#   bash scripts/plaquette/build.sh
#
# Source : scripts/plaquette/plaquette.html (+ assets/). Sortie :
# public/book/cosmo-club-book.pdf, servie sur
# https://www.cosmoclub.fr/book/cosmo-club-book.pdf une fois
# déployée. Garder le PDF sous ~8 Mo pour qu'il passe en pièce jointe.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/scripts/plaquette/plaquette.html"
OUT="$ROOT/public/book/cosmo-club-book.pdf"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

mkdir -p "$(dirname "$OUT")"
"$CHROME" \
  --headless=new \
  --disable-gpu \
  --no-pdf-header-footer \
  --virtual-time-budget=20000 \
  --print-to-pdf="$OUT" \
  "file://$SRC" 2>/dev/null

echo "→ $OUT ($(du -h "$OUT" | cut -f1))"
