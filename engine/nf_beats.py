import json
from playwright.sync_api import sync_playwright
from timing import resolve
j = resolve('nf_timing.json')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(); pg.goto('http://127.0.0.1:8765/nf.html'); pg.wait_for_function('!!window.renderAt')
    pg.evaluate(f'setTimeline({json.dumps(j)})'); json.dump(pg.evaluate('getBeats()'), open('out_nf/beats.json', 'w')); b.close()
