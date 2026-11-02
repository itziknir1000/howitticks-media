// How It Ticks — shared reel kit: beats from measured words, Catmull-Rom camera with whips, keynote type, signature ending, film look.
import { THREE, W, H, clamp, lerp, eio, eo, seg, scene, cam, ui, canvasTex, TL } from './common.js';
export const CY = '#3EE6FF', PU = '#9B6BFF', AM = '#FFB547', RD = '#FF3B5C';
export const v3 = a => new THREE.Vector3(...a);
export const easeB = t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

// ---------- beats ----------
export const B = {}; export let LINES = [];
export function wordT(li, w, nth = 0) { const L = LINES[li]; const xs = L.words.filter(o => o.w.toLowerCase().startsWith(w.toLowerCase())); return xs.length ? xs[Math.min(nth, xs.length - 1)].t : L.start; }
export function installTimeline(defBeats, after) {
  window.setTimeline = j => { Object.assign(TL, j); LINES = j.cues; for (const k in B) delete B[k];
    const raw = defBeats(wordT, LINES, j); raw.slam = raw.slam ?? LINES[0].end + 0.1; raw.sig = raw.sig ?? LINES[LINES.length - 1].end + 0.35; raw.end = j.end;
    for (const k in raw) B[k] = Math.round(raw[k] * 30) / 30; after && after(); };
  window.setEnv = () => {}; window.getBeats = () => B;
}

// ---------- stage ----------
export function glowTex(col) { const t = canvasTex(256, 256); t.draw((x, w, h) => { const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }); return t.tex; }
export function glowSprite(col, s, op = 0.5) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(col), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); m.scale.setScalar(s); return m; }
export function stage({ floor = true, dots = true, bg = '#040716' } = {}) {
  scene.background = new THREE.Color(bg); scene.fog = new THREE.Fog(bg, 8, 22);
  if (floor) { const f = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: '#0a0f2e', roughness: 0.9 })); f.rotation.x = -Math.PI / 2; scene.add(f); }
  if (dots) { const pts = []; for (let x = -8; x <= 8; x += 0.25) for (let z = -8; z <= 6; z += 0.25) pts.push(x, 0.002, z); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#2b3a9a', size: 0.018, transparent: true, opacity: 0.8 }))); }
  const gP = glowSprite('rgba(155,107,255,1)', 9, 0.32); gP.position.set(-3.2, 2.6, -4.5); scene.add(gP);
  const gC = glowSprite('rgba(62,230,255,1)', 7, 0.18); gC.position.set(3.2, 1.6, -4); scene.add(gC);
}

// ---------- camera: keys [t, pos, look, 'whip'?] ----------
export function camAt(t, CK, o = {}) {
  let i = 0; while (i < CK.length - 2 && t >= CK[i + 1][0]) i++;
  const a = CK[i], b = CK[i + 1]; let u = clamp((t - a[0]) / (b[0] - a[0])); const whip = b[3] === 'whip'; if (whip) u = eio(u);
  const P = (k, j) => v3(CK[clamp(j, 0, CK.length - 1)][k]);
  const nW = CK[i + 2] && CK[i + 2][3] === 'whip', pW = a[3] === 'whip';
  const cr = k => { const p1 = P(k, i), p2 = P(k, i + 1), p0 = pW ? p1 : P(k, i - 1), p3 = nW ? p2 : P(k, i + 2); if (whip) return p1.clone().lerp(p2, u); const u2 = u * u, u3 = u2 * u;
    return new THREE.Vector3().addScaledVector(p1, 2).addScaledVector(p2.clone().sub(p0), u).addScaledVector(p0.clone().multiplyScalar(2).sub(p1.clone().multiplyScalar(5)).add(p2.clone().multiplyScalar(4)).sub(p3), u2).addScaledVector(p1.clone().multiplyScalar(3).sub(p0).sub(p2.clone().multiplyScalar(3)).add(p3), u3).multiplyScalar(0.5); };
  const p = cr(1), l = cr(2);
  const dr = 1 - 0.85 * clamp((t - B.sig) / 0.4); p.x += Math.sin(t * 0.9) * 0.04 * dr; p.y += Math.sin(t * 1.3 + 1) * 0.025 * dr;
  for (const s of (o.shakes || [B.slam])) { const sh = t > s ? Math.exp(-(t - s) * 9) * 0.035 : 0; p.x += Math.sin(t * 90) * sh; p.y += Math.cos(t * 77) * sh; }
  cam.position.copy(p); cam.lookAt(l);
  cam.fov = (o.fov || 45) + (t > B.slam ? Math.exp(-(t - B.slam) * 6) * 6 : 0); cam.updateProjectionMatrix();
}

// ---------- keynote type ----------
export function word(s, x, y, size, col, age, o = {}) {
  const pop = eo(clamp(age / 0.11)), f = o.from || 1.45, sc = f - (f - 1) * pop; ui.save(); ui.translate(x, y); ui.scale(sc, sc); ui.globalAlpha = Math.min(1, pop * 1.4) * (o.a ?? 1);
  ui.font = `700 ${size}px Poppins`; ui.textAlign = 'center'; ui.textBaseline = 'middle';
  ui.shadowColor = 'rgba(0,0,0,0.8)'; ui.shadowBlur = 40; ui.shadowOffsetY = 10; ui.fillStyle = col; ui.fillText(s, 0, 0);
  if (col !== '#ffffff') { ui.shadowColor = col; ui.shadowBlur = 50; ui.shadowOffsetY = 0; ui.globalAlpha *= 0.5; ui.fillText(s, 0, 0); }
  ui.restore(); }
const wordW = (s, size) => { ui.font = `700 ${size}px Poppins`; return ui.measureText(s).width; };
export function line(words, y, size, t, o = {}) { const gap = size * 0.28, ws = words.map(w => wordW(w[0], size)); const tot = ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1); const k = Math.min(1, 960 / tot); let x = 540 - tot * k / 2;
  words.forEach((w, i) => { if (t >= w[1]) word(w[0], x + ws[i] * k / 2, y, size * k, w[2] || '#ffffff', t - w[1], o); x += (ws[i] + gap) * k; }); }
export function superAt(t, s, at, dur, y, size, col = '#ffffff') { if (t < at || t > at + dur) return; line([[s, at, col]], y, size, t, { a: clamp((at + dur - t) / 0.14) }); }
// hook: rows of [text, beatKey, color]; blown away on the slam
export function hook(t, rows, ys = [420, 610, 790], sizes = [190, 150, 150]) {
  if (t >= B.slam + 0.22) return; const bl = seg(t, B.slam, 0.2); ui.save(); ui.translate(540, 600); ui.scale(1 + bl * 0.5, 1 + bl * 0.5); ui.translate(-540, -600); ui.globalAlpha = 1 - bl;
  rows.forEach((r, i) => line(r.map(([s, k, c]) => [s, B[k], c || '#ffffff']), ys[i], sizes[i], t)); ui.restore(); }
export function counter(t, at, until, value, unit, y = 330, col = AM, o = {}) { // odometer in fixed digit cells, then a slam
  if (t < at - 0.05 || t > until) return; const age = t - at + 0.05, v = Math.round(value * eo(clamp(age / 0.35))), s = (o.prefix || '') + String(v).padStart(String(value).length, '0');
  const sl = 1 + (age > 0.35 ? 0.3 * Math.exp(-(age - 0.35) * 10) : 0); ui.save(); ui.globalAlpha = clamp((until - t) / 0.15); ui.translate(540, y); ui.scale(sl, sl);
  ui.font = '700 230px Poppins'; ui.textBaseline = 'middle'; ui.textAlign = 'center'; const cw = 145, x0 = -(s.length - 1) * cw / 2 - (unit ? 90 : 0);
  [...s].forEach((ch, i) => { ui.shadowColor = 'rgba(0,0,0,0.8)'; ui.shadowBlur = 40; ui.fillStyle = '#ffffff'; ui.fillText(ch, x0 + i * cw, 0); });
  if (unit) { ui.font = '700 110px Poppins'; ui.textAlign = 'left'; ui.fillStyle = col; ui.shadowColor = col; ui.shadowBlur = 30; ui.fillText(unit, x0 + (s.length - 1) * cw + 85, 30); } ui.restore(); }
export function foot(s, a, y = 1560) { if (a <= 0) return; ui.save(); ui.globalAlpha = a * 0.8; ui.font = '500 30px Poppins'; ui.textAlign = 'center'; ui.fillStyle = '#c8ceff'; ui.shadowColor = 'rgba(0,0,0,0.9)'; ui.shadowBlur = 10; ui.fillText(s, 540, y); ui.restore(); }

// ---------- signature: a clock ticks once, gets cut open, gears inside ----------
function gear(x, cx, cy, r, teeth, rot, col) { x.save(); x.translate(cx, cy); x.rotate(rot); x.fillStyle = col; x.beginPath();
  for (let k = 0; k < teeth * 2; k++) { const a0 = k / (teeth * 2) * Math.PI * 2, a1 = (k + 1) / (teeth * 2) * Math.PI * 2, rr = k % 2 ? r : r * 1.16; x.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr); x.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr); }
  x.closePath(); x.fill(); x.fillStyle = 'rgba(3,5,15,0.85)'; x.beginPath(); x.arc(0, 0, r * 0.32, 0, 7); x.fill(); x.restore(); }
export function signature(t, footText = '', handCol = RD) {
  const a = clamp((t - B.sig - 0.38) / 0.18); if (a <= 0) return;
  ui.save(); ui.globalAlpha = a; const g = ui.createRadialGradient(380, 520, 0, 540, 900, 1300); g.addColorStop(0, '#1b1f6e'); g.addColorStop(0.6, '#0a0f3a'); g.addColorStop(1, '#03050f'); ui.fillStyle = g; ui.fillRect(0, 0, W, H); ui.restore();
  const t0 = B.sig + 0.5, tick = t > t0 + 0.25 ? 1 : 0, open = eio(seg(t, t0 + 0.55, 0.45)), R = 230;
  ui.save(); ui.globalAlpha = a; ui.translate(540, 800); const s = 0.9 + 0.1 * eo(seg(t, t0, 0.3)); ui.scale(s, s);
  const spin = Math.max(0, t - t0 - 0.55) * 1.6;
  ui.save(); ui.beginPath(); ui.arc(0, 0, R, 0, 7); ui.clip(); ui.fillStyle = '#070a24'; ui.fillRect(-R, -R, 2 * R, 2 * R);
  gear(ui, -60, -40, 110, 14, spin, '#7a5cff'); gear(ui, 95, 55, 72, 10, -spin * 1.5 + 0.2, '#1fb6e0'); gear(ui, -10, 130, 52, 8, spin * 2 + 0.3, '#4656d6'); ui.restore();
  for (const side of [-1, 1]) { ui.save(); ui.translate(side * open * 150, side * open * 40); ui.beginPath(); ui.arc(0, 0, R, side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, side < 0 ? Math.PI * 1.5 : Math.PI * 0.5); ui.closePath();
    const fg = ui.createLinearGradient(-R, -R, R, R); fg.addColorStop(0, '#1a2070'); fg.addColorStop(1, '#0d1150'); ui.fillStyle = fg; ui.fill(); ui.strokeStyle = 'rgba(62,230,255,0.75)'; ui.lineWidth = 8; ui.stroke();
    for (let k = 0; k < 12; k++) { const an = k / 12 * Math.PI * 2 - Math.PI / 2, cx = Math.cos(an), cy = Math.sin(an); if ((cx < -0.01 && side > 0) || (cx > 0.01 && side < 0)) continue; ui.strokeStyle = 'rgba(255,255,255,0.8)'; ui.lineWidth = k % 3 ? 5 : 10; ui.beginPath(); ui.moveTo(cx * R * 0.78, cy * R * 0.78); ui.lineTo(cx * R * 0.9, cy * R * 0.9); ui.stroke(); }
    ui.restore(); }
  if (open < 0.05) { const ang = -Math.PI / 2 + (tick ? Math.PI / 6 : 0) + (tick ? 0.06 * Math.exp(-(t - t0 - 0.25) * 18) * Math.sin((t - t0 - 0.25) * 60) : 0);
    ui.strokeStyle = handCol; ui.shadowColor = handCol; ui.shadowBlur = 25; ui.lineWidth = 12; ui.lineCap = 'round'; ui.beginPath(); ui.moveTo(0, 0); ui.lineTo(Math.cos(ang) * R * 0.7, Math.sin(ang) * R * 0.7); ui.stroke(); ui.shadowBlur = 0; ui.fillStyle = '#fff'; ui.beginPath(); ui.arc(0, 0, 14, 0, 7); ui.fill(); }
  if (t > t0 + 0.5 && t < t0 + 0.75) { const c = seg(t, t0 + 0.5, 0.2); ui.strokeStyle = CY; ui.shadowColor = CY; ui.shadowBlur = 40; ui.lineWidth = 10; ui.beginPath(); ui.moveTo(0, -R - 60); ui.lineTo(0, -R - 60 + (2 * R + 120) * c); ui.stroke(); }
  ui.restore();
  const wa = eo(seg(t, t0 + 0.8, 0.3)); if (wa > 0) { ui.save(); ui.globalAlpha = wa; ui.font = '700 132px Poppins'; ui.textAlign = 'center'; ui.textBaseline = 'middle'; ui.fillStyle = '#ffffff'; ui.shadowColor = 'rgba(155,107,255,0.8)'; ui.shadowBlur = 40;
    ui.letterSpacing = `${lerp(30, 6, wa)}px`; ui.fillText('HOW IT TICKS', 540, 1170); ui.letterSpacing = '0px'; ui.font = '500 52px Poppins'; ui.fillStyle = '#b8c0ff'; ui.shadowBlur = 0; ui.fillText('@howitticks.tv', 540, 1270); ui.restore(); }
  if (footText) foot(footText, a);
}
export const sigEvents = ev => { ev(B.sig - 0.05, 'whoosh', 1.2); ev(B.sig + 0.75, 'tickclock', 1); ev(B.sig + 1.05, 'sig', 1); };

// ---------- film look ----------
const grain = (() => { const c = document.createElement('canvas'); c.width = 540; c.height = 960; const x = c.getContext('2d'); const d = x.createImageData(540, 960); let s = 7; for (let i = 0; i < d.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = (s / 2147483647) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; })();
export function filmLook(t) {
  const v = ui.createRadialGradient(540, 900, 500, 540, 960, 1250); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); ui.fillStyle = v; ui.fillRect(0, 0, W, H);
  ui.save(); ui.globalAlpha = 0.035; ui.globalCompositeOperation = 'overlay'; const f = Math.floor(t * 30); ui.drawImage(grain, -(f * 137) % 540, -(f * 211) % 960, 1080 * 2, 1920 * 2); ui.restore();
}
export function eventsHelper() { const E = []; const ev = (t, type, g = 1) => E.push({ t: Math.round(t * 30) / 30, type, g }); return { E, ev, done: () => E.sort((a, b) => a.t - b.t) }; }
