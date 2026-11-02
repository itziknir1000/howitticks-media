# Original music + event-driven SFX + voice mix for the English reels. Everything synthesized here.
# usage: python3 en_audio.py out_dir name   -> writes out_dir/mix.wav
import json, sys, wave, numpy as np
SR = 48000
rng = np.random.default_rng(11)

def t_(n): return np.arange(n) / SR
def env_adsr(n, a=0.005, d=0.1, s=0.6, r=0.1):
    e = np.ones(n) * s; na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, max(1, na))[:len(e[:na])]; e[na:na + nd] = np.linspace(1, s, max(1, nd))[:len(e[na:na + nd])]
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e
def lp(x, a):  # simple one-pole lowpass (vectorized via filtfilt-free recursion in chunks)
    from scipy.signal import lfilter
    return lfilter([a], [1, a - 1], x)
def hp(x, a):
    return x - lp(x, a)
def saw(f, n, detune=0.0):
    ph = np.cumsum(np.full(n, f * (1 + detune)) / SR); return 2 * (ph % 1) - 1
def sq(f, n): return np.sign(np.sin(2 * np.pi * f * t_(n)))
def mtof(m): return 440 * 2 ** ((m - 69) / 12)

# ---------- instruments ----------
def kick():
    n = int(0.35 * SR); t = t_(n); f = 48 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5) * 0.95
def clap():
    n = int(0.25 * SR); x = rng.standard_normal(n); e = np.zeros(n)
    for o in (0, 0.012, 0.024): i = int(o * SR); e[i:] += np.exp(-t_(n - i) * 38)
    return hp(lp(x, 0.35), 0.08) * e * 0.35
def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR); x = hp(rng.standard_normal(n), 0.6)
    return x * np.exp(-t_(n) * (14 if open_ else 70)) * 0.12
def bass(m, dur):
    n = int(dur * SR); f = mtof(m); x = 0.6 * saw(f, n) + 0.4 * np.sin(2 * np.pi * f / 2 * t_(n))
    return lp(x, 0.08) * env_adsr(n, 0.004, 0.08, 0.7, 0.03) * 0.35
def lead(m, dur):
    n = int(dur * SR); f = mtof(m); x = saw(f, n) + saw(f, n, 0.006) + 0.5 * sq(f * 0.5, n)
    vib = 1; return lp(x, 0.12) * env_adsr(n, 0.01, 0.12, 0.55, 0.06) * 0.075
def pad(ms, dur):
    n = int(dur * SR); x = np.zeros(n)
    for m in ms: f = mtof(m); x += saw(f, n) + saw(f, n, 0.004) + saw(f, n, -0.004)
    return lp(x, 0.03) * env_adsr(n, 0.25, 0.3, 0.8, 0.4) * 0.03

# ---------- music ----------
BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT
# A minor: Am | F | C | G   (roots in MIDI, chord tones)
PROG = [(45, [57, 60, 64]), (41, [57, 60, 65]), (48, [55, 60, 64]), (43, [55, 59, 62])]
HOOK = [(0, 76, .5), (.5, 74, .5), (1, 72, .5), (1.5, 74, 1), (2.5, 69, .5), (3, 72, 1),          # bar 1 (beats)
        (4, 77, .5), (4.5, 76, .5), (5, 74, .5), (5.5, 72, 1), (6.5, 74, .5), (7, 76, 1)]       # bar 2
def music(total, sections, stops, end_hit):
    n = int((total + 2) * SR); mix = np.zeros(n); drums = np.zeros(n); kick_pos = []
    def put(buf, x, t):
        i = int(t * SR)
        if 0 <= i < n: buf[i:i + len(x)] += x[:n - i]
    K, CL, H, HO = kick(), clap(), hat(), hat(True)
    nb = int(total / BEAT) + 2
    for b in range(nb):
        tb = b * BEAT; bar = b // 4; beat = b % 4; root, chord = PROG[bar % 4]
        sec = max([s for s in sections if s[0] <= tb] or [(0, 'intro')], key=lambda s: s[0])[1]
        if any(s0 <= tb < s1 for s0, s1 in stops): continue
        if sec != 'intro' or b >= 2:
            put(drums, K, tb); kick_pos.append(tb)
        if sec in ('main', 'lift') and beat in (1, 3): put(drums, CL, tb)
        if sec != 'intro':
            for h in range(2): put(drums, HO if (h == 1 and beat == 3) else H, tb + h * BEAT / 2)
        for e in range(2): put(mix, bass(root + (12 if (sec == 'lift' and e == 1) else 0), BEAT / 2 * 0.95), tb + e * BEAT / 2)
        if beat == 0: put(mix, pad([c + (1 if sec == 'lift' else 0) for c in chord], BAR), tb)
        if sec in ('intro', 'main', 'lift') and beat == 0 and bar % 2 == 0 and (bar // 2) % 2 == 0:
            for (o, m, d) in HOOK: put(mix, lead(m, d * BEAT * 0.9), tb + o * BEAT)
    # sidechain pump from kicks
    g = np.ones(n)
    for k in kick_pos:
        i = int(k * SR); L = int(0.22 * SR); g[i:i + L] = np.minimum(g[i:i + L], 0.45 + 0.55 * (np.linspace(0, 1, len(g[i:i + L])) ** 1.5))
    out = mix * g + drums
    # end chord
    root, chord = PROG[0]; ec = pad([c for c in chord] + [c + 12 for c in chord], 2.6) * 3; put(out, ec, end_hit)
    fade = int(0.8 * SR); e = int((total + 1.2) * SR); out[e:e + fade] *= np.linspace(1, 0, len(out[e:e + fade])); out[e + fade:] = 0
    return out

# ---------- sfx ----------
def s_whoosh(d=0.45):
    n = int(d * SR); x = rng.standard_normal(n); k = np.linspace(0.02, 0.4, n); y = np.zeros(n); acc = 0.0
    from scipy.signal import lfilter
    y = lfilter([0.15], [1, -0.85], x); e = np.sin(np.pi * np.clip(t_(n) / d, 0, 1)) ** 2
    return hp(y, 0.05) * e * 0.5
def s_pop():
    n = int(0.09 * SR); t = t_(n); f = 900 * np.exp(-t * 25) + 300
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45) * 0.32
def s_pop2():
    n = int(0.12 * SR); t = t_(n); f = 520 * np.exp(-t * 18) + 180
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30) * 0.28
def s_card():
    return np.concatenate([s_whoosh(0.18) * 0.6, s_pop() * 0.8])
def s_slam():
    n = int(0.7 * SR); t = t_(n); f = 40 + 90 * np.exp(-t * 20)
    b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 0.9; nz = lp(rng.standard_normal(n), 0.2) * np.exp(-t * 25) * 0.5
    return b + nz
def s_tick():
    n = int(0.04 * SR); t = t_(n); return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 120) * 0.22
def s_super():
    n = int(0.22 * SR); t = t_(n); x = hp(rng.standard_normal(n), 0.4) * np.exp(-t * 18) * 0.12
    return x + np.sin(2 * np.pi * (300 + 900 * t / 0.22) * t) * np.exp(-t * 14) * 0.12
def s_swish(): return s_whoosh(0.28) * 0.6
def s_riser(d=1.0):
    n = int(d * SR); t = t_(n); f = 200 + 1600 * (t / d) ** 2
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.05 + hp(rng.standard_normal(n), 0.3) * 0.05 * (t / d)) * (t / d)
LIB = {'whoosh': s_whoosh, 'pop': s_pop, 'pop2': s_pop2, 'card': s_card, 'slam': s_slam, 'tick': s_tick, 'super': s_super, 'swish': s_swish}

def read_wav(p):
    with wave.open(p) as w: sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32) / 32768; ch = w.getnchannels()
    if ch == 2: x = x.reshape(-1, 2).mean(1)
    if sr != SR: x = np.interp(np.arange(int(len(x) * SR / sr)) * sr / SR, np.arange(len(x)), x)
    return x
def main(out, name):
    j = json.load(open(f'{out}/timing.resolved.json')); total = j['end']; ev = json.load(open(f'{out}/events.json')); shots = json.load(open(f'{out}/shots.json'))
    cues = j['cues']; cta = cues[-1]
    voice = read_wav(f'{name}_voice.wav')
    sections = [(0, 'intro'), (cues[1]['start'] - 0.05, 'main'), (cta['start'] - 0.3, 'lift')]
    stops = [(cues[1]['start'] - 0.35, cues[1]['start'] - 0.02)]  # full stop before the explanation starts
    m = music(total, sections, stops, total - 1.2)
    n = len(m); sfx = np.zeros(n)
    for e in ev:
        x = LIB[e['type']](); i = int(e['t'] * SR) - (int(0.2 * SR) if e['type'] in ('whoosh', 'swish') else 0)
        if 0 <= i < n: sfx[i:i + len(x)] += x[:n - i]
    i = int((cues[1]['start'] - 0.95) * SR); r = s_riser(0.9); sfx[max(0, i):max(0, i) + len(r)] += r[:n - max(0, i)]
    i = int(cues[1]['start'] * SR); s = s_slam() * 0.8; sfx[i:i + len(s)] += s[:n - i]
    v = np.zeros(n); v[:min(n, len(voice))] = voice[:n]
    # duck music+sfx under voice (envelope follower)
    from scipy.signal import lfilter
    env = lfilter([0.002], [1, -0.998], np.abs(v)); env = env / (env.max() or 1)
    duck = 1 - 0.55 * np.clip(env * 3, 0, 1)
    def rms(x): return np.sqrt(np.mean(x[x != 0] ** 2)) if np.any(x) else 1
    vn = v / rms(v) * 0.12; mn = m / rms(m) * 0.045; sn = sfx * 0.9
    mix = vn + mn * duck + sn * (0.6 + 0.4 * duck)
    mix = mix[:int((total + 0.2) * SR)]; peak = np.abs(mix).max(); mix = mix / max(1, peak / 0.95)
    pcm = (np.stack([mix, mix], 1) * 32767).astype('<i2')
    with wave.open(f'{out}/mix.wav', 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('mix ok', round(len(mix) / SR, 2), 's,', len(ev), 'events')
if __name__ == '__main__': main(sys.argv[1], sys.argv[2])
