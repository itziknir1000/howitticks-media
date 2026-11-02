// Shared 3D reel engine: renderer, post, helpers, captions, timeline glue.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export { THREE, RoundedBoxGeometry };
await Promise.all([document.fonts.load('700 100px Heebo'), document.fonts.load('400 40px Heebo'), document.fonts.load('700 100px Poppins').catch(() => 0), document.fonts.load('500 40px Poppins').catch(() => 0)]);

export const W = 1080, H = 1920;
export const LANG = { en: !!window.LANG_EN };
const FONT = () => LANG.en ? 'Poppins' : 'Heebo';
export const C = { cyan: '#3EE6FF', purple: '#9B6BFF', amber: '#FFB547', red: '#FF3B5C', sky: '#7CC8FF', white: '#F3F5FF', dim: '#8C96CF', gold: '#E8C36A', fire: '#FF7A2E', police: '#2F6BFF' };
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const eo = t => 1 - Math.pow(1 - t, 3);
export const seg = (t, a, d) => clamp((t - a) / d);

export const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);
export const ui = document.getElementById('ui').getContext('2d');
export const scene = new THREE.Scene(); scene.background = new THREE.Color('#03050f'); scene.fog = new THREE.Fog('#03050f', 7, 24);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3;
export const cam = new THREE.PerspectiveCamera(45, W / H, 0.02, 80);
export const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, cam));
export const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.55, 0.5, 0.62); composer.addPass(bloom); composer.addPass(new OutputPass());
scene.add(new THREE.HemisphereLight('#4a5cff', '#05060f', 0.45));
export const key = new THREE.DirectionalLight('#a9c4ff', 1.5); key.position.set(3, 6, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); key.shadow.bias = -0.0005; scene.add(key);
export const rimP = new THREE.PointLight('#9b6bff', 8, 10, 2); rimP.position.set(-2.5, 2, -1.5); scene.add(rimP);
export const rimC = new THREE.PointLight('#3ee6ff', 5, 10, 2); rimC.position.set(2.5, 1.2, -1.2); scene.add(rimC);

export function canvasTex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return { c, x: c.getContext('2d'), tex, draw(fn) { fn(this.x, w, h); tex.needsUpdate = true; } }; }
export function txt(x, s, px, py, size, color, o = {}) { x.save(); const F = o.font || FONT(); x.font = `${o.w || 700} ${size}px ${F}`; x.fillStyle = color; x.textAlign = o.align || 'center'; x.textBaseline = 'middle'; x.direction = o.dir || (LANG.en ? 'ltr' : 'rtl'); if (o.glow) { x.shadowColor = o.glow; x.shadowBlur = o.blur || 30; } x.globalAlpha = o.a ?? 1; if (o.maxW) { const m = x.measureText(s).width; if (m > o.maxW) x.font = `${o.w || 700} ${size * o.maxW / m}px ${F}`; } x.fillText(s, px, py); x.restore(); }
export const groups = {};
export function group(n) { const g = new THREE.Group(); g.visible = false; scene.add(g); groups[n] = g; return g; }
export const glowMat = (col, op = 1) => new THREE.MeshBasicMaterial({ color: col, transparent: op < 1, opacity: op, blending: op < 1 ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: op >= 1 });
export function label3D(s, col, w = 1.2, size = 90) { const t = canvasTex(1024, 220); t.draw((x, W2, H2) => txt(x, s, W2 / 2, H2 / 2, size, col, { glow: col, maxW: 980 })); return new THREE.Mesh(new THREE.PlaneGeometry(w, w * 220 / 1024), new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, toneMapped: false, depthWrite: false })); }
export function panel(w, h, drawFn, col = '#141a52', bright = 1) { const r = Math.max(w, h); const t = canvasTex(Math.round(1024 * w / r), Math.round(1024 * h / r)); t.draw(drawFn); const face = new THREE.MeshBasicMaterial({ map: t.tex, toneMapped: false, color: new THREE.Color(bright, bright, bright) }); const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.03, 3, 0.015), [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ color: col })).concat([face, new THREE.MeshStandardMaterial({ color: col })])); m.userData.tex = t; m.castShadow = true; return m; }
export function cardDraw(lines, col, bg = ['#0d1240', '#1b2266']) { return (x, w, h) => { const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.strokeStyle = col; x.lineWidth = 10; x.strokeRect(5, 5, w - 10, h - 10); const n = lines.length; lines.forEach((l, i) => txt(x, l.s, w / 2, h * (i + 1) / (n + 1) + 6, l.size, l.color || '#fff', { glow: l.glow, maxW: w - 80, w: l.w || 700 })); }; }
export const floorGrid = () => { const g = new THREE.GridHelper(30, 120, '#3b2aa8', '#17185a'); g.material.transparent = true; g.material.opacity = 0.5; return g; };
export function camLook(px, py, pz, tx, ty, tz) { cam.position.set(px, py, pz); cam.lookAt(tx, ty, tz); }

// ---- timeline ----
export const TL = { cues: [], m: {}, end: 0 };
window.setTimeline = j => { Object.assign(TL, j); TL.m = {}; j.cues.forEach(c => TL.m[c.id] = c); };
export const cs = id => TL.m[id].start, ce = id => TL.m[id].end;
export function currentShot(list, t) { let s = list[0], nx = TL.end; for (let i = 0; i < list.length; i++) if (t >= list[i][1]) { s = list[i]; nx = i + 1 < list.length ? list[i + 1][1] : TL.end; } return { id: s[0], t0: s[1], t1: nx }; }

// ---- captions ----
function chunks(text) {
  const ws = text.split(' '); const out = []; let cur = []; const en = LANG.en;
  const maxW = en ? 4 : 3, maxL = en ? 24 : 17, brk = en ? /[.?!]$/ : /[,.?:!]$/;
  for (const w of ws) { const len = cur.join(' ').replace(/\*/g, '').length; if (cur.length && (cur.length >= maxW || len + w.length > maxL)) { out.push(cur.join(' ')); cur = []; } cur.push(w); if (brk.test(w.replace(/\*/g, ''))) { out.push(cur.join(' ')); cur = []; } }
  if (cur.length) out.push(cur.join(' '));
  if (en) { for (let i = out.length - 1; i > 0; i--) { if (out[i].split(' ').length === 1 && (out[i - 1] + ' ' + out[i]).replace(/\*/g, '').length <= 28) { out[i - 1] += ' ' + out[i]; out.splice(i, 1); } } }
  return out;
}
function capAt(t) { for (let ci = 0; ci < TL.cues.length; ci++) { const c = TL.cues[ci]; if (c.noCaption) continue; const nxt = TL.cues[ci + 1]; const hold = LANG.en && nxt ? Math.max(0.25, nxt.start - c.end - 0.05) : 0.25; if (t >= c.start && t < c.end + hold) { const ch = chunks(c.text); const tot = ch.reduce((s, x) => s + x.replace(/\*/g, '').length + 2, 0); let acc = 0; for (const x of ch) { const d = (x.replace(/\*/g, '').length + 2) / tot * (c.end - c.start); if (t < c.start + acc + d || x === ch[ch.length - 1]) return { s: x, age: t - (c.start + acc) }; acc += d; } } } return null; }
function parseHL(s, state) { return s.split(' ').map(tok => { if (tok.startsWith('*')) state.on = true; const o = { s: tok.replace(/\*/g, ''), hl: state.on }; if (/\*[,.?:!]?$/.test(tok) && !(tok.startsWith('*') && tok.indexOf('*', 1) < 0)) state.on = false; return o; }); }
function drawSupers(t) {
  const L = TL.supers || []; let cur = null; for (const s of L) if (t >= s.at && t < s.at + (s.dur || 1.5)) cur = s; if (!cur) return;
  const age = t - cur.at, out = clamp((cur.at + (cur.dur || 1.5) - t) / 0.15); const pop = eo(clamp(age / 0.12)); const sc = (0.6 + 0.4 * pop) * (1 + 0.06 * Math.exp(-age * 6) * Math.sin(age * 30));
  const txt0 = cur.t.toUpperCase(); const size = cur.size || 150;
  ui.save(); ui.translate(540, cur.y || 1380); ui.scale(sc, sc); ui.globalAlpha = Math.min(pop, out); ui.font = `700 ${size}px ${FONT()}`; ui.textAlign = 'center'; ui.textBaseline = 'middle'; ui.direction = 'ltr';
  const m = ui.measureText(txt0).width; if (m > 940) { ui.scale(940 / m, 940 / m); }
  ui.lineJoin = 'round'; ui.shadowColor = 'rgba(0,0,0,0.85)'; ui.shadowBlur = 34; ui.shadowOffsetY = 8; ui.strokeStyle = 'rgba(0,0,0,0.75)'; ui.lineWidth = 18; ui.strokeText(txt0, 0, 0);
  ui.shadowBlur = 0; ui.shadowOffsetY = 0; ui.fillStyle = cur.col || '#ffffff'; ui.fillText(txt0, 0, 0);
  if (cur.col && cur.col !== '#ffffff') { ui.globalAlpha *= 0.35; ui.shadowColor = cur.col; ui.shadowBlur = 40; ui.fillText(txt0, 0, 0); }
  ui.restore();
}
export function drawCaption(t) {
  if (TL.supers) return drawSupers(t);
  const c = capAt(t); if (!c) return; const pop = eo(clamp(c.age / 0.1)); const sc = 0.82 + 0.18 * pop;
  const words = parseHL(c.s, { on: false }).map(w => ({ ...w, s: LANG.en ? w.s.replace(/[.,]+$/, '') : w.s.replace(/\.+$/, '') }));
  const en = LANG.en; const size = en ? 104 : 112;
  ui.save(); ui.translate(540, 1390); ui.scale(sc, sc); ui.globalAlpha = pop; ui.font = `700 ${size}px ${FONT()}`; ui.direction = en ? 'ltr' : 'rtl'; ui.textBaseline = 'middle'; ui.textAlign = en ? 'left' : 'right';
  const sp = en ? 28 : 26, ws = words.map(w => ui.measureText(w.s).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1); const k = Math.min(1, 940 / tot); ui.scale(k, k); let x = en ? -tot / 2 : tot / 2;
  words.forEach((w, i) => { ui.lineJoin = 'round'; ui.shadowColor = 'rgba(0,0,0,0.9)'; ui.shadowBlur = 28; ui.shadowOffsetY = 6; ui.strokeStyle = 'rgba(0,0,0,0.7)'; ui.lineWidth = 14; ui.strokeText(w.s, x, 0); ui.shadowBlur = 0; ui.shadowOffsetY = 0; ui.lineWidth = 3; ui.strokeStyle = w.hl ? C.amber : '#fff'; ui.strokeText(w.s, x, 0); ui.fillStyle = w.hl ? C.amber : '#fff'; ui.fillText(w.s, x, 0); x += en ? ws[i] + sp : -(ws[i] + sp); });
  ui.restore();
}
export function title(lines, a, y = 300) { ui.save(); ui.globalAlpha = a; ui.textAlign = 'center'; ui.textBaseline = 'middle'; ui.direction = LANG.en ? 'ltr' : 'rtl'; let yy = y; lines.forEach(l => { l = { ...l, s: l.s.replace(/\.(?=["״']?$)/, '') }; ui.font = `700 ${l.size}px ${FONT()}`; const m = ui.measureText(l.s).width; if (m > 960) ui.font = `700 ${l.size * 960 / m}px ${FONT()}`; ui.shadowColor = 'rgba(0,0,0,0.85)'; ui.shadowBlur = 30; ui.fillStyle = l.color; ui.fillText(l.s, 540, yy); yy += l.size * 1.12; }); ui.restore(); }
export function note(s, y = 1560, a = 0.75) { ui.save(); ui.globalAlpha = a; ui.font = `${LANG.en ? 500 : 400} 34px ${FONT()}`; ui.textAlign = 'center'; ui.direction = LANG.en ? 'ltr' : 'rtl'; ui.fillStyle = '#c8ceff'; ui.shadowColor = 'rgba(0,0,0,0.9)'; ui.shadowBlur = 12; ui.fillText(s, 540, y); ui.restore(); }

export function install(shotList, update, drawExtras) {
  window.shotTimes = () => { const L = shotList(); return L.map((s, i) => [s[0], s[1], i + 1 < L.length ? L[i + 1][1] : TL.end]); };
  window.renderAt = t => { for (const k in groups) groups[k].visible = false; bloom.strength = 0.55; key.intensity = 1.5; const sh = currentShot(shotList(), t); update(t, sh, t - sh.t0, clamp((t - sh.t0) / (sh.t1 - sh.t0))); composer.render(); ui.clearRect(0, 0, W, H); drawExtras(t, sh); drawCaption(t); return sh.id; };
  window.ready = Promise.resolve(true);
}
