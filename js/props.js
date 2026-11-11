// Procedural props: trend-buffet food, air fryers, maker-space machines and tools.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { label } from './textures.js';
import { HEX } from './palette.js';

const matCache = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.55, metalness: o.m ?? 0.0, emissive: o.e ? new THREE.Color(o.e) : new THREE.Color(0), emissiveIntensity: o.ei ?? 1, transparent: !!o.opacity, opacity: o.opacity ?? 1 }));
  return matCache.get(key);
}
export const glow = (color, i = 2) => mat(color, { e: color, ei: i, r: 0.4 });
const M = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };
const box = (w, h, d, r = 0.04) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));

// ---------------- FOOD ----------------
// a real-looking taco: a folded corn tortilla (toasted spots, charred rim) with al pastor, onion, cilantro, pineapple, salsa
let tortillaTex = null;
function tortillaTexture() {
  if (tortillaTex) return tortillaTex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#e8b64a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${150 + Math.random() * 60},${90 + Math.random() * 40},20,${0.08 + Math.random() * 0.15})`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 45; i++) { g.fillStyle = `rgba(70,35,10,${0.25 + Math.random() * 0.35})`; g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 7, 1.5 + Math.random() * 4, Math.random() * 3, 0, 7); g.fill(); }
  const rim = g.createRadialGradient(128, 128, 90, 128, 128, 128); rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(90,45,10,0.55)'); g.fillStyle = rim; g.fillRect(0, 0, 256, 256);
  tortillaTex = new THREE.CanvasTexture(c); tortillaTex.colorSpace = THREE.SRGBColorSpace;
  return tortillaTex;
}
function taco(fill = 'pastor') {
  const g = new THREE.Group();
  const R = 0.16, Rf = R * 0.78;
  // fold a disc into a U: v across the disc becomes an angle around the spine (x axis)
  // a fine grid squashed onto the disc bends smoothly
  const grid = new THREE.PlaneGeometry(2 * R, 2 * R, 30, 30), gp = grid.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    let x = gp.getX(i), v = gp.getY(i);
    const d = Math.hypot(x, v); if (d > R) { x *= R / d; v *= R / d; }          // squash the grid onto the disc
    const phi = v / Rf;
    gp.setXYZ(i, x * (1 - 0.15 * Math.abs(Math.sin(phi))), Rf * (1 - Math.cos(phi)), Rf * Math.sin(phi));
  }
  grid.computeVertexNormals();
  const shell = new THREE.Mesh(grid, new THREE.MeshStandardMaterial({ map: tortillaTexture(), emissiveMap: tortillaTexture(), emissive: '#8a5a1c', emissiveIntensity: 0.55, roughness: 0.75, side: THREE.DoubleSide }));
  g.add(shell);
  const meatC = { pastor: ['#c4541c', '#a8401a', '#d9692a'], birria: ['#7a2a14', '#8e3418', '#6a2210'], fish: ['#f4e1c1', '#e9caa0', '#d8a868'] }[fill];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const inside = (y) => { const w = Rf * Math.sin(Math.acos(Math.max(-1, 1 - y / Rf))) * 0.75; return rnd(-w, w); };
  const piece = (geo, color, n, y0, y1, s0, s1, rough = 0.7) => {
    const m = mat(color, { r: rough });
    for (let i = 0; i < n; i++) {
      const y = rnd(y0, y1), o = new THREE.Mesh(geo, m);
      o.position.set(rnd(-R * 0.75, R * 0.75), y, inside(y)); o.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3)); o.scale.setScalar(rnd(s0, s1));
      g.add(o);
    }
  };
  const chunk = new THREE.DodecahedronGeometry(0.018, 0);
  meatC.forEach(c => piece(chunk, c, 9, 0.015, 0.07, 0.8, 1.4, 0.55));
  piece(new THREE.BoxGeometry(0.008, 0.008, 0.008), '#f6f2ea', 26, 0.06, 0.09, 0.8, 1.3, 0.4);     // onion
  piece(new THREE.CircleGeometry(0.009, 5), '#2f9a3a', 22, 0.07, 0.1, 0.8, 1.6, 0.6);               // cilantro
  if (fill !== 'fish') piece(new THREE.BoxGeometry(0.014, 0.014, 0.014), '#ffd23a', 6, 0.06, 0.085, 0.8, 1.2, 0.35); // pineapple
  else { piece(new THREE.BoxGeometry(0.03, 0.004, 0.012), '#b8d8f0', 10, 0.07, 0.09, 0.8, 1.2, 0.6); }                // cabbage
  // salsa verde drizzle along the top
  const pts = []; for (let i = 0; i <= 10; i++) { const x = -R * 0.7 + i / 10 * R * 1.4; pts.push(new THREE.Vector3(x, 0.095 + Math.sin(i * 1.7) * 0.006, Math.sin(i * 2.3) * 0.02)); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.004, 5), mat(fill === 'birria' ? '#c8241a' : '#5fae2e', { r: 0.25 })));
  // lime wedge
  const lime = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8, 0, Math.PI, 0, Math.PI / 2), mat('#7cc242', { r: 0.4 }));
  lime.position.set(R * 0.95, 0.01, 0.05); lime.rotation.set(Math.PI / 2, 0, 0.4); g.add(lime);
  return g;
}
function nigiri(fish = '#ff8a5c') {
  const g = new THREE.Group();
  g.add(M(box(0.16, 0.06, 0.08, 0.03), mat('#fbf7ef', { r: 0.9 }), 0, 0.03, 0));
  const f = M(box(0.18, 0.025, 0.09, 0.012), mat(fish, { r: 0.35 }), 0, 0.07, 0); f.rotation.z = 0.05; g.add(f);
  for (let i = -2; i <= 2; i++) g.add(M(new THREE.BoxGeometry(0.004, 0.027, 0.092), mat('#ffffff', { opacity: 0.6 }), i * 0.03, 0.071, 0));
  return g;
}
function maki(center = '#ff6caf') {
  const g = new THREE.Group();
  g.add(M(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 16), mat('#1e2b1a'), 0, 0.025, 0));
  g.add(M(new THREE.CylinderGeometry(0.04, 0.04, 0.052, 16), mat('#fbf7ef'), 0, 0.026, 0));
  g.add(M(new THREE.CylinderGeometry(0.015, 0.015, 0.054, 8), mat(center), 0, 0.027, 0));
  return g;
}
function bowl(inner, top, extras = []) {
  const g = new THREE.Group();
  const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.06 + Math.sin(t * Math.PI / 2) * 0.12, t * 0.12)); }
  const b = M(new THREE.LatheGeometry(pts, 24), mat(inner, { r: 0.3 })); b.material.side = THREE.DoubleSide; g.add(b);
  g.add(M(new THREE.CircleGeometry(0.17, 24).rotateX(-Math.PI / 2), mat(top, { r: 0.3 }), 0, 0.105, 0));
  extras.forEach(e => g.add(e));
  return g;
}
function ramen() {
  const egg = new THREE.Group();
  egg.add(M(new THREE.SphereGeometry(0.04, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#fff8ec')));
  egg.add(M(new THREE.CircleGeometry(0.022, 12).rotateX(-Math.PI / 2), mat('#ff9d00', { e: '#ff9d00', ei: 0.2 }), 0, 0.001, 0));
  egg.position.set(0.05, 0.11, 0.03);
  const nori = M(new THREE.BoxGeometry(0.1, 0.13, 0.005), mat('#14261a'), -0.08, 0.15, -0.05); nori.rotation.x = -0.3;
  const noodles = new THREE.Group();
  for (let i = 0; i < 6; i++) { const n = M(new THREE.TorusGeometry(0.05 + i * 0.008, 0.006, 4, 20, Math.PI), mat('#f6d87a')); n.rotation.x = -Math.PI / 2; n.rotation.z = i; n.position.y = 0.11; noodles.add(n); }
  const pork = M(new THREE.CylinderGeometry(0.045, 0.045, 0.015, 16), mat('#d79a76'), -0.04, 0.112, 0.06);
  return bowl('#e8112d', '#e2a35b', [egg, nori, noodles, pork]);
}
function poke() {
  const ex = [];
  const cs = ['#ff6c5c', '#a6ee70', '#ffbf00', '#ff6caf', '#ffffff'];
  for (let i = 0; i < 14; i++) ex.push(M(new THREE.BoxGeometry(0.035, 0.035, 0.035), mat(cs[i % cs.length]), Math.cos(i) * 0.09 * Math.random(), 0.12, Math.sin(i) * 0.09 * Math.random()));
  return bowl('#4c97ff', '#fbf7ef', ex);
}
function acai() {
  const ex = [];
  for (let i = 0; i < 5; i++) ex.push(M(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 12), mat('#fff3c4'), -0.08 + i * 0.035, 0.115, 0.04));
  for (let i = 0; i < 6; i++) ex.push(M(new THREE.SphereGeometry(0.014, 8, 6), mat('#2a1a6e'), Math.random() * 0.1 - 0.05, 0.115, -0.05 + Math.random() * 0.04));
  ex.push(M(new THREE.SphereGeometry(0.03, 10, 8), mat('#e8112d'), 0.08, 0.12, -0.04));
  return bowl('#fff3e0', '#5b1a6e', ex);
}
function boba(tea = '#c8a27a') {
  const g = new THREE.Group();
  g.add(M(new THREE.CylinderGeometry(0.07, 0.055, 0.22, 20, 1, true), mat('#ffffff', { opacity: 0.25, r: 0.1 }), 0, 0.11, 0));
  g.add(M(new THREE.CylinderGeometry(0.066, 0.054, 0.19, 20), mat(tea, { r: 0.4 }), 0, 0.095, 0));
  for (let i = 0; i < 16; i++) g.add(M(new THREE.SphereGeometry(0.012, 8, 6), mat('#1b0d08', { r: 0.2 }), Math.cos(i * 2.4) * 0.04, 0.015 + (i % 3) * 0.014, Math.sin(i * 2.4) * 0.04));
  const straw = M(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 10), glow(HEX.pink, 0.6), 0.02, 0.24, 0); straw.rotation.z = 0.15; g.add(straw);
  g.add(M(new THREE.CylinderGeometry(0.072, 0.072, 0.005, 20), mat('#ffffff', { opacity: 0.5 }), 0, 0.222, 0));
  return g;
}
function burger() {
  const g = new THREE.Group();
  g.add(M(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 20), mat('#e0a24d'), 0, 0.02, 0));
  g.add(M(new THREE.CylinderGeometry(0.11, 0.105, 0.035, 20), mat('#4a2414', { r: 0.9 }), 0, 0.058, 0));
  const ch = M(new THREE.BoxGeometry(0.17, 0.01, 0.17), mat('#ffbf00', { e: '#ff9d00', ei: 0.15 }), 0, 0.08, 0); ch.rotation.y = 0.7; g.add(ch);
  g.add(M(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 20), mat('#67da5e'), 0, 0.09, 0));
  g.add(M(new THREE.SphereGeometry(0.105, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e7a14a', { r: 0.6 }), 0, 0.095, 0));
  return g;
}
function dubai() {
  const g = new THREE.Group();
  const a = M(box(0.24, 0.035, 0.12, 0.01), mat('#4a2414', { r: 0.35 }), -0.07, 0.02, 0); a.rotation.y = 0.15; g.add(a);
  const b = M(box(0.12, 0.035, 0.12, 0.01), mat('#4a2414', { r: 0.35 }), 0.13, 0.04, 0.02); b.rotation.set(0, -0.3, 0.35); g.add(b);
  const f = M(new THREE.BoxGeometry(0.004, 0.028, 0.11), mat('#7fc24a', { e: '#67da5e', ei: 0.25 }), 0.07, 0.04, 0.02); f.rotation.set(0, -0.3, 0.35); g.add(f);
  for (let i = 0; i < 5; i++) g.add(M(new THREE.SphereGeometry(0.008, 6, 4), mat('#8ccf54'), 0.05 + Math.random() * 0.04, 0.01, -0.07 + Math.random() * 0.14));
  return g;
}
function croissant() {
  const g = new THREE.Group();
  const t = M(new THREE.TorusGeometry(0.1, 0.045, 10, 16, Math.PI * 1.1), mat('#d98b2b', { r: 0.5 }));
  t.rotation.x = -Math.PI / 2; t.position.y = 0.04; t.scale.set(1, 1, 0.8); g.add(t);
  for (let i = 0; i < 4; i++) { const r = M(new THREE.TorusGeometry(0.1, 0.048, 6, 4, 0.12), mat('#b5651d')); r.rotation.x = -Math.PI / 2; r.rotation.z = 0.35 + i * 0.75; r.position.y = 0.04; g.add(r); }
  return g;
}
function donut(glaze = '#ff6caf') {
  const g = new THREE.Group();
  const d = M(new THREE.TorusGeometry(0.07, 0.035, 12, 24), mat('#e4a35a')); d.rotation.x = -Math.PI / 2; d.position.y = 0.035; g.add(d);
  const top = M(new THREE.TorusGeometry(0.07, 0.036, 12, 24, Math.PI * 2), mat(glaze, { r: 0.25 })); top.rotation.x = -Math.PI / 2; top.position.y = 0.045; top.scale.z = 0.6; g.add(top);
  const cs = [HEX.lime, HEX.amber, '#ffffff', HEX.blue];
  for (let i = 0; i < 18; i++) { const a = i * 0.35, r = 0.07 + (Math.random() - 0.5) * 0.04; const s = M(new THREE.CapsuleGeometry(0.004, 0.012, 2, 4), mat(cs[i % 4])); s.position.set(Math.cos(a) * r, 0.072, Math.sin(a) * r); s.rotation.set(Math.PI / 2, 0, Math.random() * 3); g.add(s); }
  return g;
}
function matcha() {
  const g = new THREE.Group();
  g.add(M(new THREE.CylinderGeometry(0.075, 0.06, 0.12, 20), mat('#ffffff', { opacity: 0.3, r: 0.05 }), 0, 0.06, 0));
  g.add(M(new THREE.CylinderGeometry(0.07, 0.058, 0.07, 20), mat('#f1ead8'), 0, 0.035, 0));
  g.add(M(new THREE.CylinderGeometry(0.072, 0.07, 0.04, 20), mat('#7cbf3c', { e: '#4b8a1a', ei: 0.3 }), 0, 0.09, 0));
  return g;
}
function cornDog() {
  const g = new THREE.Group();
  const c = M(new THREE.CapsuleGeometry(0.04, 0.16, 6, 12), mat('#e8a33a', { r: 0.9 }), 0, 0.2, 0); g.add(c);
  for (let i = 0; i < 10; i++) g.add(M(new THREE.BoxGeometry(0.02, 0.02, 0.02), mat('#f6c35b'), Math.cos(i) * 0.04, 0.13 + i * 0.016, Math.sin(i) * 0.04));
  g.add(M(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), mat('#e6cfa0'), 0, 0.06, 0));
  const zig = M(new THREE.TorusGeometry(0.03, 0.006, 4, 12, Math.PI * 4), mat('#e8112d'), 0, 0.29, 0.03); zig.rotation.y = 0.5; g.add(zig);
  return g;
}
function hotChicken() {
  const g = new THREE.Group();
  g.add(M(new THREE.BoxGeometry(0.2, 0.012, 0.2), mat('#fff3e0'), 0, 0.006, 0));
  const ch = M(new THREE.DodecahedronGeometry(0.075, 1), mat('#c4361a', { r: 0.95, e: '#e8112d', ei: 0.12 }), 0, 0.07, 0); ch.scale.set(1.3, 0.7, 1); g.add(ch);
  for (let i = 0; i < 4; i++) g.add(M(new THREE.CylinderGeometry(0.025, 0.025, 0.006, 10), mat('#a6ee70'), -0.06 + i * 0.035, 0.13, 0));
  return g;
}

export const FOODS = [
  { key: 'taco', name: 'Al Pastor Tacos', make: () => { const g = new THREE.Group(); [-0.34, 0, 0.34].forEach((x, i) => { const t = taco(['pastor', 'birria', 'fish'][i]); t.position.x = x; t.rotation.y = (i - 1) * 0.15; g.add(t); }); return g; } },
  { key: 'birria', name: 'Birria + Consommé', make: () => { const g = new THREE.Group(); const t = taco('birria'); t.position.x = -0.1; g.add(t); const b = bowl('#fff3e0', '#a8341a'); b.scale.setScalar(0.6); b.position.x = 0.15; g.add(b); return g; } },
  { key: 'sushi', name: 'Sushi Boat', make: () => { const g = new THREE.Group(); const boat = M(box(0.7, 0.06, 0.25, 0.03), mat('#8a5a2b', { r: 0.7 }), 0, 0.03, 0); g.add(boat); const fishes = ['#ff8a5c', '#ff6caf', '#ffd2a8', '#e8112d']; for (let i = 0; i < 4; i++) { const n = nigiri(fishes[i]); n.position.set(-0.25 + i * 0.16, 0.06, -0.05); g.add(n); } for (let i = 0; i < 5; i++) { const m = maki([HEX.pink, HEX.lime, HEX.amber, HEX.orange, HEX.pink][i]); m.position.set(-0.26 + i * 0.13, 0.06, 0.07); g.add(m); } return g; } },
  { key: 'ramen', name: 'Tonkotsu Ramen', make: ramen },
  { key: 'boba', name: 'Brown Sugar Boba', make: () => { const g = new THREE.Group(); ['#c8a27a', '#e9a6c9', '#9fd47a'].forEach((c, i) => { const b = boba(c); b.position.x = -0.18 + i * 0.18; g.add(b); }); return g; } },
  { key: 'burger', name: 'Smash Burger', make: burger },
  { key: 'dubai', name: 'Dubai Chocolate', make: dubai },
  { key: 'croissant', name: 'Croissant', make: croissant },
  { key: 'donut', name: 'Mochi Donuts', make: () => { const g = new THREE.Group(); [HEX.pink, '#7cbf3c', '#c442dc'].forEach((c, i) => { const d = donut(c); d.position.set(-0.17 + i * 0.17, 0, (i % 2) * 0.05); g.add(d); }); return g; } },
  { key: 'matcha', name: 'Iced Matcha', make: matcha },
  { key: 'poke', name: 'Poke Bowl', make: poke },
  { key: 'acai', name: 'Açaí Bowl', make: acai },
  { key: 'corndog', name: 'Korean Corn Dog', make: cornDog },
  { key: 'hotchicken', name: 'Nashville Hot', make: hotChicken },
];

// ---------------- AIR FRYER ----------------
export function airFryer(color = '#16121f', accent = HEX.amber) {
  const g = new THREE.Group();
  g.add(M(box(0.36, 0.42, 0.38, 0.09), mat(color, { r: 0.25, m: 0.2 }), 0, 0.21, 0));
  g.add(M(box(0.3, 0.18, 0.04, 0.03), mat('#0c0a12', { r: 0.2 }), 0, 0.14, 0.18));
  g.add(M(box(0.12, 0.03, 0.06, 0.012), mat('#2a2633', { r: 0.3, m: 0.6 }), 0, 0.14, 0.22));
  const disp = label('400°F', 0.06, { font: 'JetBrains Mono', color: accent, glow: accent, size: 64 });
  disp.position.set(0, 0.34, 0.191); g.add(disp);
  g.add(M(new THREE.TorusGeometry(0.05, 0.008, 6, 24), glow(accent, 1.8), 0.0, 0.34, 0.19));
  g.userData.display = disp;
  return g;
}

// ---------------- SHOP: tools and machines ----------------
export function workbench(w = 3) {
  const g = new THREE.Group();
  g.add(M(box(w, 0.08, 1, 0.02), mat('#a8743f', { r: 0.7 }), 0, 0.92, 0));
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) for (const z of [-0.4, 0.4]) g.add(M(new THREE.BoxGeometry(0.08, 0.9, 0.08), mat('#3a2a55'), x, 0.45, z));
  g.add(M(new THREE.BoxGeometry(w - 0.2, 0.04, 0.9), mat('#2a1f40'), 0, 0.3, 0));
  // vise
  const v = new THREE.Group(); v.add(M(box(0.25, 0.15, 0.2), mat(HEX.blue, { m: 0.5, r: 0.4 }), 0, 0.075, 0)); v.add(M(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8).rotateX(Math.PI / 2), mat('#bbb', { m: 0.9, r: 0.3 }), 0, 0.07, 0.2));
  v.position.set(w / 2 - 0.3, 0.96, 0.3); g.add(v);
  return g;
}

export function tableSaw() {
  const g = new THREE.Group();
  g.add(M(box(1.4, 0.85, 1.0), mat('#2c2238'), 0, 0.42, 0));
  g.add(M(new THREE.BoxGeometry(1.6, 0.05, 1.2), mat('#b8b8c8', { m: 0.8, r: 0.35 }), 0, 0.87, 0));
  const blade = M(new THREE.CylinderGeometry(0.18, 0.18, 0.01, 32).rotateZ(Math.PI / 2), mat('#d8d8e8', { m: 1, r: 0.2 }), 0, 0.9, 0); blade.position.y = 0.8;
  g.add(blade); g.userData.blade = blade;
  g.add(M(box(0.3, 0.2, 0.05), mat(HEX.amber), 0, 0.55, 0.52));
  return g;
}

export function drillPress() {
  const g = new THREE.Group();
  g.add(M(box(0.6, 0.08, 0.5), mat('#333048', { m: 0.4 }), 0, 0.04, 0));
  g.add(M(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 12), mat('#9ea0b8', { m: 0.9, r: 0.3 }), 0, 0.95, -0.15));
  g.add(M(box(0.4, 0.05, 0.4), mat('#555070', { m: 0.5 }), 0, 0.8, 0.05));
  g.add(M(box(0.35, 0.35, 0.6, 0.06), mat(HEX.red, { r: 0.4 }), 0, 1.7, 0));
  g.add(M(new THREE.CylinderGeometry(0.01, 0.005, 0.25, 6), mat('#eee', { m: 1, r: 0.2 }), 0, 1.4, 0.15));
  return g;
}

export function anvil() {
  const g = new THREE.Group();
  g.add(M(new THREE.CylinderGeometry(0.25, 0.3, 0.6, 10), mat('#5a3a22', { r: 0.9 }), 0, 0.3, 0));
  g.add(M(box(0.7, 0.2, 0.25, 0.03), mat('#2b2b33', { m: 0.9, r: 0.35 }), 0, 0.82, 0));
  g.add(M(box(0.3, 0.15, 0.18, 0.02), mat('#2b2b33', { m: 0.9, r: 0.35 }), 0, 0.65, 0));
  const horn = M(new THREE.ConeGeometry(0.1, 0.4, 10).rotateZ(Math.PI / 2), mat('#2b2b33', { m: 0.9, r: 0.35 }), 0.5, 0.85, 0); g.add(horn);
  return g;
}

export function laserCutter() {
  const g = new THREE.Group();
  g.add(M(box(2.2, 0.95, 1.3), mat('#f2eef8', { r: 0.4 }), 0, 0.475, 0));
  g.add(M(box(2.1, 0.06, 1.2), mat('#1a1428'), 0, 0.98, 0));
  // lid hinged at the back and propped open so you can watch the cut
  const hinge = new THREE.Group(); hinge.position.set(0, 1.0, -0.65); hinge.rotation.x = -1.15; g.add(hinge);
  const lid = M(box(2.2, 0.12, 1.3), mat(HEX.orange, { opacity: 0.4, r: 0.1, e: HEX.orange, ei: 0.3 }), 0, 0.06, 0.65); hinge.add(lid);
  const gantry = M(new THREE.BoxGeometry(0.06, 0.06, 1.1), mat('#888', { m: 0.8 }), 0, 1.05, 0); g.add(gantry);
  const head = M(new THREE.BoxGeometry(0.1, 0.1, 0.1), mat('#333'), 0, 1.05, 0); g.add(head);
  const dot = M(new THREE.SphereGeometry(0.025, 8, 6), glow('#ff2040', 8), 0, 1.0, 0); g.add(dot);
  // a glowing cut path appears on the bed
  const trail = M(new THREE.PlaneGeometry(1.8, 1.0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3050, transparent: true, opacity: 0, toneMapped: false }), 0, 1.015, 0);
  g.add(trail);
  g.userData = { gantry, head, dot };
  return g;
}

export function waterjet() {
  const g = new THREE.Group();
  g.add(M(box(3, 0.9, 2, 0.05), mat('#2a3a6a', { m: 0.3 }), 0, 0.45, 0));
  g.add(M(new THREE.BoxGeometry(2.8, 0.05, 1.8), mat(HEX.aqua, { opacity: 0.7, r: 0.05, e: '#0b3a7a', ei: 0.6 }), 0, 0.88, 0));
  const rail = M(new THREE.BoxGeometry(3, 0.12, 0.12), mat('#c8c8d8', { m: 0.8 }), 0, 1.9, 0); g.add(rail);
  for (const x of [-1.45, 1.45]) g.add(M(new THREE.BoxGeometry(0.12, 1.1, 0.12), mat('#c8c8d8', { m: 0.8 }), x, 1.35, 0));
  const nozzle = M(new THREE.CylinderGeometry(0.05, 0.02, 0.8, 10), mat('#ffbf00', { m: 0.5 }), 0, 1.45, 0); g.add(nozzle);
  const jet = M(new THREE.CylinderGeometry(0.01, 0.02, 0.6, 6), glow('#bff8ff', 4), 0, 0.85, 0); g.add(jet);
  g.userData = { nozzle, jet, rail };
  return g;
}

export function printer3d(color = HEX.lime) {
  const g = new THREE.Group();
  g.add(M(box(0.6, 0.08, 0.6), mat('#22202c'), 0, 0.04, 0));
  for (const [x, z] of [[-0.27, -0.27], [0.27, -0.27]]) g.add(M(new THREE.BoxGeometry(0.04, 0.8, 0.04), mat('#444'), x, 0.44, z));
  g.add(M(new THREE.BoxGeometry(0.6, 0.04, 0.04), mat('#444'), 0, 0.84, -0.27));
  const head = M(box(0.1, 0.1, 0.1, 0.02), mat(color, { e: color, ei: 0.5 }), 0, 0.3, 0); g.add(head);
  const part = M(new THREE.CylinderGeometry(0.1, 0.12, 0.01, 6), mat(color, { r: 0.5 }), 0, 0.09, 0); g.add(part);
  g.userData = { head, part };
  return g;
}

// microcontroller programming station: desk + monitor + board with blinking LEDs + alligator clips to a banana
export function mcuStation(screenMat) {
  const g = new THREE.Group();
  g.add(M(box(2, 0.06, 0.9, 0.02), mat('#3a2f5c'), 0, 0.9, 0));
  for (const x of [-0.9, 0.9]) g.add(M(new THREE.BoxGeometry(0.06, 0.9, 0.8), mat('#2a1f40'), x, 0.45, 0));
  const mon = new THREE.Group();
  mon.add(M(box(1.1, 0.68, 0.05, 0.02), mat('#0c0a12'), 0, 0, 0));
  const scr = M(new THREE.PlaneGeometry(1.02, 0.6), screenMat, 0, 0, 0.03); mon.add(scr);
  mon.add(M(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), mat('#333'), 0, -0.45, -0.05));
  mon.position.set(-0.3, 1.38, -0.25); g.add(mon);
  // board
  const board = M(box(0.4, 0.02, 0.28, 0.01), mat('#c4161c', { r: 0.5 }), 0.55, 0.94, 0.05); g.add(board);
  const leds = [];
  for (let i = 0; i < 6; i++) { const l = M(new THREE.SphereGeometry(0.012, 6, 4), glow([HEX.lime, HEX.amber, HEX.pink][i % 3], 0), 0.42 + i * 0.05, 0.96, -0.05); g.add(l); leds.push(l); }
  // alligator clips to a banana: the Makey Makey move
  const banana = M(new THREE.TorusGeometry(0.12, 0.035, 8, 16, Math.PI * 0.8), mat('#ffd84a', { r: 0.6 }), 0.6, 0.97, 0.32); banana.rotation.set(-Math.PI / 2, 0, 0.3); g.add(banana);
  const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.62, 0.95, 0.1), new THREE.Vector3(0.75, 1.05, 0.2), new THREE.Vector3(0.68, 0.98, 0.3)]), 12, 0.006, 6), mat(HEX.lime));
  g.add(wire);
  g.add(M(box(0.45, 0.02, 0.15), mat('#1a1a22'), -0.3, 0.94, 0.25)); // keyboard
  g.userData = { leds, screen: scr };
  return g;
}

// silhouette tools for pegboards
export function pegTool(kind, color) {
  const m = glow(color, 0.9);
  const g = new THREE.Group();
  if (kind === 'hammer') { g.add(M(new THREE.BoxGeometry(0.05, 0.4, 0.03), mat('#a8743f'), 0, -0.1, 0)); g.add(M(new THREE.BoxGeometry(0.22, 0.07, 0.05), m, 0, 0.12, 0)); }
  else if (kind === 'wrench') { g.add(M(new THREE.BoxGeometry(0.05, 0.42, 0.02), m)); g.add(M(new THREE.TorusGeometry(0.05, 0.018, 6, 12, Math.PI * 1.5), m, 0, 0.23, 0)); }
  else if (kind === 'saw') { const s = M(new THREE.BoxGeometry(0.45, 0.14, 0.01), mat('#ddd', { m: 0.9, r: 0.3 }), 0.1, 0, 0); g.add(s); g.add(M(box(0.12, 0.16, 0.04), m, -0.18, 0, 0)); }
  else if (kind === 'pliers') { const a = M(new THREE.BoxGeometry(0.03, 0.32, 0.02), m, -0.02, 0, 0); a.rotation.z = 0.12; const b = a.clone(); b.position.x = 0.02; b.rotation.z = -0.12; g.add(a, b); }
  else if (kind === 'screwdriver') { g.add(M(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8), m, 0, 0.1, 0)); g.add(M(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 6), mat('#ccc', { m: 1 }), 0, -0.07, 0)); }
  else if (kind === 'iron') { g.add(M(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), m, 0, 0.05, 0)); g.add(M(new THREE.ConeGeometry(0.01, 0.12, 6).rotateX(Math.PI), mat('#ddd', { m: 1 }), 0, -0.1, 0)); }
  else if (kind === 'caliper') { g.add(M(new THREE.BoxGeometry(0.03, 0.4, 0.01), mat('#ccc', { m: 1 }))); g.add(M(new THREE.BoxGeometry(0.1, 0.03, 0.012), m, 0.04, 0.17, 0)); g.add(M(new THREE.BoxGeometry(0.1, 0.05, 0.015), m, 0.04, 0.0, 0)); }
  return g;
}
export const PEG_TOOLS = ['hammer', 'wrench', 'saw', 'pliers', 'screwdriver', 'iron', 'caliper'];

// ---- more shop gear ----
export function toolChest(color = HEX.red) {
  const g = new THREE.Group();
  g.add(M(box(1.2, 1.1, 0.6, 0.05), mat(color, { r: 0.3, m: 0.4 }), 0, 0.65, 0));
  for (let i = 0; i < 6; i++) { g.add(M(new THREE.BoxGeometry(1.1, 0.012, 0.01), mat('#111'), 0, 0.25 + i * 0.16, 0.305)); g.add(M(new THREE.BoxGeometry(0.5, 0.025, 0.04), mat('#ddd', { m: 1, r: 0.2 }), 0, 0.31 + i * 0.16, 0.32)); }
  for (const x of [-0.5, 0.5]) for (const z of [-0.22, 0.22]) g.add(M(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10).rotateZ(Math.PI / 2), mat('#222'), x, 0.05, z));
  g.add(M(box(1.25, 0.06, 0.65, 0.02), mat('#2a2a33', { m: 0.5 }), 0, 1.22, 0));
  return g;
}
export function robotArm() {
  const g = new THREE.Group();
  const orange = mat(HEX.orange, { r: 0.35, m: 0.3 });
  g.add(M(new THREE.CylinderGeometry(0.5, 0.6, 0.4, 20), mat('#2a2a33', { m: 0.6 }), 0, 0.2, 0));
  const yawJ = new THREE.Group(); yawJ.position.y = 0.4; g.add(yawJ);
  yawJ.add(M(new THREE.CylinderGeometry(0.38, 0.38, 0.5, 16), orange, 0, 0.25, 0));
  const shoulder = new THREE.Group(); shoulder.position.y = 0.55; yawJ.add(shoulder);
  shoulder.add(M(box(0.35, 1.6, 0.35, 0.08), orange, 0, 0.8, 0));
  const elbow = new THREE.Group(); elbow.position.y = 1.6; shoulder.add(elbow);
  elbow.add(M(new THREE.CylinderGeometry(0.22, 0.22, 0.45, 16).rotateZ(Math.PI / 2), mat('#2a2a33', { m: 0.6 })));
  elbow.add(M(box(0.28, 1.3, 0.28, 0.07), orange, 0, 0.65, 0));
  const wrist = new THREE.Group(); wrist.position.y = 1.3; elbow.add(wrist);
  wrist.add(M(new THREE.CylinderGeometry(0.12, 0.15, 0.3, 12), mat('#ccc', { m: 0.9, r: 0.2 }), 0, 0.15, 0));
  const tip = M(new THREE.SphereGeometry(0.07, 8, 6), glow(HEX.lime, 4), 0, 0.35, 0); wrist.add(tip);
  g.userData = { yawJ, shoulder, elbow, wrist, tip };
  return g;
}
export function cncRouter() {
  const g = new THREE.Group();
  g.add(M(box(2.6, 0.8, 1.8, 0.04), mat('#3a3f5c', { m: 0.4 }), 0, 0.4, 0));
  g.add(M(new THREE.BoxGeometry(2.4, 0.05, 1.6), mat('#c8a070', { r: 0.9 }), 0, 0.83, 0));
  const gantry = new THREE.Group();
  for (const z of [-0.85, 0.85]) gantry.add(M(new THREE.BoxGeometry(0.12, 0.7, 0.12), mat(HEX.blue, { m: 0.5 }), 0, 1.15, z));
  gantry.add(M(new THREE.BoxGeometry(0.15, 0.15, 1.8), mat(HEX.blue, { m: 0.5 }), 0, 1.5, 0));
  const spindle = M(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12), mat('#ddd', { m: 0.9 }), 0, 1.2, 0); gantry.add(spindle);
  g.add(gantry);
  g.userData = { gantry, spindle };
  return g;
}
export function bandsaw() {
  const g = new THREE.Group();
  g.add(M(box(0.6, 0.9, 0.6, 0.04), mat('#2a2a33'), 0, 0.45, 0));
  g.add(M(box(0.7, 1.4, 0.35, 0.12), mat(HEX.lime, { r: 0.4 }), 0, 1.6, 0));
  g.add(M(new THREE.BoxGeometry(0.8, 0.04, 0.8), mat('#bbb', { m: 0.9, r: 0.3 }), 0, 1.0, 0.15));
  g.add(M(new THREE.BoxGeometry(0.01, 0.4, 0.01), mat('#eee', { m: 1 }), 0.1, 1.2, 0.2));
  return g;
}
export function lumberRack() {
  const g = new THREE.Group();
  for (const x of [-1.4, 0, 1.4]) g.add(M(new THREE.BoxGeometry(0.1, 3, 0.1), mat('#444', { m: 0.6 }), x, 1.5, 0));
  const woods = ['#e3b77a', '#c8955a', '#a9733f', '#f0d0a0', '#d8a46a'];
  for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) g.add(M(new THREE.BoxGeometry(3.2, 0.05, 0.6), mat(woods[(i + k) % 5], { r: 0.9 }), 0, 0.4 + i * 0.6 + k * 0.06, 0.05));
  return g;
}
export function partsShelf() {
  const g = new THREE.Group();
  for (let s = 0; s < 4; s++) g.add(M(new THREE.BoxGeometry(2, 0.05, 0.5), mat('#555070', { m: 0.4 }), 0, 0.3 + s * 0.6, 0));
  for (const x of [-1, 1]) g.add(M(new THREE.BoxGeometry(0.06, 2.3, 0.5), mat('#555070'), x, 1.15, 0));
  for (let s = 0; s < 4; s++) for (let b = 0; b < 5; b++) g.add(M(box(0.34, 0.25, 0.4, 0.03), mat(NEON_BINS[(s + b) % NEON_BINS.length], { r: 0.5 }), -0.76 + b * 0.38, 0.45 + s * 0.6, 0));
  return g;
}
const NEON_BINS = [HEX.red, HEX.amber, HEX.blue, HEX.lime, HEX.pink, HEX.orange];
