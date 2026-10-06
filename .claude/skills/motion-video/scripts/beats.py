#!/usr/bin/env python3
"""Detect tempo and beat times so every state change lands on the beat.

    python3 beats.py song.mp3 beats.json [--bpm-hint 120]
    python3 beats.py --grid --bpm 120 --duration 14 beats.json   # no song

Output: {"bpm": float, "offset": float, "beats": [t...], "bars": [t...]}
Needs numpy, scipy and ffmpeg on PATH.
"""
import argparse
import json
import subprocess
import sys

import numpy as np
from scipy.signal import find_peaks, stft

SR = 22050


def decode(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32)


HOP, WIN = 512, 2048
# Onsets register in the flux before the window centre reaches them; calibrated on a click track.
ONSET_LAG = 0.054


def onset_envelope(y, hop=HOP):
    _, _, Z = stft(y, fs=SR, nperseg=WIN, noverlap=WIN - hop, boundary=None, padded=False)
    mag = np.log1p(100 * np.abs(Z))
    d = np.maximum(0, np.diff(mag, axis=1))
    low_bins = int(200 / (SR / WIN))  # kick / bass band, used to pick on-beat vs off-beat

    def norm(x):
        x = x - x.mean()
        return np.maximum(x / (x.std() + 1e-9), 0)

    return norm(d.sum(axis=0)), norm(d[:low_bins].sum(axis=0)), SR / hop


def estimate_tempo(env, fps, hint):
    ac = np.correlate(env, env, mode="full")[len(env) - 1:]
    bpms = np.arange(70.0, 180.0, 0.25)
    lags = 60.0 * fps / bpms
    score = np.interp(lags, np.arange(len(ac)), ac)
    # Log-normal prior around the hint keeps us out of half/double-time traps.
    score *= np.exp(-0.5 * (np.log2(bpms / hint) / 0.6) ** 2)
    return float(bpms[np.argmax(score)])


def grid_score(env, period, off):
    idx = np.arange(off, len(env) - 1, period)
    return np.interp(idx, np.arange(len(env)), env).sum()


def refine(env, low, fps, bpm):
    """Jointly fit tempo and phase so the beat grid stays on the hits for the whole song."""
    best = (-1.0, bpm, 0.0)
    for b in np.arange(bpm - 2, bpm + 2, 0.02):
        period = 60.0 * fps / b
        for off in np.arange(0, period, 0.25):
            sc = grid_score(env, period, off)
            if sc > best[0]:
                best = (sc, b, off)
    _, b, off = best
    # Hi-hats on the off-beat can out-score the kick in broadband flux; the
    # downbeat is whichever half-period phase carries more low-end energy.
    period = 60.0 * fps / b
    if grid_score(low, period, (off + period / 2) % period) > grid_score(low, period, off):
        off = (off + period / 2) % period
    # Flux at diff index i measures the change into STFT frame i+1, whose window
    # starts at (i+1)*HOP; an onset shows up once it enters the window's front half.
    t0 = (off + 1) / fps + ONSET_LAG
    period_s = 60.0 / b
    return float(b), float(t0 % period_s)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("inputs", nargs="+", help="song.mp3 beats.json, or just beats.json with --grid")
    p.add_argument("--grid", action="store_true")
    p.add_argument("--bpm", type=float, default=120.0)
    p.add_argument("--bpm-hint", type=float, default=120.0)
    p.add_argument("--duration", type=float, default=14.0)
    a = p.parse_args()

    if a.grid:
        out_path = a.inputs[-1]
        bpm, offset, duration = a.bpm, 0.0, a.duration
    else:
        if len(a.inputs) != 2:
            sys.exit("usage: beats.py song.mp3 beats.json")
        song, out_path = a.inputs
        y = decode(song)
        duration = len(y) / SR
        env, low, fps = onset_envelope(y)
        # Tempo from kick/bass-weighted flux: dense hi-hats alone suggest 4/3 or 2x tempos.
        bpm, offset = refine(env, low, fps, estimate_tempo(env + 2 * low, fps, a.bpm_hint))

    period = 60.0 / bpm
    beats = [round(t, 4) for t in np.arange(offset, duration, period)]
    result = {
        "bpm": round(bpm, 2),
        "period": round(period, 4),
        "offset": round(offset, 4),
        "duration": round(duration, 3),
        "beats": beats,
        "bars": beats[::4],
    }
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"bpm={result['bpm']} offset={result['offset']}s beats={len(beats)} -> {out_path}")


if __name__ == "__main__":
    main()
