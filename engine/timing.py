import json, sys
def resolve(path):
    j = json.load(open(path)); t = j['lead']
    for c in j['cues']:
        if 'start' in c and 'end' in c: t = c['end'] + j['gap']; continue
        n = len(c['text'].replace('*','').split())
        c['start'] = round(t,3); c['end'] = round(t + n / j['wps'], 3); t = c['end'] + j['gap']
    j['end'] = round(j['cues'][-1]['end'] + j['tail'], 3)
    return j
if __name__ == '__main__':
    j = resolve(sys.argv[1]); print(json.dumps({c['id']:(c['start'],c['end']) for c in j['cues']})); print('end', j['end'])
