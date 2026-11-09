// The shop, turned up: shadow-board pegboards packed with hundreds of tools, a row of laser cutters
// actually tracing shapes, and a 3D print farm actually growing prints layer by layer.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, glow, pegTool, laserCutter, printer3d } from './props.js';
import { HEX, NEON } from './palette.js';
import { canvas, tex } from './textures.js';

const M = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };

// ---------- more tools ----------
function tool(kind, color) {
  const g = new THREE.Group(), m = glow(color, 0.9), steel = mat('#cfd0dc', { m: 0.9, r: 0.25 }), wood = mat('#a8743f', { r: 0.7 }), dark = mat('#22202c', { r: 0.5 });
  switch (kind) {
    case 'tape': g.add(M(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16).rotateX(Math.PI / 2), m)); g.add(M(new THREE.BoxGeometry(0.03, 0.06, 0.02), steel, 0.1, -0.05, 0)); break;
    case 'clamp': { const c = M(new THREE.TorusGeometry(0.12, 0.02, 6, 16, Math.PI * 1.4), m); c.rotation.z = 0.8; g.add(c); g.add(M(new THREE.CylinderGeometry(0.01, 0.01, 0.26, 6), steel, 0.03, 0, 0)); g.add(M(new THREE.BoxGeometry(0.06, 0.03, 0.03), wood, 0.03, -0.15, 0)); break; }
    case 'mallet': g.add(M(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12).rotateZ(Math.PI / 2), m, 0, 0.14, 0)); g.add(M(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), wood, 0, -0.03, 0)); break;
    case 'file': g.add(M(new THREE.BoxGeometry(0.035, 0.3, 0.01), steel, 0, 0.04, 0)); g.add(M(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 8), m, 0, -0.16, 0)); break;
    case 'scissors': for (const s of [-1, 1]) { g.add(M(new THREE.TorusGeometry(0.04, 0.012, 6, 12), m, s * 0.035, -0.1, 0)); const b = M(new THREE.BoxGeometry(0.018, 0.2, 0.008), steel, s * 0.012, 0.05, 0); b.rotation.z = s * 0.12; g.add(b); } break;
    case 'gluegun': g.add(M(new RoundedBoxGeometry(0.2, 0.1, 0.05, 2, 0.02), m, 0, 0.05, 0)); g.add(M(new RoundedBoxGeometry(0.06, 0.14, 0.04, 2, 0.015), m, -0.05, -0.06, 0)); g.add(M(new THREE.ConeGeometry(0.015, 0.06, 6).rotateZ(-Math.PI / 2), steel, 0.13, 0.05, 0)); break;
    case 'multimeter': g.add(M(new RoundedBoxGeometry(0.14, 0.24, 0.04, 2, 0.02), m)); g.add(M(new THREE.PlaneGeometry(0.1, 0.06), glow('#a6ee70', 1.5), 0, 0.06, 0.021)); g.add(M(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12).rotateX(Math.PI / 2), dark, 0, -0.04, 0.021)); break;
    case 'spool': g.add(M(new THREE.CylinderGeometry(0.07, 0.07, 0.07, 16).rotateX(Math.PI / 2), m)); for (const z of [-0.04, 0.04]) g.add(M(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 16).rotateX(Math.PI / 2), dark, 0, 0, z)); break;
    case 'hexkey': for (let i = 0; i < 4; i++) { g.add(M(new THREE.BoxGeometry(0.012, 0.16 + i * 0.03, 0.012), m, i * 0.025, 0, 0)); g.add(M(new THREE.BoxGeometry(0.05, 0.012, 0.012), m, i * 0.025 + 0.02, 0.08 + i * 0.015, 0)); } break;
    case 'level': g.add(M(new THREE.BoxGeometry(0.5, 0.06, 0.03), m)); g.add(M(new THREE.CapsuleGeometry(0.012, 0.05, 4, 8).rotateZ(Math.PI / 2), glow('#a6ee70', 2), 0, 0, 0.018)); break;
    case 'square': g.add(M(new THREE.BoxGeometry(0.03, 0.34, 0.008), steel, -0.1, 0, 0)); g.add(M(new THREE.BoxGeometry(0.22, 0.05, 0.02), m, 0.0, -0.15, 0)); break;
    default: return pegTool(kind, color);
  }
  return g;
}
const KINDS = ['hammer', 'wrench', 'saw', 'pliers', 'screwdriver', 'iron', 'caliper', 'tape', 'clamp', 'mallet', 'file', 'scissors', 'gluegun', 'multimeter', 'spool', 'hexkey', 'level', 'square'];

// merge every mesh under root into one mesh per material (hundreds of tools -> a handful of draw calls)
function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse(o => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
  });
  const out = new THREE.Group();
  for (const [m, list] of buckets) out.add(new THREE.Mesh(mergeGeometries(list), m));
  return out;
}

function pegboardTexture(w, h) {
  const c = canvas(512, 512 * h / w | 0), g = c.getContext('2d');
  g.fillStyle = '#c8a070'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#6a4a2a';
  const step = c.width / (w / 0.05);
  for (let y = step / 2; y < c.height; y += step) for (let x = step / 2; x < c.width; x += step) { g.beginPath(); g.arc(x, y, step * 0.18, 0, 7); g.fill(); }
  return tex(c);
}

// a pegboard w x h (meters), tools packed on a grid with shadow-board outlines behind them
function pegboard(w, h) {
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: pegboardTexture(w, h), roughness: 0.9 })));
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.04), mat('#5a3a22', { r: 0.8 })); frame.position.z = -0.03; grp.add(frame);
  const tools = new THREE.Group(), shadows = new THREE.Group();
  const shadowMat = mat('#3a2410', { r: 1 });
  const dx = 0.36, dy = 0.56;
  let k = 0;
  for (let y = -h / 2 + dy * 0.6; y < h / 2 - dy * 0.4; y += dy) {
    for (let x = -w / 2 + dx * 0.6; x < w / 2 - dx * 0.4; x += dx) {
      const kind = KINDS[(k * 7 + Math.floor(y * 3)) % KINDS.length];
      const t = tool(kind, NEON[(k * 3) % NEON.length]);
      const s = 1.05 + Math.random() * 0.35;
      t.scale.setScalar(s); t.position.set(x + (Math.random() - 0.5) * 0.06, y, 0.06); t.rotation.z = (Math.random() - 0.5) * 0.25;
      tools.add(t);
      // shadow-board outline: a flattened, slightly bigger dark copy painted on the board
      if (Math.random() < 0.85) { const sh = tool(kind, '#000000'); sh.scale.set(s * 1.12, s * 1.12, 0.05); sh.position.set(t.position.x, y, 0.005); sh.rotation.z = t.rotation.z; sh.traverse(o => { if (o.isMesh) o.material = shadowMat; }); shadows.add(sh); }
      k++;
    }
  }
  grp.add(mergeByMaterial(shadows), mergeByMaterial(tools));
  return grp;
}

// ---------- laser paths ----------
function resample(pts, n = 220) {
  const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = d[d.length - 1], out = [];
  for (let i = 0, j = 0; i <= n; i++) { const s = i / n * L; while (j < d.length - 2 && d[j + 1] < s) j++; const f = (s - d[j]) / Math.max(1e-6, d[j + 1] - d[j]); out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f]); }
  return out;
}
const SHAPES = {
  heart: () => { const p = []; for (let i = 0; i <= 200; i++) { const t = i / 200 * Math.PI * 2; p.push([16 * Math.sin(t) ** 3 / 17, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]); } return p; },
  star: () => { const p = []; for (let i = 0; i <= 10; i++) { const r = i % 2 ? 0.42 : 1, a = -Math.PI / 2 + i * Math.PI / 5; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; },
  gear: () => { const p = []; for (let i = 0; i <= 360; i++) { const a = i / 360 * Math.PI * 2, r = 0.78 + 0.2 * Math.sign(Math.sin(a * 12)); p.push([Math.cos(a) * r, Math.sin(a) * r]); } p.push([0.3, 0]); for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; p.push([Math.cos(a) * 0.3, Math.sin(a) * 0.3]); } return p; },
  bolt: () => [[0.2, -1], [-0.55, 0.15], [-0.05, 0.15], [-0.3, 1], [0.55, -0.2], [0.05, -0.2], [0.2, -1]],
  dpad: () => { const a = 0.32, b = 1; return [[-a, -b], [a, -b], [a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a], [-a, -b]]; },
  spiral: () => { const p = []; for (let i = 0; i <= 300; i++) { const t = i / 300 * Math.PI * 6; p.push([Math.cos(t) * t / (Math.PI * 6), Math.sin(t) * t / (Math.PI * 6)]); } return p; },
};
const SHAPE_NAMES = Object.keys(SHAPES);

// ---------- printable models (local units, base at y=0) ----------
function printGeo(kind) {
  let g;
  if (kind === 'vase') { const p = []; for (let i = 0; i <= 24; i++) { const h = i / 24 * 0.42; p.push(new THREE.Vector2(0.06 + 0.05 * Math.sin(h * 14) + (i === 0 ? -0.06 : 0), h)); } g = new THREE.LatheGeometry(p, 28); }
  else if (kind === 'gear') { const s = new THREE.Shape(); for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2, r = 0.13 + 0.03 * Math.sign(Math.sin(a * 12)); i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } const hole = new THREE.Path(); hole.absarc(0, 0, 0.04, 0, Math.PI * 2, true); s.holes.push(hole); g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false }).rotateX(-Math.PI / 2); }
  else if (kind === 'heart' || kind === 'star') {
    const pts = SHAPES[kind](), s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * 0.15, -y * 0.15)));
    g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 });
  }
  else if (kind === 'knot') g = new THREE.TorusKnotGeometry(0.09, 0.028, 120, 12);
  else g = new RoundedBoxGeometry(0.22, 0.16, 0.22, 3, 0.04);
  g.computeBoundingBox();
  const bb = g.boundingBox; g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
  g.computeBoundingBox();
  return g;
}
const PRINTS = ['vase', 'gear', 'heart', 'star', 'knot', 'keycap'];

export function buildFab(scene, terrain, fxQueue) {
  const updaters = [];
  const out = { lasers: [], printers: [] };

  // ---- pegboards: south wall both sides of the door, and the west wall ----
  const pbL = pegboard(18, 4.4); pbL.position.set(-19, 3.2, -29.82); scene.add(pbL);
  const pbR = pegboard(18.5, 4.4); pbR.position.set(19, 3.2, -29.82); scene.add(pbR);
  const pbW = pegboard(11.5, 3.0); pbW.position.set(-29.82, 2.4, -23.2); pbW.rotation.y = Math.PI / 2; scene.add(pbW);

  // ---- laser cutter row, mid-shop, each one burning a shape onto its bed ----
  const S = 1.5;
  for (let i = 0; i < 3; i++) {
    const lc = laserCutter();
    lc.scale.setScalar(S); lc.position.set(12.4 + i * 4.2, 0, -17.6); scene.add(lc);
    terrain.wall(lc.position.x - 1.65, lc.position.x + 1.65, -18.65, -16.55, 2.1);
    const c = canvas(512, 284), g = c.getContext('2d');
    const t = tex(c);
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    bed.position.y = 1.03; bed.renderOrder = 3; lc.add(bed);
    const job = { lc, c, g, t, pts: null, k: 0, hold: 0, shape: '', speed: 34 + Math.random() * 14 };
    const start = () => {
      job.shape = SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)];
      job.pts = resample(SHAPES[job.shape](), 260); job.k = 0; job.hold = 0;
      g.clearRect(0, 0, c.width, c.height); t.needsUpdate = true;
    };
    start();
    job.k = Math.floor(Math.random() * 200);
    const toLocal = ([u, v]) => [u * 0.42, v * 0.42];
    const toPx = ([u, v]) => [(u * 0.42 / 0.9 + 1) / 2 * c.width, (v * 0.42 / 0.5 + 1) / 2 * c.height];
    updaters.push((dt, time) => {
      const U = lc.userData;
      if (job.hold > 0) {
        job.hold -= dt;
        if (job.hold <= 0) { fxQueue.push({ type: 'pop', text: job.shape.toUpperCase() + ' CUT ✓', pos: lc.localToWorld(new THREE.Vector3(0, 1.6, 0)), color: HEX.orange }); start(); }
        U.dot.visible = false;
        return;
      }
      const prev = job.pts[Math.min(job.k, job.pts.length - 1)];
      const steps = Math.max(1, Math.round(job.speed * dt));
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      for (let s = 0; s < steps && job.k < job.pts.length - 1; s++) {
        const a = job.pts[job.k], b = job.pts[job.k + 1];
        const [ax, ay] = toPx(a), [bx, by] = toPx(b);
        g.strokeStyle = '#ffb060'; g.shadowColor = '#ff3a00'; g.shadowBlur = 16; g.lineWidth = 8;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
        job.k++;
      }
      g.restore();
      t.needsUpdate = true;
      const cur = job.pts[job.k], [x, z] = toLocal(cur);
      U.gantry.position.x = x; U.head.position.set(x, 1.05, z); U.dot.position.set(x, 1.01, z);
      U.dot.visible = Math.random() > 0.15;
      if (Math.random() < 0.12) fxQueue.push({ type: 'sparks', pos: lc.localToWorld(U.dot.position.clone()), n: 3 });
      if (Math.random() < 0.05) fxQueue.push({ type: 'smoke', pos: lc.localToWorld(U.dot.position.clone()) });
      if (job.k >= job.pts.length - 1) { job.hold = 2.2; void prev; }
    });
    out.lasers.push(lc);
  }

  // ---- 3D print farm along the east wall ----
  const bench = new THREE.Group();
  bench.add(M(new RoundedBoxGeometry(1.1, 0.08, 8.2, 2, 0.02), mat('#a8743f', { r: 0.7 }), 0, 0.92, 0));
  for (const z of [-3.9, -1.3, 1.3, 3.9]) for (const x of [-0.45, 0.45]) bench.add(M(new THREE.BoxGeometry(0.08, 0.9, 0.08), mat('#3a2a55'), x, 0.45, z));
  bench.add(M(new THREE.BoxGeometry(1.0, 0.04, 8), mat('#2a1f40'), 0, 0.3, 0));
  bench.position.set(27.6, 0, -21.4); scene.add(bench);
  terrain.wall(27.0, 28.2, -25.6, -17.2, 1);
  PRINTS.forEach((kind, i) => {
    const color = NEON[(i + 2) % NEON.length];
    const pr = printer3d(color); pr.scale.setScalar(1.35); pr.position.set(27.6, 0.96, -24.7 + i * 1.3); pr.rotation.y = -Math.PI / 2; scene.add(pr);
    pr.userData.part.visible = false;
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const geo = printGeo(kind), hgt = geo.boundingBox.max.y, rad = Math.max(geo.boundingBox.max.x, geo.boundingBox.max.z);
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.45, emissive: color, emissiveIntensity: 0.25, clippingPlanes: [plane], side: THREE.DoubleSide });
    const part = new THREE.Mesh(geo, m); part.position.y = 0.085; pr.add(part);
    // glowing "current layer" ring
    const layer = new THREE.Mesh(new THREE.TorusGeometry(rad * 0.85, 0.004, 4, 32).rotateX(Math.PI / 2), glow(color, 4)); pr.add(layer);
    const job = { p: Math.random() * 0.8, dur: 14 + Math.random() * 10, hold: 0 };
    const v = new THREE.Vector3();
    updaters.push((dt, time) => {
      if (job.hold > 0) {
        job.hold -= dt; layer.visible = false;
        part.rotation.y += dt * 2;
        if (job.hold <= 0) { job.p = 0; part.rotation.y = 0; fxQueue.push({ type: 'burst', pos: pr.localToWorld(new THREE.Vector3(0, 0.3, 0)), color }); }
      } else {
        job.p = Math.min(1, job.p + dt / job.dur);
        if (job.p >= 1) { job.hold = 2.5; fxQueue.push({ type: 'pop', text: `${kind.toUpperCase()} PRINTED ✓`, pos: pr.localToWorld(new THREE.Vector3(0, 1.1, 0)), color }); }
        layer.visible = true;
      }
      const yl = 0.085 + job.p * hgt;
      plane.constant = pr.localToWorld(v.set(0, yl, 0)).y + 0.002;
      if (job.hold > 0) plane.constant = 999;
      const a = time * 11 + i;
      pr.userData.head.position.set(Math.cos(a) * rad * 0.8, yl + 0.07, Math.sin(a * 1.3) * rad * 0.8);
      layer.position.y = yl; layer.scale.setScalar(0.85 + 0.15 * Math.sin(time * 6 + i));
    });
    out.printers.push(pr);
  });

  out.update = (dt, t) => updaters.forEach(f => f(dt, t));
  return out;
}
