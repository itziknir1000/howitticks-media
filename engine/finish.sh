#!/bin/bash
# usage: finish.sh name   (page name.html, timing name_timing.json) → deliver/howitticks_name.mp4 (+ _ig)
cd /home/claude/engine3d; n=$1; o=out_$n
mkdir -p $o; rm -f $o/*.tmp.mp4 $o/video_noaudio.mp4
python3 render.py $n.html ${n}_timing.json $o > render_$n.log 2>&1 || { echo RENDER_FAIL; tail -5 render_$n.log; exit 1; }
python3 - <<PY
import json; from playwright.sync_api import sync_playwright; from timing import resolve
j = resolve('${n}_timing.json')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg = b.new_page(); pg.goto('http://127.0.0.1:8765/$n.html'); pg.wait_for_function('!!window.renderAt')
    pg.evaluate(f'setTimeline({json.dumps(j)})'); json.dump(pg.evaluate('getBeats()'), open('$o/beats.json','w')); b.close()
PY
python3 audio.py $o $n
ffmpeg -v error -y -i $o/video_noaudio.mp4 -i $o/mix.wav -map 0:v -map 1:a -c:v copy -af "volume=5.1dB,alimiter=limit=0.63:attack=0.5:release=50:level=false" -ar 48000 -c:a aac -b:a 192k -shortest deliver/howitticks_$n.mp4
ffmpeg -v error -y -i deliver/howitticks_$n.mp4 -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -profile:v high -movflags +faststart -c:a copy deliver/howitticks_${n}_ig.mp4
ffmpeg -hide_banner -nostats -i deliver/howitticks_$n.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):"
python3 motion_audit.py deliver/howitticks_$n.mp4
ls -la deliver/howitticks_${n}_ig.mp4
echo FINISHED
