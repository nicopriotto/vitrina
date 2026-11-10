# /// script
# dependencies = ["numpy", "scipy"]
# ///
"""Give the narration room to breathe: insert silence between lines (more between sections),
cutting only in the gaps Whisper found between words, and shift take.json to match.
usage: uv run tools/voice/pace.py <voice.mp3> <src take.json> <out.wav> <out take.json>"""
import json, subprocess, sys
import numpy as np
from scipy.io import wavfile

LINE_GAP, SECTION_GAP = 0.35, 0.8
src, take_in, out_wav, take_out = sys.argv[1:5]
SR = 44100
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.int16).astype(np.float32)
take = json.loads(open(take_in).read())
lines, words = take["lines"], take["words"]
sec_first = {s["id"]: s["a"] for s in take["sections"]}
# a cut sits halfway between the previous line's last word and this line's first word
cuts = []
for prev, cur in zip(lines, lines[1:]):
    end = max(w[2] for w in words if w[1] < cur["a"] - 1e-6)
    new_section = any(abs(a - cur["a"]) < 1e-3 for a in sec_first.values())
    cuts.append(((end + cur["a"]) / 2, SECTION_GAP if new_section else LINE_GAP))
def shift(tm):
    return tm + sum(g for c, g in cuts if c <= tm)
parts, last = [], 0
fade = int(0.01 * SR)
for c, g in cuts:
    i = int(c * SR)
    parts += [x[last:i], np.zeros(int(g * SR), np.float32)]
    last = i
parts.append(x[last:])
y = np.concatenate(parts)
wavfile.write(out_wav, SR, y.astype(np.int16))
take["words"] = [[w, round(shift(a), 3), round(shift(b), 3)] for w, a, b in words]
take["lines"] = [{**l, "a": round(shift(l["a"]), 3), "b": round(shift(l["b"]), 3)} for l in lines]
take["sections"] = [{**s, "a": round(shift(s["a"]), 3), "b": round(shift(s["b"]), 3)} for s in take["sections"]]
take["duration"] = round(len(y) / SR, 3)
open(take_out, "w").write(json.dumps(take))
print(f"{len(cuts)} pauses, {take['duration']:.1f}s")
