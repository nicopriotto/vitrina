# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy"]
# ///
"""A quiet, original music bed synthesized from scratch (no samples, no licensing).

Structure follows the voice (src/data/take.json): sparse pulse and pads until the climax line
("A minute later, Lumen is an MCP server"), then a lift with kick, bass and brighter chords, and a soft ending.
Writes public/audio/music.wav. Tempo 100 BPM, key of D minor -> F major colour.
"""
import json
from pathlib import Path

import numpy as np
from scipy.signal import butter, lfilter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
take = json.loads((ROOT / "src/data/take.json").read_text())
DUR = take["duration"] + 1.0
SR = 44100
BPM = 100
BEAT = 60 / BPM
BAR = 4 * BEAT
n = int(DUR * SR)
t = np.arange(n) / SR

lines = {l["id"]: l for l in take["lines"]}
# the lift lands on the first beat at/just before the climax line
climax = lines["C1"]["a"]
LIFT = climax - 0.05
END = lines["X1"]["a"]


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def lp(x, cut, order=2):
    b, a = butter(order, cut / (SR / 2), "low")
    return lfilter(b, a, x)


def hp(x, cut, order=2):
    b, a = butter(order, cut / (SR / 2), "high")
    return lfilter(b, a, x)


def env_adsr(length, a, d, s, r):
    L = int(round(length * SR))
    e = np.ones(L) * s
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    e[:A] = np.linspace(0, 1, A) if A else e[:A]
    e[A:A + D] = np.linspace(1, s, len(e[A:A + D]))
    if R:
        e[-R:] *= np.linspace(1, 0, len(e[-R:]))
    return e


def saw(f, L, detune=0.0):
    tt = np.arange(L) / SR
    out = np.zeros(L)
    for d in (-detune, 0, detune):
        ph = (tt * f * (1 + d)) % 1.0
        out += 2 * ph - 1
    return out / 3


def place(buf, sig, at):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


# chords (MIDI), 2 bars each: Dm9 - Bbmaj7 - F/A - C(add9)
CHORDS = [[50, 57, 60, 64, 65], [46, 53, 57, 62, 65], [45, 53, 57, 60, 64], [48, 55, 60, 62, 67]]
BASS = [38, 34, 33, 36]

pads = np.zeros(n)
pluck = np.zeros(n)
bass = np.zeros(n)
kick = np.zeros(n)
hat = np.zeros(n)

bar_i = 0
pos = 0.0
while pos < DUR:
    ch = CHORDS[(bar_i // 2) % 4]
    lifted = pos >= LIFT
    # pad: one per 2 bars
    if bar_i % 2 == 0:
        L = int(2 * BAR * SR) + int(0.8 * SR)
        sig = sum(saw(hz(m + (12 if lifted and k >= 3 else 0)), L, 0.004) for k, m in enumerate(ch)) / len(ch)
        sig = lp(sig, 1400 if lifted else 900) * env_adsr(L / SR, 1.2, 0.5, 0.85, 1.2)
        place(pads, sig, pos)
    # plucks: 8th notes arpeggio
    for k in range(8):
        at = pos + k * BEAT / 2
        if at >= DUR:
            break
        if not lifted and k % 2 == 1:
            continue
        m = ch[[0, 2, 3, 4, 3, 2, 1, 2][k]] + 12
        L = int(0.45 * SR)
        tt = np.arange(L) / SR
        s = (np.sin(2 * np.pi * hz(m) * tt) + 0.35 * np.sin(2 * np.pi * hz(m) * 2 * tt)) * np.exp(-tt * 9)
        place(pluck, s * (0.9 if k == 0 else 0.6), at)
    if lifted:
        # kick on every beat, bass on 8ths, hats on offbeats
        for k in range(4):
            at = pos + k * BEAT
            L = int(0.35 * SR)
            tt = np.arange(L) / SR
            f = 50 + 90 * np.exp(-tt * 30)
            ph = 2 * np.pi * np.cumsum(f) / SR
            place(kick, np.sin(ph) * np.exp(-tt * 9), at)
            Lh = int(0.06 * SR)
            place(hat, np.random.default_rng(k + bar_i).standard_normal(Lh) * np.exp(-np.arange(Lh) / SR * 70), at + BEAT / 2)
        b = BASS[(bar_i // 2) % 4]
        for k in range(8):
            at = pos + k * BEAT / 2
            L = int(BEAT / 2 * SR * 0.9)
            tt = np.arange(L) / SR
            s = lp(saw(hz(b), L), 400) * np.exp(-tt * 4)
            place(bass, s, at)
    pos += BAR
    bar_i += 1

hat = hp(hat, 7000)
# riser into the lift (filtered noise swell) + a soft impact on the lift
rise_len = 2 * BAR
L = int(rise_len * SR)
# (no noise riser: it read as static under the voice)
Li = int(1.8 * SR)
ti = np.arange(Li) / SR
impact = (np.sin(2 * np.pi * 45 * ti) * np.exp(-ti * 3) + lp(np.random.default_rng(3).standard_normal(Li), 800) * np.exp(-ti * 5) * 0.4)
place(kick, impact * 0.45, LIFT)

mix = 0.55 * pads + 0.30 * pluck + 0.28 * bass + 0.32 * kick

# master envelope: fade in, slight lift after the climax, fade out under the last line
g = np.clip(t / 2.0, 0, 1) * np.where(t < LIFT, 0.75, 0.6)
g *= np.clip((DUR - t) / 3.5, 0, 1)
mix *= g
# simple stereo: plucks panned, pads wide via short delay
d = int(0.012 * SR)
left = mix + 0.12 * np.roll(pluck * g, d)
right = mix + 0.12 * np.roll(pads * g, d)
st = np.stack([left, right], 1)
st /= np.max(np.abs(st)) + 1e-9
st *= 0.89

from scipy.io import wavfile

out = ROOT / "public/audio/music.wav"
wavfile.write(out, SR, (st * 32767).astype(np.int16))
print("wrote", out, f"{DUR:.1f}s, lift at {LIFT:.2f}s")
