# usage: python3 render.py page.html timing.json outdir
import sys, json, os, subprocess, time
from playwright.sync_api import sync_playwright
from timing import resolve
page, tim, out = sys.argv[1], sys.argv[2], sys.argv[3]
FPS = 30
os.makedirs(out, exist_ok=True)
j = resolve(tim); json.dump(j, open(f'{out}/timing.resolved.json','w'), ensure_ascii=False, indent=1)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width':1080,'height':1920})
    pg.goto(f'http://127.0.0.1:8765/{page}'); pg.wait_for_function('!!window.renderAt'); pg.evaluate('window.ready')
    pg.evaluate(f'setTimeline({json.dumps(j)})')
    if 'spec' in j: pg.evaluate(f'setSpec({json.dumps(j["spec"])})')
    if 'env' in j: pg.evaluate(f'setEnv({json.dumps(j["env"])})')
    shots = pg.evaluate('shotTimes()'); json.dump(shots, open(f'{out}/shots.json','w'))
    if pg.evaluate('!!window.getEvents'): json.dump(pg.evaluate('getEvents()'), open(f'{out}/events.json','w'))
    files = []
    for i, (sid, t0, t1) in enumerate(shots):
        f0, f1 = round(t0 * FPS), round(t1 * FPS)
        name = f'{out}/shot_{i:02d}_{sid}.mp4'; files.append(name)
        if os.path.exists(name): continue
        tmp = name.replace('.mp4', '.tmp.mp4')
        ff = subprocess.Popen(['ffmpeg','-v','error','-y','-f','image2pipe','-framerate',str(FPS),'-c:v','mjpeg','-i','-',
            '-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-r',str(FPS),tmp], stdin=subprocess.PIPE)
        st = time.time()
        for f in range(f0, f1):
            pg.evaluate(f'renderAt({f / FPS})')
            ff.stdin.write(pg.screenshot(type='jpeg', quality=92))
        ff.stdin.close(); rc = ff.wait()
        if rc == 0: os.rename(tmp, name)
        print(sid, f1 - f0, 'frames', round(time.time() - st), 's', flush=True)
    b.close()
with open(f'{out}/list.txt','w') as fl:
    for f in files: fl.write(f"file '{os.path.basename(f)}'\n")
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',f'{out}/list.txt','-c','copy',f'{out}/video_noaudio.mp4'], check=True)
print('done', j['end'])
