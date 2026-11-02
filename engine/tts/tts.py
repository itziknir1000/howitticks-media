# Offline English TTS: espeak-ng (bundled with piper-phonemize) -> Kokoro v1.0 ONNX.
# usage as module: synth(text, voice='am_michael', speed=1.0) -> float32 numpy @24 kHz
import json, os, re, subprocess, numpy as np, onnxruntime as rt
D = os.path.dirname(os.path.abspath(__file__))
E = os.path.join(D, 'piper_phonemize')
VOCAB = json.load(open(os.path.join(D, 'kk/src/kokoro_onnx/config.json')))['vocab']
SR = 24000
_sess = None; _voices = None
def _load():
    global _sess, _voices
    if _sess is None:
        so = rt.SessionOptions(); so.intra_op_num_threads = 2
        _sess = rt.InferenceSession(os.path.join(D, 'kokoro-v1.0.onnx'), so)
        _voices = np.load(os.path.join(D, 'voices-v1.0.bin'))
def ipa(chunk):
    out = subprocess.run([os.path.join(E, 'bin/espeak-ng'), f'--path={E}/share', '-q', '--ipa', '-v', 'en-us', chunk],
                         capture_output=True, text=True, env={**os.environ, 'LD_LIBRARY_PATH': os.path.join(E, 'lib')}).stdout
    return ' '.join(l.strip() for l in out.strip().splitlines() if l.strip())
def phonemize(text):
    # keep punctuation the model knows, phonemize the words between them
    parts = re.split(r'([,.;:!?—…])', text)
    ph = ''
    for p in parts:
        if not p: continue
        if re.fullmatch(r'[,.;:!?—…]', p): ph = ph.rstrip() + p + ' '
        elif p.strip(): ph += ipa(p.strip()) + ' '
    ph = ''.join(c for c in ph.strip() if c in VOCAB)
    return ph
def synth(text, voice='am_michael', speed=1.0):
    _load()
    ph = phonemize(text); toks = [VOCAB[c] for c in ph]
    out = []
    # model limit ~510 tokens; split at punctuation if needed
    while toks:
        cut = len(toks) if len(toks) <= 500 else max(i for i in range(400, 500) if ph[i] in ',.;:!? ') + 1
        seg = toks[:cut]; toks = toks[cut:]; ph = ph[cut:]
        st = _voices[voice][min(len(seg), len(_voices[voice])) - 1]
        a = _sess.run(None, {'tokens': np.array([[0, *seg, 0]], dtype=np.int64), 'style': st.reshape(1, -1).astype(np.float32), 'speed': np.array([speed], dtype=np.float32)})[0]
        out.append(np.asarray(a).ravel())
    a = np.concatenate(out)
    # trim leading/trailing silence
    nz = np.where(np.abs(a) > 0.01)[0]
    if len(nz): a = a[max(0, nz[0] - 600): nz[-1] + 1200]
    return a.astype(np.float32)
def write_wav(path, a, sr=SR):
    import wave
    pcm = (np.clip(a, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
if __name__ == '__main__':
    import sys, time
    t = time.time(); a = synth(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'am_michael')
    write_wav(sys.argv[3] if len(sys.argv) > 3 else 'out.wav', a); print(len(a) / SR, 's audio in', round(time.time() - t, 1), 's')
