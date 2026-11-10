# /// script
# dependencies = ["numpy", "scipy"]
# ///
"""Undo the slow tonal drift of a long single take: every section is EQ'd (and leveled) to match the
opening sections' long-term spectrum. The gain curve glides between section centres, so nothing jumps.
usage: uv run tools/voice/dedrift.py <in audio> <take.json> <out.wav>"""
import json, subprocess, sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import stft, istft

src, take_p, out = sys.argv[1:4]
SR, N = 44100, 2048
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).astype(np.float64)
take = json.loads(open(take_p).read())
secs = take["sections"]
f, tt, Z = stft(x, SR, nperseg=N, noverlap=N * 3 // 4)
P = np.abs(Z) ** 2
energy = P.sum(0)

def psd(a, b):
    m = (tt >= a) & (tt <= b)
    m &= energy > np.percentile(energy[m], 40)  # speech frames only
    return P[:, m].mean(1) + 1e-14

def smooth(v):  # ~1/3 octave smoothing on a log axis
    out = np.empty_like(v)
    for i, fi in enumerate(f):
        lo, hi = fi / 2 ** (1 / 6), fi * 2 ** (1 / 6)
        m = (f >= lo) & (f <= hi)
        out[i] = v[m].mean() if m.any() else v[i]
    return out

ref_ids = {"hook", "sam", "problem"}
ref = smooth(np.mean([psd(s["a"], s["b"]) for s in secs if s["id"] in ref_ids], 0))
band = (f > 80) & (f < 12000)
centres, curves = [], []
for s in secs:
    p = smooth(psd(s["a"], s["b"]))
    g = 10 * np.log10(ref / p)
    g = np.clip(g, -10, 2)
    g[f > 7000] = np.minimum(g[f > 7000], 0)  # only cut in the highs: the drift is added hiss, never missing air
    g[~band] = np.interp(f[~band], f[band], g[band])
    centres.append((s["a"] + s["b"]) / 2)
    curves.append(g)
    print(f"{s["id"]:8} 9k {g[np.searchsorted(f, 9000)]:+.1f} 11k {g[np.searchsorted(f, 11000)]:+.1f}  3k {g[np.searchsorted(f, 3000)]:+.1f} dB  6k {g[np.searchsorted(f, 6000)]:+.1f} dB  300 {g[np.searchsorted(f, 300)]:+.1f} dB")
curves = np.array(curves)
G = np.empty_like(P)
for k in range(len(f)):
    G[k] = np.interp(tt, centres, curves[:, k])
_, y = istft(Z * 10 ** (G / 20), SR, nperseg=N, noverlap=N * 3 // 4)
y = y[: len(x)]
y *= 0.89 / max(np.abs(y).max(), 1e-9)
wavfile.write(out, SR, (y * 32767).astype(np.int16))
print("wrote", out)
