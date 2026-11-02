#!/bin/bash
# Rebuild the How It Ticks engine in a fresh container. Run from repo root: bash engine/setup.sh
set -e
R=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p /home/claude
ln -sfn $R/engine /home/claude/engine3d
mkdir -p /home/claude/tts && cp -r $R/engine/tts/* /home/claude/tts/
cd /home/claude/tts
[ -d piper_phonemize ] || tar xzf pp.tgz
chmod +x piper_phonemize/bin/* || true
[ -f kokoro-v1.0.onnx ] || curl -sL -o kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
python3 -c "import onnxruntime, scipy, numpy, PIL, playwright" || pip install --break-system-packages onnxruntime scipy pillow
cd /home/claude/engine3d && (python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &) ; sleep 1
echo "engine ready: /home/claude/engine3d (server :8765)"
