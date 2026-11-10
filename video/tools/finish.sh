#!/usr/bin/env bash
# raw render -> one clean linear gain toward -16 LUFS (never past -1 dBTP, no limiter) -> final 1080p + 720p copy
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=${1:-out/raw.mp4}
OUT=${2:-out/vitrina-demo.mp4}
STATS=$(ffmpeg -hide_banner -i "$RAW" -af loudnorm=I=-16:TP=-1:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$STATS" | grep "\"$1\"" | sed 's/[^0-9.-]//g'; }
GAIN=$(awk -v i="$(g input_i)" -v tp="$(g input_tp)" 'BEGIN { a = -16 - i; b = -1 - tp; printf "%.2f", (a < b ? a : b) }')
echo "loudness $(g input_i) LUFS, peak $(g input_tp) dBTP, gain ${GAIN} dB"
ffmpeg -y -hide_banner -loglevel error -i "$RAW" -c:v copy -af "volume=${GAIN}dB" -c:a aac -b:a 320k -movflags +faststart "$OUT"
ffmpeg -y -hide_banner -loglevel error -i "$OUT" -vf scale=-2:720 -c:v libx264 -crf 20 -c:a copy -movflags +faststart "${OUT%.mp4}-720p.mp4"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT" | awk '{printf "final duration: %.1fs\n", $1}'
