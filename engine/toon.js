// Procedural cartoon character with cel shading and ink outlines.
import * as THREE from 'three';

const grad = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 1; const x = c.getContext('2d');
  ['#555', '#999', '#ddd', '#fff'].forEach((col, i) => { x.fillStyle = col; x.fillRect(i, 0, 1, 1); });
  const t = new THREE.CanvasTexture(c); t.minFilter = t.magFilter = THREE.NearestFilter; return t; })();
export const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: grad, ...extra });
const inkMat = new THREE.MeshBasicMaterial({ color: '#0a0b1a', side: THREE.BackSide });
function inked(geo, mat, w = 0.035) { const g = new THREE.Group(); const m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m); const o = new THREE.Mesh(geo, inkMat); o.scale.setScalar(1 + w); g.add(o); g.userData.mesh = m; return g; }
function limb(len, r, mat) { const pivot = new THREE.Group(); const seg = inked(new THREE.CapsuleGeometry(r, len, 6, 14), mat, 0.06); seg.position.y = -len / 2 - r * 0.2; pivot.add(seg); return pivot; }

const PRESETS = {
  guy: { skin: '#f2c29b', hair: '#2b1d16', shirt: '#3a6df0', pants: '#1f2547', shoes: '#c94a3a', hairStyle: 'short' },
  girl: { skin: '#e9b48d', hair: '#5a2e1a', shirt: '#ff7a59', pants: '#2a2f55', shoes: '#3a3f6e', hairStyle: 'long' },
  judge: { skin: '#f0c7a6', hair: '#d9d9d9', shirt: '#14131c', pants: '#14131c', shoes: '#111', hairStyle: 'bald' },
  cop: { skin: '#c98e66', hair: '#1a1410', shirt: '#2a3f8a', pants: '#1a2140', shoes: '#111', hairStyle: 'cap' },
  lawyer: { skin: '#f5cfb0', hair: '#121212', shirt: '#2b2f3a', pants: '#20232c', shoes: '#3a2416', hairStyle: 'short', tie: '#c4372f' },
};

export function makeToon(preset = 'guy') {
  const P = typeof preset === 'string' ? PRESETS[preset] : preset;
  const skin = toon(P.skin), hairM = toon(P.hair), shirt = toon(P.shirt), pants = toon(P.pants), shoes = toon(P.shoes);
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  // legs
  const legL = limb(0.42, 0.085, pants), legR = limb(0.42, 0.085, pants); legL.position.set(-0.11, 0.62, 0); legR.position.set(0.11, 0.62, 0); body.add(legL, legR);
  for (const leg of [legL, legR]) { const sh = inked(new THREE.SphereGeometry(0.1, 20, 14), shoes, 0.06); sh.scale.set(1, 0.6, 1.5); sh.position.set(0, -0.6, 0.05); leg.add(sh); }
  // torso
  const torso = inked(new THREE.CapsuleGeometry(0.2, 0.32, 8, 20), shirt, 0.04); torso.position.y = 0.9; torso.scale.set(1, 1, 0.75); body.add(torso);
  if (P.tie) { const tie = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.02), toon(P.tie)); tie.position.set(0, 0.93, 0.155); body.add(tie); }
  // arms (pivot at shoulder)
  const armL = limb(0.34, 0.06, shirt), armR = limb(0.34, 0.06, shirt); armL.position.set(-0.25, 1.1, 0); armR.position.set(0.25, 1.1, 0); body.add(armL, armR);
  const hands = []; for (const a of [armL, armR]) { const h = inked(new THREE.SphereGeometry(0.07, 18, 14), skin, 0.06); h.position.y = -0.47; a.add(h); hands.push(h); }
  // head
  const head = new THREE.Group(); head.position.y = 1.42; body.add(head);
  const skull = inked(new THREE.SphereGeometry(0.26, 32, 24), skin, 0.03); skull.scale.set(1, 1.05, 0.95); head.add(skull);
  for (const sx of [-1, 1]) { const ear = inked(new THREE.SphereGeometry(0.055, 14, 10), skin, 0.06); ear.position.set(sx * 0.25, -0.01, 0); ear.scale.set(0.6, 1, 1); head.add(ear); }
  for (const sx of [-1, 1]) { const ch = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), new THREE.MeshBasicMaterial({ color: '#ff8f8f', transparent: true, opacity: 0.45 })); ch.position.set(sx * 0.15, -0.06, 0.205); ch.rotation.y = sx * 0.5; head.add(ch); }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), toon(P.skin)); nose.position.set(0, -0.03, 0.25); head.add(nose);
  // eyes
  const eyes = [], pupils = [], lids = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.062, 20, 14), new THREE.MeshBasicMaterial({ color: '#d9dbe6' })); e.scale.set(0.85, 1.05, 0.5); e.position.set(sx * 0.09, 0.05, 0.225); head.add(e); eyes.push(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), new THREE.MeshBasicMaterial({ color: '#111226' })); p.position.set(sx * 0.09, 0.045, 0.252); p.scale.set(1, 1.15, 0.5); head.add(p); pupils.push(p);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), new THREE.MeshBasicMaterial({ color: '#cfd3e6' })); hl.position.set(sx * 0.09 + 0.012, 0.062, 0.268); head.add(hl);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.066, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), toon(P.skin)); lid.position.copy(e.position); lid.scale.set(1, 1.25, 0.6); lid.rotation.x = -Math.PI / 2 - 1.2; head.add(lid); lids.push(lid);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.02), new THREE.MeshBasicMaterial({ color: P.hairStyle === 'bald' ? '#9a9a9a' : P.hair })); brow.position.set(sx * 0.09, 0.15, 0.23); brow.userData.sx = sx; head.add(brow); eyes.push(brow);
  }
  const brows = eyes.filter(m => m.geometry.type === 'BoxGeometry');
  // mouth (scaled ellipse; open amount drives y-scale)
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.05, 18, 12), new THREE.MeshBasicMaterial({ color: '#5a1d24' })); mouth.position.set(0, -0.11, 0.225); mouth.scale.set(1.1, 0.15, 0.4); head.add(mouth);
  // hair
  if (P.hairStyle === 'short' || P.hairStyle === 'long') {
    const cap = inked(new THREE.SphereGeometry(0.275, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0.03); cap.position.y = 0.02; cap.rotation.x = -0.25; head.add(cap);
    const fringe = inked(new THREE.SphereGeometry(0.12, 16, 10), hairM, 0.05); fringe.position.set(0.06, 0.2, 0.17); fringe.scale.set(1.6, 0.5, 0.8); head.add(fringe);
    if (P.hairStyle === 'long') { const back = inked(new THREE.CapsuleGeometry(0.2, 0.3, 6, 16), hairM, 0.03); back.position.set(0, -0.12, -0.12); back.scale.set(1.25, 1, 0.6); head.add(back); }
  }
  if (P.hairStyle === 'bald') { const fr = inked(new THREE.TorusGeometry(0.2, 0.05, 10, 30, Math.PI), hairM, 0.05); fr.rotation.set(0, 0, Math.PI); fr.position.set(0, 0.02, -0.06); head.add(fr); }
  if (P.hairStyle === 'cap') { const c = inked(new THREE.CylinderGeometry(0.27, 0.27, 0.12, 28), toon('#1d2b66'), 0.03); c.position.y = 0.2; head.add(c); const v = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.18), toon('#111')); v.position.set(0, 0.15, 0.25); head.add(v); }
  if (P.robe) { const robe = inked(new THREE.ConeGeometry(0.34, 0.95, 24, 1, true), toon('#121018', { side: THREE.DoubleSide }), 0.02); robe.position.y = 0.68; body.add(robe); }

  if (P.noEyes) { eyes.forEach(e => e.visible = false); pupils.forEach(p => p.visible = false); lids.forEach(l => l.visible = false); head.children.forEach(c => { if (c.material && c.geometry && (c.geometry.type === 'SphereGeometry' || c.geometry.type === 'CircleGeometry') && c.material.type === 'MeshBasicMaterial') c.visible = false; }); mouth.visible = false; }
  const api = { root, body, head, armL, armR, legL, legR, mouth, lids, pupils, brows, hands,
    pose: 'idle', talk: 0, mood: 'neutral', look: [0, 0] };
  api.update = (t, o = {}) => {
    const pose = o.pose || api.pose, talk = o.talk ?? api.talk, mood = o.mood || api.mood;
    const breathe = Math.sin(t * 2.2) * 0.012; body.position.y = breathe; head.rotation.set(0.05 * Math.sin(t * 1.3), 0.12 * Math.sin(t * 0.7) + (o.headTurn || 0), 0.04 * Math.sin(t * 0.9));
    // limbs by pose
    let aL = [0.1, 0, 0.12], aR = [0.1, 0, -0.12], lL = 0, lR = 0;
    if (pose === 'point') aR = [-1.35 + 0.05 * Math.sin(t * 3), 0.2, -0.35];
    if (pose === 'phone') aR = [-1.7, 0.45, -0.45];
    if (pose === 'shrug') { aL = [-0.4, 0, 0.9 + 0.1 * Math.sin(t * 4)]; aR = [-0.4, 0, -0.9 - 0.1 * Math.sin(t * 4)]; }
    if (pose === 'explain') { aL = [-0.7 + 0.25 * Math.sin(t * 3.1), 0, 0.35]; aR = [-0.9 + 0.25 * Math.sin(t * 2.7 + 1), 0, -0.4]; }
    if (pose === 'surprised') { aL = [-0.3, 0, 0.6]; aR = [-0.3, 0, -0.6]; }
    if (pose === 'walk') { const s = Math.sin(t * 7); aL = [0.5 * s, 0, 0.1]; aR = [-0.5 * s, 0, -0.1]; lL = -0.5 * s; lR = 0.5 * s; body.position.y = Math.abs(Math.cos(t * 7)) * 0.03; }
    if (pose === 'hold') aR = [-1.15, 0.25, -0.2];
    if (pose === 'sit' || pose === 'sitworried') { lL = -1.45; lR = -1.45; body.position.y = breathe - 0.36; aL = [-0.25, 0, 0.15]; aR = [-0.25, 0, -0.15]; }
    if (pose === 'gavel') aR = [-1.1 - 0.5 * Math.max(0, Math.sin(t * 6)), 0, -0.2];
    armL.rotation.set(...aL); armR.rotation.set(...aR); legL.rotation.x = lL; legR.rotation.x = lR;
    // face
    const blink = (t % 3.7) < 0.12 ? 1 : 0; lids.forEach(l => l.rotation.x = -Math.PI / 2 - (blink ? 0 : 1.2) - (mood === 'surprised' ? 0.35 : 0));
    const open = talk > 0 ? (0.25 + 0.75 * Math.abs(Math.sin(t * 13) * Math.sin(t * 7.3))) * talk : 0;
    mouth.scale.set(mood === 'happy' ? 1.6 : mood === 'surprised' ? 0.9 : 1.1, 0.15 + open * 0.9 + (mood === 'surprised' ? 0.9 : 0), 0.4);
    brows.forEach(b => { const sx = b.userData.sx; b.position.y = 0.15 + (mood === 'surprised' ? 0.04 : mood === 'angry' ? -0.015 : 0); b.rotation.z = mood === 'angry' ? sx * 0.35 : mood === 'worried' ? -sx * 0.3 : 0; });
    pupils.forEach((p, i) => { p.position.x = (i ? 0.09 : -0.09) + (o.look ? o.look[0] : 0) * 0.02; p.position.y = 0.045 + (o.look ? o.look[1] : 0) * 0.015; });
  };
  return api;
}
