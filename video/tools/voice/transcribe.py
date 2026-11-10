# /// script
# requires-python = ">=3.10"
# dependencies = ["faster-whisper"]
# ///
"""Whisper word timings for public/audio/voice.mp3 -> src/data/take.json, aligned to the script sections."""
import difflib
import subprocess
import json
import re
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

HERE = Path(__file__).parent
lines = json.loads((HERE / "voice-lines.json").read_text())
import os
audio = HERE.parent.parent / "public/audio" / os.environ.get("VOICE_FILE", "voice.mp3")
out = HERE.parent.parent / "src/data/take.json"

norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())

model = WhisperModel("small.en", compute_type="int8")
# decode with ffmpeg ourselves (avoids PyAV version issues)
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(audio), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
pcm = np.frombuffer(raw, dtype=np.float32)
segments, info = model.transcribe(pcm, word_timestamps=True, language="en")
info_duration = len(pcm) / 16000
heard = [(w.word.strip(), w.start, w.end) for s in segments for w in s.words if norm(w.word)]

# script words, tagged with their section
script = []
line_of = []
for l in lines:
    for w in l["text"].split():
        if norm(w):
            script.append((w, l["section"]))
            line_of.append(l["id"])

a = [norm(w) for w, _ in script]
b = [norm(w) for w, _, _ in heard]
match = {}
for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
    for k in range(blk.size):
        match[blk.a + k] = blk.b + k

# Subtitle words = the script's own words (spelling, brand names) with Whisper's real timings.
# Script words Whisper missed get their time interpolated between the neighbours that matched.
n = len(script)
times = [None] * n
for i in range(n):
    if i in match:
        j = match[i]
        times[i] = (heard[j][1], heard[j][2])
known = [i for i in range(n) if times[i] is not None]
for i in range(n):
    if times[i] is None:
        prev = max((k for k in known if k < i), default=None)
        nxt = min((k for k in known if k > i), default=None)
        if prev is None and nxt is None:
            times[i] = (0.0, 0.2)
        elif prev is None:
            times[i] = (max(0.0, times[nxt][0] - 0.3 * (nxt - i)), times[nxt][0])
        elif nxt is None:
            times[i] = (times[prev][1] + 0.3 * (i - prev - 1), times[prev][1] + 0.3 * (i - prev))
        else:
            span = (times[nxt][0] - times[prev][1]) / (nxt - prev)
            times[i] = (times[prev][1] + span * (i - prev - 1), times[prev][1] + span * (i - prev))

sections = {}
order = []
for i, (_, sec) in enumerate(script):
    s = sections.setdefault(sec, [times[i][0], times[i][1]])
    if sec not in order:
        order.append(sec)
    s[0] = min(s[0], times[i][0])
    s[1] = max(s[1], times[i][1])

data = {
    "estimated": False,
    "duration": round(info_duration, 2),
    "words": [[w, round(times[i][0], 3), round(times[i][1], 3)] for i, (w, _) in enumerate(script)],
    "sections": [{"id": sec, "a": round(sections[sec][0], 3), "b": round(sections[sec][1], 3), "pause": 0.9} for sec in order],
}
spans = {}
for i, lid in enumerate(line_of):
    a, b = spans.setdefault(lid, [times[i][0], times[i][1]])
    spans[lid] = [min(a, times[i][0]), max(b, times[i][1])]
data["lines"] = [{"id": l["id"], "a": round(spans[l["id"]][0], 3), "b": round(spans[l["id"]][1], 3)} for l in lines]
out.write_text(json.dumps(data, indent=1))
print(f"take.json: {data['duration']}s, {len(script)} words ({len(match)} matched), {len(order)} sections")
