# Frame-level motion audit: per-frame difference; flags frozen frames and isolated one-frame spikes (pops/flashes).
import sys, subprocess, numpy as np
f = sys.argv[1]; w, h = 135, 240
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', f'scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2)); lum = fr.mean(axis=(1, 2))
med = np.median(d); print('frames', len(fr), 'median diff', round(float(med), 2))
frozen = [i + 1 for i in range(len(d)) if d[i] < 0.05]
spikes = [i + 1 for i in range(1, len(d) - 1) if d[i] > 6 * max(med, 0.3) and d[i] > 3 * d[i - 1] and d[i] > 3 * d[i + 1]]
flash = [i for i in range(1, len(lum)) if lum[i] - lum[i - 1] > 25]
runs = []; s = None
for i in frozen + [10**9]:
    if s is None: s = p = i
    elif i == p + 1: p = i
    else: runs.append((s, p)); s = p = i
long_frozen = [(a / 30, b / 30) for a, b in runs if b - a >= 12 and a < 10**8]
print('still > 0.4s:', [(round(a, 2), round(b, 2)) for a, b in long_frozen])
print('one-frame spikes (t):', [round(i / 30, 2) for i in spikes])
print('flash frames (t):', [round(i / 30, 2) for i in flash])
