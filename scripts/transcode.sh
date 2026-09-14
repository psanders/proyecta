#!/usr/bin/env bash
# Copyright (C) 2026 by Proyecta. All rights reserved.
#
# Produces player renditions for one source asset, sized for a target screen:
#   video -> <name>.webm (VP9) + <name>.mp4 (H.264), no audio, 30 fps, capped at 1080p
#   image -> <name>.webp
# Usage: scripts/transcode.sh <input> <WIDTHxHEIGHT> <outdir>
set -euo pipefail

input="${1:?input file required}"
size="${2:?target size like 1920x1080 required}"
outdir="${3:?output directory required}"
w="${size%x*}"
h="${size#*x}"
# Cap at 1080p on the long side, keep orientation.
if (( w >= h && w > 1920 )); then h=$(( h * 1920 / w )); w=1920; fi
if (( h > w && h > 1920 )); then w=$(( w * 1920 / h )); h=1920; fi
name="$(basename "${input%.*}")"
fit="scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0x0E0E10"
mkdir -p "$outdir"

case "$(printf '%s' "${input##*.}" | tr '[:upper:]' '[:lower:]')" in
  jpg|jpeg|png|webp)
    ffmpeg -y -loglevel error -i "$input" -vf "$fit" -c:v libwebp -quality 90 "$outdir/$name.webp"
    ;;
  *)
    ffmpeg -y -loglevel error -i "$input" -an -vf "$fit,fps=30" \
      -c:v libvpx-vp9 -b:v 0 -crf 32 -row-mt 1 "$outdir/$name.webm"
    ffmpeg -y -loglevel error -i "$input" -an -vf "$fit,fps=30" \
      -c:v libx264 -profile:v high -crf 21 -pix_fmt yuv420p -movflags +faststart "$outdir/$name.mp4"
    ;;
esac
echo "wrote renditions for $name to $outdir"
