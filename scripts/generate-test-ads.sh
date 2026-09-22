#!/usr/bin/env bash
# Copyright (C) 2026 by Proyecta. All rights reserved.
#
# Renders "Anúnciate aquí" house ads at every screen resolution Proyecta offers, landscape and
# portrait, for uploading by hand while testing. Each frame names its own resolution, so you can
# tell at a glance which asset a screen is actually playing.
#
# Background is the same hero photo the Meta campaign uses (design/images), with the black
# gradient rising from the bottom to carry the copy — the treatment described in
# ads/visual-direction.md.
# Output: test-ads/ (gitignored). Usage: scripts/generate-test-ads.sh
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
hero="$root/design/images/generated-1789443937982.png"
out="$root/test-ads"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

signal="0xEC5E2B" # --signal from packages/player/src/theme.css

# First font that exists wins: macOS ships Arial, Linux usually only DejaVu or Liberation.
pick_font() {
  for candidate in "$@"; do
    [ -f "$candidate" ] && { echo "$candidate"; return 0; }
  done
  echo "No usable font found; tried: $*" >&2
  return 1
}
bold="$(pick_font \
  "/System/Library/Fonts/Supplemental/Arial Bold.ttf" \
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" \
  "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf")"
regular="$(pick_font \
  "/System/Library/Fonts/Supplemental/Arial.ttf" \
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf" \
  "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf")"

[ -f "$hero" ] || { echo "Hero photo not found: $hero" >&2; exit 1; }

# Landscape presets from RESOLUTION_PRESETS (packages/common/src/utils/resolution.ts); each is
# also rendered rotated, since a screen may be mounted portrait.
sizes=(1280x720 1920x1080 2560x1440 3840x2160)

printf "Anúnciate aquí" > "$work/headline"
printf "proyecta.do" > "$work/brand"

rm -rf "$out" && mkdir -p "$out"

render() { # width height name
  local w="$1" h="$2" name="$3"
  # Scale everything off the frame height, so the layout holds at 720p and at 4K alike.
  local s=$(( h < w ? h : w ))
  local headline=$(( s * 11 / 100 ))
  local label=$(( s * 35 / 1000 ))
  local pad=$(( s * 8 / 100 ))
  printf "%s × %s" "$w" "$h" > "$work/label"

  ffmpeg -y -loglevel error -i "$hero" -f lavfi -i "color=c=black:s=${w}x${h}" -filter_complex "
    [0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}[bg];
    [1:v]format=rgba,geq=r=0:g=0:b=0:a='255*pow(clip((Y/H-0.30)/0.70,0,1),1.4)'[scrim];
    [bg][scrim]overlay=0:0[dim];
    [dim]drawtext=fontfile='${bold}':textfile='${work}/headline':fontsize=${headline}:fontcolor=white:x=${pad}:y=h-${pad}-text_h-$(( label * 5 / 2 ))[t1];
    [t1]drawtext=fontfile='${regular}':textfile='${work}/label':fontsize=${label}:fontcolor=${signal}:x=${pad}:y=h-${pad}-text_h[t2];
    [t2]drawtext=fontfile='${bold}':textfile='${work}/brand':fontsize=${label}:fontcolor=white@0.75:x=w-text_w-${pad}:y=${pad}[out]
  " -map "[out]" -frames:v 1 "$out/$name.png"
  echo "  ✓ $name.png (${w}×${h})"
}

for size in "${sizes[@]}"; do
  w="${size%x*}"
  h="${size#*x}"
  render "$w" "$h" "anunciate-aqui-${w}x${h}"
  render "$h" "$w" "anunciate-aqui-${h}x${w}-vertical"
done

echo "wrote $(find "$out" -name '*.png' | wc -l | tr -d ' ') files to $out"
