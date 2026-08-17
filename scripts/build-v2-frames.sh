#!/usr/bin/env bash
# Build the v2 "diet" frame sets from an existing full-resolution sequence.
#
# The full sequence (179 frames @1600px JPEG ≈ 24MB) is far more than the eye can
# resolve while scrubbing — roughly one frame per 50-60px of scroll is enough.
# So we subsample to two tiers and encode AVIF (with JPEG fallback for older
# browsers), which lands the mobile tier around 700KB instead of 24MB.
#
# Usage: ./scripts/build-v2-frames.sh [source_dir] [out_root]
set -euo pipefail

SRC="${1:-frames/launch}"
OUT="${2:-v2/frames}"
SRC_COUNT=$(ls "$SRC"/frame_*.jpg | wc -l | tr -d ' ')

# tier: name, frame count, width, avif crf, jpeg q
build_tier() {
  local name="$1" count="$2" width="$3" crf="$4" jq="$5"
  local dir="$OUT/$name"
  rm -rf "$dir"; mkdir -p "$dir"
  echo "→ $name: $count frames @${width}px (from $SRC_COUNT source frames)"
  for i in $(seq 0 $((count - 1))); do
    # evenly sample across the source sequence, 1-indexed
    local src_idx=$(( (i * (SRC_COUNT - 1) / (count - 1)) + 1 ))
    local src_file
    src_file=$(printf "%s/frame_%04d.jpg" "$SRC" "$src_idx")
    local out_base
    out_base=$(printf "%s/f_%03d" "$dir" "$i")
    ffmpeg -y -v error -i "$src_file" -vf "scale=${width}:-2" \
      -c:v libsvtav1 -crf "$crf" -frames:v 1 "${out_base}.avif"
    ffmpeg -y -v error -i "$src_file" -vf "scale=${width}:-2" \
      -q:v "$jq" "${out_base}.jpg"
  done
  echo "   avif: $(du -sh "$dir"/*.avif | awk '{s+=$1} END {print NR" files"}') / $(cat "$dir"/*.avif | wc -c | awk '{printf "%.0f KB", $1/1024}')"
  echo "   jpeg: $(cat "$dir"/*.jpg | wc -c | awk '{printf "%.0f KB", $1/1024}')"
}

mkdir -p "$OUT"
build_tier m 45 720  40 6
build_tier d 90 1440 38 5

# Poster: first frame at higher quality — this is the LCP image, so it gets its
# own budget. Everything else can be lazy.
mkdir -p "$OUT/../assets"
ffmpeg -y -v error -i "$SRC/frame_0001.jpg" -vf "scale=1080:-2" \
  -c:v libsvtav1 -crf 32 -frames:v 1 "$OUT/../assets/poster.avif"
ffmpeg -y -v error -i "$SRC/frame_0001.jpg" -vf "scale=1080:-2" \
  -q:v 4 "$OUT/../assets/poster.jpg"
echo "→ poster: $(ls -l "$OUT/../assets/poster.avif" | awk '{printf "%.0f KB avif", $5/1024}') / $(ls -l "$OUT/../assets/poster.jpg" | awk '{printf "%.0f KB jpg", $5/1024}')"
