import sys, json, time
from playwright.sync_api import sync_playwright
from timing import resolve
from PIL import Image
page, tim = sys.argv[1], sys.argv[2]; times = [float(x) for x in sys.argv[3].split(',')]; out = sys.argv[4]
j = resolve(tim)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width':1080,'height':1920}); logs=[]
    pg.on('console', lambda m: logs.append(m.text)); pg.on('pageerror', lambda e: logs.append('ERR '+str(e)))
    pg.goto(f'http://127.0.0.1:8765/{page}'); pg.wait_for_function('!!window.renderAt'); pg.evaluate('window.ready')
    pg.evaluate(f'setTimeline({json.dumps(j)})')
    if 'spec' in j: pg.evaluate(f'setSpec({json.dumps(j["spec"])})')
    if 'env' in j: pg.evaluate(f'setEnv({json.dumps(j["env"])})')
    ims=[]
    for t in times:
        t0=time.time(); sid=pg.evaluate(f'renderAt({t})'); pg.screenshot(path='/tmp/pv.png'); ims.append(Image.open('/tmp/pv.png').convert('RGB').resize((360,640))); print(t, sid, round(time.time()-t0,2))
    print([l for l in logs if 'PCFSoft' not in l][:8]); b.close()
cols=min(5,len(ims)); rows=(len(ims)+cols-1)//cols
sheet=Image.new('RGB',(cols*370,rows*650))
for i,im in enumerate(ims): sheet.paste(im,((i%cols)*370,(i//cols)*650))
sheet.save(out, quality=88)
