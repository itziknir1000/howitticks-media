# Voice first: synthesize line by line, tight gaps, measure word onsets (phoneme-proportional, snapped to waveform rises).
import json, sys, re, numpy as np
sys.path.insert(0, '/home/claude/tts')
from tts import synth, write_wav, SR, phonemize
LINES = [
 "Who decided you'd watch one more episode?",
 "In twenty twelve, Netflix added Post-Play.",
 "The credits shrink. A timer starts.",
 "Do nothing, and the next episode plays.",
 "Stopping became the choice. Watching became the default.",
 "When researchers turned autoplay off, sessions got about eighteen minutes shorter.",
 "So who decided? Nobody. The timer did.",
]
VOICE = 'am_michael'; LEAD = 0.12; GAPS = [0.32, 0.22, 0.2, 0.32, 0.3, 0.38]; TAIL = 3.0
audio = [np.zeros(int(LEAD * SR), np.float32)]; t = LEAD; out = []
for i, L in enumerate(LINES):
    a = synth(L, VOICE, 1.0 if i else 1.04)
    if i == 0: a = np.clip(a * 1.25, -1, 1)  # hook sits loud and up front
    d = len(a) / SR
    # word onsets
    words = L.split(' '); tot = len(phonemize(L)); ws = []
    fr = int(SR * 0.01); env = np.array([np.sqrt(np.mean(a[k:k + fr] ** 2)) for k in range(0, len(a), fr)])
    for wi, w in enumerate(words):
        pre = ' '.join(words[:wi]); f = len(phonemize(pre)) / tot if pre else 0
        est = f * d
        if wi:  # snap to the strongest energy rise within ±0.1 s
            k0 = max(1, int((est - 0.1) * 100)); k1 = min(len(env) - 1, int((est + 0.1) * 100))
            if k1 > k0: rise = env[k0:k1] - env[k0 - 1:k1 - 1]; est = (k0 + int(np.argmax(rise))) / 100
        ws.append({'w': re.sub(r'[^\w\'-]', '', w), 't': round(t + est, 3)})
    out.append({'id': f'L{i+1}', 'text': L, 'start': round(t, 3), 'end': round(t + d, 3), 'words': ws})
    audio.append(a); t += d
    if i < len(GAPS): audio.append(np.zeros(int(GAPS[i] * SR), np.float32)); t += GAPS[i]
audio.append(np.zeros(int(TAIL * SR), np.float32)); wav = np.concatenate(audio); end = round(len(wav) / SR, 3)
write_wav('nf_voice.wav', wav)
fr = SR // 30; env = [float(np.sqrt(np.mean(wav[i * fr:(i + 1) * fr] ** 2))) for i in range(int(np.ceil(len(wav) / fr)))]
mx = max(env); env = [round(min(1, e / mx * 1.4), 3) for e in env]
json.dump({'cues': out, 'end': end, 'env': env, 'lead': LEAD, 'gap': 0.3, 'tail': TAIL}, open('nf_timing.json', 'w'), indent=1)
for l in out: print(l['id'], l['start'], l['end'], ' '.join(f"{w['w']}@{w['t']}" for w in l['words']))
print('end', end)
