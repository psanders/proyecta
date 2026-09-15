#!/usr/bin/env bash
# Copyright (C) 2026 by Proyecta. All rights reserved.
#
# Generates a demo rotation of 6 fictional ads (3 images, 3 videos) for local player testing:
# masters are rendered with ffmpeg, then scripts/transcode.sh produces the player renditions
# (WebP for images, VP9 WebM + H.264 MP4 for video) and a manifest.json is written.
# Brands are invented. Output: packages/api/.data/media (gitignored), served by the API at /media.
# Usage: scripts/generate-demo-ads.sh [WIDTHxHEIGHT]   (default 1920x1080)
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
size="${1:-1920x1080}"
w="${size%x*}"
h="${size#*x}"
out="$root/packages/api/.data/media"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
bold="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
regular="/System/Library/Fonts/Supplemental/Arial.ttf"
photos="$root/design/assets"

rm -rf "$out" && mkdir -p "$out"

# Scales every size from a 1920x1080 layout.
s() { echo $(( $1 * h / 1080 )); }

# drawtext chain for brand / headline / subline, read from files to avoid escaping.
# $1 = ad id, $2 = accent color, $3 = extra alpha expression (video fade-in) or "1"
copy_filters() {
  local id="$1" accent="$2" alpha="$3"
  local x; x=$(s 110)
  echo "drawtext=fontfile='$bold':textfile='$work/$id.brand':fontsize=$(s 30):fontcolor=$accent:x=$x:y=h*0.36:alpha='$alpha',\
drawtext=fontfile='$bold':textfile='$work/$id.headline':fontsize=$(s 96):fontcolor=white:x=$x:y=h*0.36+$(s 60):line_spacing=$(s 12):alpha='$alpha',\
drawtext=fontfile='$regular':textfile='$work/$id.subline':fontsize=$(s 38):fontcolor=0xE4E4E7:x=$x:y=h*0.36+$(s 320):alpha='$alpha'"
}

write_copy() {
  printf '%s' "$2" > "$work/$1.brand"
  printf '%s' "$3" > "$work/$1.headline"
  printf '%s' "$4" > "$work/$1.subline"
}

# Left-to-right dark scrim so copy stays legible over photos.
scrim="gradients=s=${w}x${h}:c0=black@0.92:c1=black@0.0:x0=0:y0=0:x1=$(( w * 7 / 10 )):y1=0:nb_colors=2:d=1"

image_ad() { # id photo accent
  local id="$1" photo="$2" accent="$3"
  ffmpeg -y -loglevel error -i "$photos/$photo" -f lavfi -i "$scrim" -filter_complex \
    "[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}[bg];[bg][1:v]overlay,$(copy_filters "$id" "$accent" 1)" \
    -frames:v 1 "$work/$id.png"
}

photo_video_ad() { # id photo accent seconds
  local id="$1" photo="$2" accent="$3" secs="$4" frames=$(( $4 * 30 ))
  local fade="if(lt(t,0.4),0,if(lt(t,1.2),(t-0.4)/0.8,1))"
  ffmpeg -y -loglevel error -loop 1 -i "$photos/$photo" -f lavfi -i "$scrim" -filter_complex \
    "[0:v]scale=$(( w * 2 )):-2,zoompan=z='1+0.12*on/$frames':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$frames:s=${w}x${h}:fps=30[bg];\
[bg][1:v]overlay,$(copy_filters "$id" "$accent" "$fade"),format=yuv420p" \
    -t "$secs" -c:v libx264 -crf 16 -preset veryfast "$work/$id.mov"
}

gradient_video_ad() { # id c0 c1 accent seconds
  local id="$1" c0="$2" c1="$3" accent="$4" secs="$5"
  local fade="if(lt(t,0.4),0,if(lt(t,1.2),(t-0.4)/0.8,1))"
  # Slowly drifting gradient under the same left scrim as the photo ads, plus a progress stripe.
  ffmpeg -y -loglevel error -f lavfi -i "gradients=s=${w}x${h}:c0=$c0:c1=$c1:nb_colors=2:speed=0.004:r=30:d=$secs" \
    -f lavfi -i "$scrim" -filter_complex \
    "[0:v][1:v]overlay,drawbox=x=0:y=ih-$(s 14):w='iw*t/$secs':h=$(s 14):color=$accent:t=fill,$(copy_filters "$id" "$accent" "$fade"),format=yuv420p" \
    -t "$secs" -c:v libx264 -crf 16 -preset veryfast "$work/$id.mov"
}

write_copy cafe-aroma "CAFÉ AROMA" "Tu mañana
empieza aquí." "2x1 en café de 7:00 a 9:00 a.m."
image_ad cafe-aroma web-panel-anunciantes.png 0xF6C453

write_copy cerveceria-caribe "CERVECERÍA DEL CARIBE" "El sabor de la isla,
bien fría." "Solo para mayores de 18 años. Consume con moderación."
gradient_video_ad cerveceria-caribe 0x92400E 0xD97706 0xFDE68A 10

write_copy farmacia-luz "FARMACIA LUZ" "Abierta 24 horas,
todos los días." "Av. Winston Churchill · Santo Domingo"
image_ad farmacia-luz web-panel-valleros.png 0x5EEAD4

write_copy motores-quisqueya "MOTORES QUISQUEYA" "Estrena tu yipeta
este mes." "Financiamiento hasta 72 meses"
photo_video_ad motores-quisqueya web-final-cta.png 0xEC5E2B 10

write_copy banco-brisa "BANCO BRISA" "Tu préstamo, aprobado
en 24 horas." "Solicítalo desde tu celular"
ffmpeg -y -loglevel error -f lavfi -i "gradients=s=${w}x${h}:c0=0x0B3B4F:c1=0x0E7490:x0=0:y0=0:x1=${w}:y1=${h}:nb_colors=2:d=1" \
  -vf "$(copy_filters banco-brisa 0x67E8F9 1)" -frames:v 1 "$work/banco-brisa.png"

write_copy arena-blanca "RESORT ARENA BLANCA" "Escápate este
fin de semana." "Todo incluido desde RD\$ 4,500 por noche"
photo_video_ad arena-blanca web-hero.png 0xFDE68A 15

# Renditions + manifest (order = rotation order).
ads=(
  "cafe-aroma|image|Café Aroma|Tu mañana empieza aquí|10000"
  "cerveceria-caribe|video|Cervecería del Caribe|El sabor de la isla, bien fría|"
  "farmacia-luz|image|Farmacia Luz|Abierta 24 horas|10000"
  "motores-quisqueya|video|Motores Quisqueya|Estrena tu yipeta este mes|"
  "banco-brisa|image|Banco Brisa|Tu préstamo en 24 horas|10000"
  "arena-blanca|video|Resort Arena Blanca|Escápate este fin de semana|"
)

items=()
for ad in "${ads[@]}"; do
  IFS='|' read -r id type advertiser title duration <<< "$ad"
  if [[ "$type" == "image" ]]; then
    "$root/scripts/transcode.sh" "$work/$id.png" "$size" "$out" > /dev/null
    renditions="{\"webp\":\"/media/$id.webp\"}"
  else
    "$root/scripts/transcode.sh" "$work/$id.mov" "$size" "$out" > /dev/null
    secs="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out/$id.mp4")"
    duration="$(awk -v d="$secs" 'BEGIN { printf "%d", d * 1000 }')"
    renditions="{\"webm\":\"/media/$id.webm\",\"mp4\":\"/media/$id.mp4\"}"
  fi
  items+=("{\"id\":\"$id\",\"type\":\"$type\",\"advertiser\":\"$advertiser\",\"title\":\"$title\",\"durationMs\":$duration,\"renditions\":$renditions}")
  echo "  ✓ $id ($type, ${duration}ms)"
done

joined="$(IFS=,; echo "${items[*]}")"
printf '{"version":"demo-%s","name":"Rotación General","screenName":"Pantalla Demo","width":%s,"height":%s,"items":[%s]}\n' \
  "$(date +%Y%m%d%H%M%S)" "$w" "$h" "$joined" > "$out/manifest.json"
echo "wrote $(ls "$out" | wc -l | tr -d ' ') files to $out"
