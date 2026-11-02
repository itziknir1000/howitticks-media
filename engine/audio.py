# Netflix v3 sound: original music locked to the beats + frame-locked SFX + voice; digital silence before slam and signature.
import json, sys, wave, numpy as np
from scipy.signal import lfilter
import en_audio as A
SR = A.SR; out = sys.argv[1]; name = sys.argv[2]
ev = json.load(open(f'{out}/events.json')); j = json.load(open(f'{out}/timing.resolved.json')); total = j['end']
B = json.load(open(f'{out}/beats.json'))
def ping():
    n = int(0.35 * SR); t = A.t_(n); return (np.sin(2 * np.pi * 1760 * t) + 0.4 * np.sin(2 * np.pi * 2640 * t)) * np.exp(-t * 14) * 0.16
def click():
    n = int(0.05 * SR); t = A.t_(n); return (A.hp(A.rng.standard_normal(n), 0.5) * np.exp(-t * 160) * 0.5 + np.sin(2 * np.pi * 900 * t) * np.exp(-t * 90) * 0.2)
def rise(): return A.s_riser(0.6) * 2.2
def sig():
    n = int(2.6 * SR); t = A.t_(n); f = 38 + 60 * np.exp(-t * 12)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) * 0.9
    cut = A.hp(A.rng.standard_normal(n), 0.5) * np.exp(-t * 30) * 0.25
    ch = sum(np.sin(2 * np.pi * A.mtof(m) * t) * np.exp(-t * 1.1) for m in (69, 73, 76, 81)) * 0.06 * np.clip(t / 0.02, 0, 1)
    return boom + cut + ch
# clean, tonal movement sounds (no noise/hiss)
def glide(f0, f1, d, amp, curve=2.0):
    n = int(d * SR); t = A.t_(n); u = t / d; f = f0 * (f1 / f0) ** (u ** curve)
    e = np.sin(np.pi * np.clip(u, 0, 1)) ** 1.5
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.25 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * e * amp
def whoosh(): return A.lp(glide(90, 320, 0.38, 0.22), 0.25)
def swish(): return A.lp(glide(240, 520, 0.22, 0.12), 0.3)
def pluck(f, d=0.25, amp=0.18):
    n = int(d * SR); t = A.t_(n); return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 18) * amp
def superh(): return pluck(660, 0.3, 0.13) + pluck(990, 0.3, 0.06)
def card(): return pluck(523, 0.25, 0.14)
def pop2(): return pluck(392, 0.3, 0.16)
def slam():
    n = int(0.7 * SR); t = A.t_(n); f = 42 + 80 * np.exp(-t * 22); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 0.9
def rise2():
    n = int(0.6 * SR); t = A.t_(n); u = t / 0.6; f = 220 * 2 ** (u * 1.0); return np.sin(2 * np.pi * np.cumsum(f) / SR) * u ** 2 * 0.08
def tick(): return pluck(1320, 0.08, 0.09)
def sig2():
    n = int(2.6 * SR); t = A.t_(n); f = 38 + 60 * np.exp(-t * 12)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) * 0.9
    ch = sum(np.sin(2 * np.pi * A.mtof(m) * t) * np.exp(-t * 1.1) for m in (69, 73, 76, 81)) * 0.06 * np.clip(t / 0.02, 0, 1)
    return boom + ch
def tickclock():
    n = int(0.12 * SR); t = A.t_(n); return (np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 90) * 0.35 + np.sin(2 * np.pi * 700 * t) * np.exp(-t * 60) * 0.25)
LIB = dict(A.LIB, tickclock=tickclock, ping=ping, click=click, rise=rise2, sig=sig2, whoosh=whoosh, swish=swish, super=superh, card=card, pop2=pop2, slam=slam, tick=tick)
# music: downbeat on the slam; intro before it, main after, stop before slam and before signature
o = B['slam'] % A.BAR; pre = int(o * SR)
sections = [(0, 'intro'), (B['slam'] - o - 0.01, 'main'), (B.get('lift', B.get('l7', B['sig'] - 4)) - o, 'lift')]
stops = [(B['slam'] - o - 0.32, B['slam'] - o - 0.005), (B['sig'] - o - 0.3, total + 5)]
m = A.music(total, sections, stops, B['sig'] + 1.05 - o)
m = np.concatenate([np.zeros(pre), m])
n = int((total + 0.3) * SR); m = np.pad(m, (0, max(0, n - len(m))))[:n]
sfx = np.zeros(n)
for e in ev:
    x = LIB[e['type']]() * e.get('g', 1); i = int(e['t'] * SR) - (int(0.22 * SR) if e['type'] in ('whoosh', 'swish', 'rise') else 0)
    i = max(0, i)
    if i < n: sfx[i:i + len(x)] += x[:n - i]
v = np.zeros(n); vo = A.read_wav(f'{name}_voice.wav'); v[:min(n, len(vo))] = vo[:n]
env = lfilter([0.003], [1, -0.997], np.abs(v)); env = env / (env.max() or 1); duck = 1 - 0.6 * np.clip(env * 3, 0, 1)
rms = lambda x: np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2))
vn = v / rms(v) * 0.12; mn = m / rms(m) * 0.034; sn = sfx * 0.85
# digital silence right before the signature hit
s0, s1 = int((B['sig'] + 0.45) * SR), int((B['sig'] + 0.74) * SR); mn[s0:int((B['sig'] + 1.04) * SR)] *= 0; sn[s0:s1] *= 0.15
mix = vn + mn * duck + sn * (0.55 + 0.45 * duck); mix = mix / max(1, np.abs(mix).max() / 0.95)
pcm = (np.stack([mix, mix], 1) * 32767).astype('<i2')
with wave.open(f'{out}/mix.wav', 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('mix', round(n / SR, 2), 's', len(ev), 'events')
