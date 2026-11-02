# Voice first: python3 vo.py name  (reads scripts/name.txt, one line per cue; first line = hook, read a touch hotter)
# writes name_voice.wav + name_timing.json with word onsets (phoneme-proportional, snapped to energy rises)
import json, sys, re, numpy as np
sys.path.insert(0, '/home/claude/tts')
from tts import synth, write_wav, SR, phonemize
name = sys.argv[1]; LINES = [l.strip() for l in open(f'scripts/{name}.txt') if l.strip() and not l.startswith('#')]
VOICE = 'am_michael'; LEAD = 0.12; TAIL = 3.0
audio = [np.zeros(int(LEAD * SR), np.float32)]; t = LEAD; out = []
for i, L in enumerate(LINES):
    a = synth(L, VOICE, 1.04 if i == 0 else 1.0)
    if i == 0: a = np.clip(a * 1.25, -1, 1)
    d = len(a) / SR; words = L.split(' '); tot = max(1, len(phonemize(L))); ws = []
    fr = int(SR * 0.01); env = np.array([np.sqrt(np.mean(a[k:k + fr] ** 2)) for k in range(0, len(a), fr)])
    for wi, w in enumerate(words):
        pre = ' '.join(words[:wi]); est = (len(phonemize(pre)) / tot if pre else 0) * d
        if wi:
            k0 = max(1, int((est - 0.1) * 100)); k1 = min(len(env) - 1, int((est + 0.1) * 100))
            if k1 > k0: est = (k0 + int(np.argmax(env[k0:k1] - env[k0 - 1:k1 - 1]))) / 100
        ws.append({'w': re.sub(r"[^\w'-]", '', w), 't': round(t + est, 3)})
    out.append({'id': f'L{i+1}', 'text': L, 'start': round(t, 3), 'end': round(t + d, 3), 'words': ws})
    audio.append(a); t += d
    if i < len(LINES) - 1:
        gap = 0.34 if L.rstrip().endswith('?') else 0.24 if L.rstrip().endswith('.') else 0.16
        audio.append(np.zeros(int(gap * SR), np.float32)); t += gap
audio.append(np.zeros(int(TAIL * SR), np.float32)); wav = np.concatenate(audio)
write_wav(f'{name}_voice.wav', wav)
f30 = SR // 30; env = [float(np.sqrt(np.mean(wav[i * f30:(i + 1) * f30] ** 2))) for i in range(int(np.ceil(len(wav) / f30)))]; mx = max(env)
json.dump({'cues': out, 'end': round(len(wav) / SR, 3), 'env': [round(min(1, e / mx * 1.4), 3) for e in env], 'lead': LEAD, 'gap': 0.3, 'tail': TAIL}, open(f'{name}_timing.json', 'w'), indent=1)
for l in out: print(l['id'], l['start'], l['end'], ' '.join(f"{w['w']}@{w['t']}" for w in l['words']))
print('end', round(len(wav) / SR, 2))
