// THE HUB: a wild project space at the bottom of the sea.
// North: the slide drops you in by the trend buffet.  West: skate bowl under the Gigahand mural.
// East: trampolines up to the mezzanine and its slide.  Center: the portal plaza under the Constructive Lens.
// South: the maker shop and the roll-up garage door to the open field (an air bubble with its own sky).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Terrain } from './terrain.js';
import { label, tex, circuitCanvas, circuitWall, codeAtlas, loadImage, textTexture } from './textures.js';
import { HEX, C, NEON } from './palette.js';
import { mat, glow, FOODS, airFryer, workbench, tableSaw, drillPress, anvil, laserCutter, waterjet, printer3d, mcuStation, pegTool, PEG_TOOLS, toolChest, robotArm, cncRouter, bandsaw, lumberRack, partsShelf } from './props.js';
import { buildFab } from './shopfab.js';
import { shared, floorMaterial, underwaterMaterial, skyMaterial, bubbleMaterial, codeStreamMaterial } from './shaders.js';

export const HUB = { half: 30, ceil: 16, plaza: new THREE.Vector3(0, 0, -2) };
export const FIELD = { center: new THREE.Vector3(0, 0, -122), r: 92 };
const W = 29.7; // interior wall line

export function fieldHeight(x, z) {
  if (z > -31) return 0;
  const g = (cx, cz, h, s) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / s);
  return g(0, -178, 7, 600) + g(42, -112, 3, 300) + g(-46, -132, 2.6, 420) + g(-20, -90, 1.2, 200);
}

// halfpipe profile across x, centred at x=-21
const HP = { xc: -21, flat: 2.6, w: 4.6, H: 3.4, minZ: -12, maxZ: 14, minX: -29.7, maxX: -13 };
function halfpipe(x) {
  const d = Math.abs(x - HP.xc) - HP.flat;
  if (d <= 0) return 0;
  if (d >= HP.w) return HP.H;
  return HP.H * Math.pow(d / HP.w, 2);
}

export function buildHub(selfCode) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(HEX.deep);
  scene.fog = new THREE.Fog(HEX.deep, 70, 300);
  const updaters = [];
  const interact = [];
  const sound = [];        // {kind, pos, opts}
  const trapdoors = [];
  const fxQueue = [];   // particle requests for main.js (hub has no FX of its own)
  const tramps = [];

  // ---------------- terrain ----------------
  const inField = (x, z) => z < -30.2 && Math.hypot(x - FIELD.center.x, z - FIELD.center.z) < FIELD.r - 1;
  const inDoorway = (x, z) => Math.abs(x) < 7.5 && z <= -29 && z > -40; // the strip under the garage door, into the prairie
  const trapOpen = (x, z) => trapdoors.find(t => t.open > 0.3 && Math.abs(x - t.x) < t.s / 2 && Math.abs(z - t.z) < t.s / 2);
  const terrain = new Terrain({
    base: (x, z) => {
      if (inField(x, z) || (inDoorway(x, z) && z < -30.2)) return { h: fieldHeight(x, z), kind: 'grass' };
      if (Math.abs(x) < W + 0.5 && z > -30.2 && z < W + 0.5) {
        if (trapOpen(x, z)) return { h: -60, kind: 'shaft' };
        return { h: 0, kind: 'floor' };
      }
      return { h: -60, kind: 'void' };
    },
    ceiling: (x, z) => (z > -30 ? HUB.ceil - 0.1 : 200),
    extraBlock: (x, z, y) => {
      if (y < -0.4) { // inside a trapdoor shaft: you can't leave the hole
        return !trapdoors.some(t => Math.abs(x - t.x) < t.s / 2 - 0.25 && Math.abs(z - t.z) < t.s / 2 - 0.25);
      }
      if (z < -30.2) return !inField(x, z) && !inDoorway(x, z);
      return false;
    },
  });

  // ---------------- lights ----------------
  scene.add(new THREE.HemisphereLight('#b58cff', '#2a0e4a', 1.1));
  const sun = new THREE.DirectionalLight('#ffd9f0', 1.0); sun.position.set(10, 30, 8); scene.add(sun);
  const pl = (c, i, x, y, z, d = 34) => { const l = new THREE.PointLight(c, i, d, 1.1); l.position.set(x, y, z); scene.add(l); return l; };
  const lights = {
    plaza: pl(HEX.magenta, 30, 0, 9, -2, 40),
    skate: pl(HEX.pink, 22, -21, 9, 1),
    tramp: pl(HEX.lime, 18, 21, 9, 2),
    buffet: pl(HEX.amber, 22, -8, 7, 22),
    shop: pl(HEX.orange, 22, 0, 8, -24),
  };
  const fieldSun = new THREE.DirectionalLight('#ff8a3a', 2.6); fieldSun.position.set(0, 10, -230); fieldSun.target.position.set(0, 0, -120); scene.add(fieldSun, fieldSun.target);

  // ---------------- floor ----------------
  const circuitTex = tex(circuitCanvas(1024), { srgb: false });
  circuitTex.wrapS = circuitTex.wrapT = THREE.RepeatWrapping;
  const floorShape = new THREE.Shape([new THREE.Vector2(-30, -30), new THREE.Vector2(30, -30), new THREE.Vector2(30, 30), new THREE.Vector2(-30, 30)]);
  const TRAPS = [{ x: -7, z: -17, s: 2.4 }, { x: 7, z: -17, s: 2.4 }, { x: -9, z: 17, s: 2.4 }];
  for (const t of TRAPS) {
    const h = new THREE.Path(); const s = t.s / 2;
    // shape is in x / -z space after rotation, so flip z
    h.moveTo(t.x - s, -t.z - s); h.lineTo(t.x + s, -t.z - s); h.lineTo(t.x + s, -t.z + s); h.lineTo(t.x - s, -t.z + s); h.closePath();
    floorShape.holes.push(h);
  }
  const floorMat = floorMaterial(circuitTex, { center: new THREE.Vector2(0, -2), scale: 1 / 8 });
  const floor = new THREE.Mesh(new THREE.ShapeGeometry(floorShape).rotateX(-Math.PI / 2), floorMat);
  scene.add(floor);

  // ---------------- walls with portholes ----------------
  const wallCirc = tex(circuitWall(1024, HEX.magenta, HEX.pink));
  wallCirc.wrapS = wallCirc.wrapT = THREE.RepeatWrapping; wallCirc.repeat.set(1 / 9, 1 / 9);
  const wallMat = new THREE.MeshStandardMaterial({ color: '#2a0d52', roughness: 0.6, metalness: 0.2, emissive: '#ffffff', emissiveMap: wallCirc, emissiveIntensity: 0.22, side: THREE.DoubleSide });
  const rimMat = mat('#ffbf00', { m: 0.9, r: 0.25, e: '#ff8000', ei: 0.35 });
  function wall(len, holes, place) {
    const s = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(len, 0), new THREE.Vector2(len, HUB.ceil), new THREE.Vector2(0, HUB.ceil)]);
    for (const h of holes) {
      const p = new THREE.Path();
      if (h.rect) { p.moveTo(h.u0, h.v0); p.lineTo(h.u1, h.v0); p.lineTo(h.u1, h.v1); p.lineTo(h.u0, h.v1); p.closePath(); }
      else p.absarc(h.u, h.v, h.r, 0, Math.PI * 2, true);
      s.holes.push(p);
    }
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s, 48), wallMat);
    const g = new THREE.Group(); g.add(m);
    for (const h of holes) {
      if (h.rect) continue;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(h.r, 0.22, 12, 48), rimMat); rim.position.set(h.u, h.v, 0); g.add(rim);
      for (let b = 0; b < 8; b++) { const a = b / 8 * Math.PI * 2; const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), rimMat); bolt.position.set(h.u + Math.cos(a) * (h.r + 0.35), h.v + Math.sin(a) * (h.r + 0.35), 0.05); g.add(bolt); }
    }
    place(g); scene.add(g);
    return g;
  }
  // west wall (x=-30), u runs along +z from -30
  const westHoles = [-24, -16, -8, 0, 8, 16, 24].map(z => ({ u: z + 30, v: 6, r: 2.0 }));
  wall(60, westHoles, g => { g.position.set(-30, 0, -30); g.rotation.y = -Math.PI / 2; });
  // east wall (x=30), u along -z from +30
  const eastHoles = [-24, -16, -8, 0, 8].map(z => ({ u: 30 - z, v: 5, r: 2.0 })).concat([20, 26].map(z => ({ u: 30 - z, v: 11.2, r: 1.8 })));
  wall(60, eastHoles, g => { g.position.set(30, 0, 30); g.rotation.y = Math.PI / 2; });
  // north wall (z=30), u along -x from +30; giant aquarium window over the slide exit
  const northHoles = [{ u: 30, v: 9.5, r: 4.6 }, ...[-22, -14, 22].map(x => ({ u: 30 - x, v: 6, r: 2.0 }))];
  wall(60, northHoles, g => { g.position.set(30, 0, 30); g.rotation.y = Math.PI; });
  // south wall (z=-30) with the garage opening x -7..7, y 0..7
  wall(60, [{ rect: true, u0: 23, u1: 37, v0: 0, v1: 7 }], g => { g.position.set(-30, 0, -30); });
  terrain.wall(-31, -W, -31, 31); terrain.wall(W, 31, -31, 31); terrain.wall(-31, 31, W, 31);
  terrain.wall(-31, -7, -31, -29.8); terrain.wall(7, 31, -31, -29.8);
  const garageBlock = terrain.wall(-7, 7, -30.6, -29.8, 40);

  // glass ceiling streaming 1derworld's own source code
  const ceilAtlas = codeAtlas(selfCode || '// 1derworld', 2048, 2048, 26);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(Math.PI / 2), codeStreamMaterial(ceilAtlas, { repeatX: 2, repeatY: 1.2, cols: 120, speed: 0.6, opacity: 0.55 }));
  ceil.position.y = HUB.ceil; scene.add(ceil);
  // ceiling beams
  for (let i = -2; i <= 2; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(60, 0.5, 0.6), mat('#1a0838', { m: 0.6, r: 0.4 })); b.position.set(0, HUB.ceil, i * 12); scene.add(b);
    const s = new THREE.Mesh(new THREE.BoxGeometry(60, 0.08, 0.1), glow(NEON[(i + 5) % NEON.length], 2)); s.position.set(0, HUB.ceil - 0.28, i * 12); scene.add(s);
  }

  // ---------------- underwater outside ----------------
  const sea = new THREE.Mesh(new THREE.SphereGeometry(280, 48, 24), underwaterMaterial()); scene.add(sea);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(275, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2b1a4d', roughness: 1 }));
  sand.position.y = -8; scene.add(sand);
  // kelp forest (instanced, swaying in the vertex shader)
  {
    const kelpGeo = new THREE.PlaneGeometry(0.8, 14, 1, 10); kelpGeo.translate(0, 7, 0);
    const kelpMat = new THREE.MeshStandardMaterial({ color: '#2e8a5a', emissive: '#0f4a3a', side: THREE.DoubleSide, roughness: 0.8 });
    kelpMat.onBeforeCompile = sh => {
      sh.uniforms.uTime = shared.uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float k = position.y/14.0; vec4 wp = instanceMatrix*vec4(0.,0.,0.,1.);
        transformed.x += sin(uTime*0.8 + wp.x*0.1 + position.y*0.35)*k*k*2.2;
        transformed.z += cos(uTime*0.6 + wp.z*0.1 + position.y*0.3)*k*k*1.5;`);
    };
    const n = 420, kelp = new THREE.InstancedMesh(kelpGeo, kelpMat, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), cc = new THREE.Color();
    let k = 0;
    while (k < n) {
      const a = Math.random() * Math.PI * 2, r = 36 + Math.random() * 120;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x - FIELD.center.x, z - FIELD.center.z) < FIELD.r + 6 || (Math.abs(x) < 34 && Math.abs(z) < 34)) continue; // outside the hub walls only
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 6);
      m4.compose(new THREE.Vector3(x, -8, z), q, new THREE.Vector3(1, 0.6 + Math.random() * 1.2, 1));
      kelp.setMatrixAt(k, m4);
      kelp.setColorAt(k, cc.set(Math.random() < 0.15 ? HEX.magenta : Math.random() < 0.5 ? '#3fb87a' : '#2e8a5a'));
      k++;
    }
    scene.add(kelp);
  }
  // coral heads in brand colors
  {
    const n = 160, geo = new THREE.IcosahedronGeometry(1, 1), cm = new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0.12 });
    const coral = new THREE.InstancedMesh(geo, cm, n), m4 = new THREE.Matrix4(), cc = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 34 + Math.random() * 90;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x - FIELD.center.x, z - FIELD.center.z) < FIELD.r + 4 || (Math.abs(x) < 34 && Math.abs(z) < 34)) { m4.makeScale(0, 0, 0); coral.setMatrixAt(i, m4); continue; }
      const s = 0.8 + Math.random() * 2.5;
      m4.makeScale(s, s * (0.6 + Math.random()), s).setPosition(x, -8 + s * 0.4, z);
      coral.setMatrixAt(i, m4); coral.setColorAt(i, cc.set(NEON[i % NEON.length]));
    }
    scene.add(coral);
  }
  // fish schools
  const schools = [];
  {
    const geo = new THREE.ConeGeometry(0.25, 0.9, 5).rotateX(Math.PI / 2);
    for (let s = 0; s < 4; s++) {
      const n = 70, col = [HEX.amber, HEX.pink, HEX.lime, HEX.blue][s];
      const im = new THREE.InstancedMesh(geo, mat(col, { e: col, ei: 0.5 }), n);
      const fish = [...Array(n)].map(() => ({ o: Math.random() * 6.28, r: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 4, sp: 0.9 + Math.random() * 0.2 }));
      scene.add(im);
      schools.push({ im, fish, R: 44 + s * 13, Y: 2 + s * 4, speed: 0.07 + s * 0.015 * (s % 2 ? -1 : 1), phase: s * 1.7 });
    }
  }
  // jellyfish
  const jellies = [];
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group();
    const col = [HEX.pink, HEX.magenta, HEX.aqua, HEX.lime][i % 4];
    const bell = new THREE.Mesh(new THREE.SphereGeometry(1.4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.2, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    g.add(bell);
    for (let t = 0; t < 8; t++) {
      const a = t / 8 * 6.28, pts = [];
      for (let k = 0; k < 8; k++) pts.push(new THREE.Vector3(Math.cos(a) * 0.9, -k * 0.6, Math.sin(a) * 0.9));
      const tent = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.04, 4), glow(col, 1.5));
      g.add(tent);
    }
    const a = Math.random() * 6.28, r = 40 + Math.random() * 50;
    g.position.set(Math.cos(a) * r, 2 + Math.random() * 18, Math.sin(a) * r);
    if (Math.hypot(g.position.x - FIELD.center.x, g.position.z - FIELD.center.z) < FIELD.r + 6) g.position.z = 40 + Math.random() * 30;
    scene.add(g); jellies.push({ g, bell, base: g.position.y, ph: Math.random() * 6 });
  }
  // a whale, on a long slow orbit
  const whale = new THREE.Group();
  {
    const wm = mat('#2b3a8a', { r: 0.7, e: '#1a2a6a', ei: 0.4 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(3.2, 14, 8, 16).rotateZ(Math.PI / 2), wm); body.scale.set(1, 0.8, 0.9); whale.add(body);
    const belly = new THREE.Mesh(new THREE.CapsuleGeometry(2.4, 11, 6, 12).rotateZ(Math.PI / 2), mat('#c9b8ff', { r: 0.8 })); belly.position.set(1, -1.3, 0); belly.scale.set(1, 0.45, 0.8); whale.add(belly);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1, 3).rotateX(Math.PI / 2), wm); tail.scale.set(1.8, 0.25, 1); tail.position.set(-11, 0.4, 0); tail.rotation.set(0, Math.PI / 2, 0); whale.add(tail);
    for (const s of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 1.2), wm); fin.position.set(3, -1.6, s * 2.9); fin.rotation.set(s * 0.5, 0.3, 0); whale.add(fin); }
    for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), glow(HEX.amber, 3)); eye.position.set(7.5, 0.4, s * 2.3); whale.add(eye); }
    whale.userData.tail = tail;
    scene.add(whale);
  }
  // bubble columns
  const bubbleVents = [[-40, 20], [38, -10], [10, 45], [-25, 48], [45, 30]].map(([x, z]) => new THREE.Vector3(x, -8, z));

  // ---------------- entry: the slide tube from the washer comes down through the water ----------------
  const tubePts = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 4.5 + 0.6; tubePts.push(new THREE.Vector3(Math.cos(a) * 8, 66 - t * 46, 44 + Math.sin(a) * 8)); }
  tubePts.push(new THREE.Vector3(0, 18, 32), new THREE.Vector3(0, 13, 26), new THREE.Vector3(0, 6, 22.5), new THREE.Vector3(0, 1.5, 19.5), new THREE.Vector3(0, 0.6, 16.5), new THREE.Vector3(0, 0.45, 15.0));
  const entryCurve = new THREE.CatmullRomCurve3(tubePts, false, 'centripetal');
  const tube = new THREE.Mesh(new THREE.TubeGeometry(entryCurve, 500, 1.3, 20, false), new THREE.MeshStandardMaterial({ color: '#b9f3ff', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  scene.add(tube);
  const tubeRings = [];
  for (let i = 0; i < 110; i++) {
    const t = i / 110, p = entryCurve.getPointAt(t), tg = entryCurve.getTangentAt(t);
    if (p.y < 0.9) continue;
    const r = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.06, 6, 28), glow(NEON[i % NEON.length], 2));
    r.position.copy(p); r.lookAt(p.clone().add(tg)); scene.add(r); tubeRings.push({ r, t });
  }
  // landing pad
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.25, 32), mat(HEX.pink, { e: HEX.magenta, ei: 0.6, r: 0.9 })); pad.position.set(0, 0.12, 15); scene.add(pad);
  const welcome = label('THE WORLD IS A CONSTRUCTION KIT!', 1.1, { font: 'Bungee', gradient: [HEX.amber, HEX.pink], glow: HEX.pink, stroke: '#1a0838', size: 110 });
  welcome.position.set(0, 4.0, 29.6); welcome.rotation.y = Math.PI; scene.add(welcome);
  const hooke = label('“there is a new visible World discovered to the understanding.”  ~Hooke', 0.42, { font: 'Fjalla One', color: HEX.cream, glow: HEX.aqua, size: 80 });
  hooke.position.set(0, 15.0, 29.6); hooke.rotation.y = Math.PI; scene.add(hooke);

  // ---------------- PORTAL PLAZA dressing: the Constructive Lens ----------------
  const lens = new THREE.Group();
  {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.35, 16, 64), mat('#ffbf00', { m: 0.95, r: 0.15, e: '#ff8000', ei: 0.4 }));
    const glass = new THREE.Mesh(new THREE.CircleGeometry(3.0, 64), new THREE.MeshPhysicalMaterial({ color: '#d8f6ff', transparent: true, opacity: 0.22, roughness: 0, metalness: 0, clearcoat: 1, side: THREE.DoubleSide, emissive: '#3fd0c9', emissiveIntensity: 0.25 }));
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 2.0, 16), mat(HEX.red, { r: 0.4 })); handle.position.set(0, -4.2, 0);
    // a wooden block crossed with the lens: lens × block
    const block = new THREE.Mesh(new RoundedBoxGeometry(1.4, 1.4, 1.4, 3, 0.12), mat('#e9b872', { r: 0.7 })); block.position.set(0, 0, 0); block.userData.spin = true;
    lens.add(ring, glass, handle, block);
    lens.userData = { block, glass };
  }
  lens.position.set(HUB.plaza.x, 10.5, HUB.plaza.z); lens.rotation.x = 0.1; scene.add(lens);
  const lensText = new THREE.Group();
  {
    const phrase = '  LENS × BLOCK  ✦  RE-SEEING THE EVERYDAY WORLD AS SOMETHING WE CAN RE-MAKE  ✦  PORTFOLIOS VS CREDENTIALS  ✦  LOW FLOOR · WIDE WALLS · MANY ROOMS  ✦  INVENT BY METAPHOR  ✦';
    const { texture, aspect } = textTexture(phrase, { font: 'Bungee', color: HEX.cream, glow: HEX.magenta, size: 72, pad: 10 });
    texture.wrapS = THREE.RepeatWrapping;
    const r = 6.4, hgt = (2 * Math.PI * r) / aspect;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hgt, 96, 1, true), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
    lensText.add(band);
    lensText.position.set(HUB.plaza.x, 13.6, HUB.plaza.z);
  }
  scene.add(lensText);
  interact.push({ obj: lens, label: 'Constructive Lens: re-see the world as blocks (L)', dist: 26, action: 'lens' });
  // geyser at plaza center: where the trapdoors spit you back out
  const geyser = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.12, 40), new THREE.MeshBasicMaterial({ color: HEX.aqua, toneMapped: false, transparent: true, opacity: 0.6 }));
  geyser.position.set(HUB.plaza.x, 0.06, HUB.plaza.z); scene.add(geyser);
  const plazaSign = label('PLAY. BEND. CODE.', 0.6, { font: 'Bungee', color: HEX.lime, glow: HEX.lime, size: 100 });
  plazaSign.position.set(HUB.plaza.x, 7.6, HUB.plaza.z); scene.add(plazaSign);

  // ---------------- TREND BUFFET (north) ----------------
  const buffetFoods = [];
  {
    const counters = [[-26, -3], [3, 11]];
    for (const [a, b] of counters) {
      const len = b - a, cx = (a + b) / 2;
      const c = new THREE.Mesh(new RoundedBoxGeometry(len, 1.0, 1.4, 2, 0.08), mat('#fff3e0', { r: 0.35 })); c.position.set(cx, 0.5, 25.3); scene.add(c);
      const kick = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 1.42), glow(HEX.pink, 2.2)); kick.position.set(cx, 0.08, 25.3); scene.add(kick);
      const top = new THREE.Mesh(new THREE.BoxGeometry(len + 0.1, 0.06, 1.5), mat('#1a0838', { r: 0.15, m: 0.4 })); top.position.set(cx, 1.03, 25.3); scene.add(top);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.9), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, roughness: 0 })); guard.position.set(cx, 1.75, 25.1); guard.rotation.x = 0.35; scene.add(guard);
      terrain.wall(a, b, 24.6, 26.0, 1.06);
      // kaiten conveyor
      const belt = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, 0.35), mat('#2a1f40', { m: 0.6, r: 0.3 })); belt.position.set(cx, 1.08, 25.85); scene.add(belt);
      const plates = [];
      for (let i = 0; i < Math.floor(len / 1.1); i++) {
        const pl8 = new THREE.Group();
        pl8.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.03, 20), mat(NEON[i % NEON.length], { r: 0.3 })));
        const sushi = i % 2 ? FOODS[2].make().children[1 + (i % 4)].clone() : FOODS[2].make().children[5 + (i % 5)].clone();
        sushi.position.set(0, 0.02, 0); sushi.scale.setScalar(1.3); pl8.add(sushi);
        pl8.position.set(a + 0.5 + i * 1.1, 1.12, 25.85); scene.add(pl8); plates.push(pl8);
      }
      updaters.push((dt) => { for (const p of plates) { p.position.x += dt * 0.6; if (p.position.x > b - 0.3) p.position.x = a + 0.3; } });
    }
    // dishes along the front of the counters
    const spots = []; for (let x = -25; x <= -4; x += 1.75) spots.push(x); for (let x = 4; x <= 10; x += 1.75) spots.push(x);
    spots.forEach((x, i) => {
      const def = FOODS[i % FOODS.length];
      const f = def.make(); f.scale.setScalar(3.4); f.position.set(x, 1.06, 24.85);
      scene.add(f);
      const tag = label(def.name, 0.17, { font: 'Fjalla One', color: HEX.ink, bg: HEX.amber, size: 64, pad: 18 });
      tag.position.set(x, 0.75, 24.58); tag.rotation.y = Math.PI; scene.add(tag);
      buffetFoods.push({ f, i, def });
      interact.push({ obj: f, label: `${def.name}  (tap it: every food is a key)`, dist: 6, action: 'food', data: { i, pos: f.position } });
    });
    // air fryer bar on a back shelf
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(18, 0.12, 0.9), mat('#1a0838', { m: 0.5 })); shelf.position.set(-15, 1.25, 28.9); scene.add(shelf);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(18, 1.25, 0.9), mat('#2a0d52')); legs.position.set(-15, 0.62, 28.9); scene.add(legs);
    terrain.wall(-24, -6, 28.4, W, 1.3);
    const fryerCols = ['#16121f', '#f2eef8', '#e8112d', '#16121f', '#a6ee70', '#f2eef8'];
    for (let i = 0; i < 6; i++) {
      const fr = airFryer(fryerCols[i], [HEX.amber, HEX.lime, HEX.pink][i % 3]); fr.scale.setScalar(2); fr.rotation.y = Math.PI; fr.position.set(-22.5 + i * 3, 1.31, 28.9); scene.add(fr);
      interact.push({ obj: fr, label: 'Air fryer: shake the basket', dist: 7, action: 'fryer', data: { pos: fr.position.clone().add(new THREE.Vector3(0, 0.8, 0)), i } });
      if (i % 2 === 0) sound.push({ kind: 'sizzle', pos: fr.position.clone().add(new THREE.Vector3(0, 0.6, 0)), opts: { v: 0.22, ref: 1.5 } });
    }
    const fryLabel = label('AIR FRYER BAR', 0.45, { font: 'Bungee', color: HEX.amber, glow: HEX.orange, size: 90 }); fryLabel.position.set(-15, 3.2, 29.6); fryLabel.rotation.y = Math.PI; scene.add(fryLabel);
    // giant spinning taco sign
    const bigTaco = FOODS[0].make().children[0]; bigTaco.scale.setScalar(14); bigTaco.position.set(-14, 6.8, 26); scene.add(bigTaco);
    updaters.push((dt, t) => { bigTaco.rotation.y = t * 0.7; bigTaco.position.y = 6.8 + Math.sin(t * 1.3) * 0.25; });
    const bt = label('MICRO-CREATIVITY BUFFET', 0.9, { font: 'Bungee', color: HEX.cream, glow: HEX.amber, stroke: HEX.red, size: 110 }); bt.position.set(-11, 11.5, 29.6); bt.rotation.y = Math.PI; scene.add(bt);
    const bq = label('“everyday objects can be viewed as musical compositions, game controllers, or even computer instructions.”', 0.3, { font: 'Fjalla One', color: HEX.amber, size: 70 }); bq.position.set(-11, 10.6, 29.6); bq.rotation.y = Math.PI; scene.add(bq);
    // soft serve machine
    const ss = new THREE.Group();
    ss.add(new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.6, 0.8, 2, 0.1), mat('#f2eef8', { r: 0.3, m: 0.3 })));
    const swirl = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 16, 6), mat(HEX.pink, { r: 0.4, e: HEX.pink, ei: 0.2 })); swirl.position.set(0, 1.25, 0.2); ss.add(swirl);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 12).rotateX(Math.PI), mat('#d9a35a')); cone.position.set(0, 0.73, 0.2); ss.add(cone);
    ss.position.set(9.5, 1.86, 25.3); scene.add(ss);
    updaters.push((dt, t) => { swirl.rotation.y = t * 2; });
    interact.push({ obj: ss, label: 'Soft serve (plays a note)', dist: 6, action: 'food', data: { i: 9, pos: ss.position } });
  }

  // ---------------- SKATE BOWL (west) ----------------
  {
    const gx = 64, gz = 26, geo = new THREE.PlaneGeometry(HP.maxX - HP.minX, HP.maxZ - HP.minZ, gx, 1).rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) + (HP.minX + HP.maxX) / 2; pos.setY(i, halfpipe(x)); }
    geo.computeVertexNormals();
    const skMat = new THREE.MeshStandardMaterial({ color: '#c442dc', roughness: 0.35, metalness: 0.1, emissive: '#ffffff', emissiveMap: tex(circuitWall(1024, '#ff6caf', '#ffbf00')), emissiveIntensity: 0.5 });
    skMat.emissiveMap.wrapS = skMat.emissiveMap.wrapT = THREE.RepeatWrapping; skMat.emissiveMap.repeat.set(2, 2);
    const bowl = new THREE.Mesh(geo, skMat); bowl.position.set((HP.minX + HP.maxX) / 2, 0.01, (HP.minZ + HP.maxZ) / 2); scene.add(bowl);
    // copings
    for (const x of [HP.xc - HP.flat - HP.w, HP.xc + HP.flat + HP.w]) {
      const cop = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, HP.maxZ - HP.minZ, 10).rotateX(Math.PI / 2), mat('#e0e0f0', { m: 1, r: 0.15 })); cop.position.set(x, HP.H + 0.05, (HP.minZ + HP.maxZ) / 2); scene.add(cop);
    }
    // side walls of the deck (the outer face toward the plaza)
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.3, HP.H, HP.maxZ - HP.minZ), mat('#480e9e', { e: HEX.pink, ei: 0.15 })); face.position.set(HP.maxX + 0.15, HP.H / 2, (HP.minZ + HP.maxZ) / 2); scene.add(face);
    terrain.fn(HP.minX, HP.maxX, HP.minZ, HP.maxZ, (x) => halfpipe(x), { kind: 'skate' });
    // kicker on the plaza side launches you onto the deck
    const k0 = -8.8, k1 = -12.9, kz0 = 15.2, kz1 = 18.2; // out past the bowl's north end, away from the portals
    const kick = (x) => Math.max(0, Math.min(1, (k0 - x) / (k0 - k1))) * 2.9;
    terrain.fn(k1, k0, kz0, kz1, kick, { kind: 'skate' });
    const kg = new THREE.BufferGeometry();
    const v = new Float32Array([k0, 0, kz0, k1, 2.9, kz0, k1, 2.9, kz1, k0, 0, kz0, k1, 2.9, kz1, k0, 0, kz1, k1, 0, kz0, k1, 2.9, kz0, k1, 2.9, kz1, k1, 0, kz0, k1, 2.9, kz1, k1, 0, kz1]);
    kg.setAttribute('position', new THREE.BufferAttribute(v, 3)); kg.computeVertexNormals();
    scene.add(new THREE.Mesh(kg, new THREE.MeshStandardMaterial({ color: HEX.amber, side: THREE.DoubleSide, roughness: 0.4, emissive: HEX.orange, emissiveIntensity: 0.2 })));
    // Gigahand mural from the JoyLabz deck
    loadImage('img/gigahand.jpg').then(img => {
      if (!img) return;
      const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(15, 15 * img.height / img.width), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
      m.material.color.setScalar(0.85);
      m.position.set(-29.6, 11.2, 1); m.rotation.y = Math.PI / 2; scene.add(m);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 15 * img.height / img.width + 0.4, 15.4), glow(HEX.pink, 1.5)); frame.position.set(-29.75, 11.2, 1); scene.add(frame);
    });
    const gh = label('GIGAHAND MEASURE', 0.8, { font: 'Bungee', color: HEX.cream, glow: HEX.pink, stroke: HEX.magenta, size: 100 }); gh.position.set(-29.5, 15.0, 1); gh.rotation.y = Math.PI / 2; scene.add(gh);
    const gq = label('“whose hands are bestowed with the magic of forming and reforming the world’s parts and their relationships?”', 0.3, { font: 'Fjalla One', color: HEX.amber, size: 70 }); gq.position.set(-29.5, 6.9, 1); gq.rotation.y = Math.PI / 2; scene.add(gq);
    const sk = label('SKATE BOWL', 1.0, { font: 'Bungee', color: HEX.pink, glow: HEX.pink, stroke: '#1a0838', size: 110 }); sk.position.set(-12.85, 2.2, 8.5); sk.rotation.y = Math.PI / 2; scene.add(sk);
    sound.push({ kind: 'roll', pos: new THREE.Vector3(-21, 1, 1), opts: { v: 0, id: 'roll' } });
  }

  // ---------------- TRAMPOLINES (east) + mezzanine ----------------
  {
    const matShader = (col) => {
      const m = new THREE.MeshStandardMaterial({ color: '#160a2a', roughness: 0.4, emissive: col, emissiveIntensity: 0.35 });
      m.userData.dip = { value: 0 };
      m.onBeforeCompile = sh => {
        sh.uniforms.uDip = m.userData.dip;
        sh.vertexShader = 'uniform float uDip;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          float rr = length(position.xy)/2.2; transformed.z -= uDip*(1.0-smoothstep(0.0,1.0,rr));`);
      };
      return m;
    };
    let idx = 0;
    for (const x of [18, 25]) for (const z of [-4, 2, 8]) {
      const col = NEON[idx % NEON.length];
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.16, 10, 6).rotateX(Math.PI / 2).rotateY(Math.PI / 6), glow(col, 1.6)); frame.position.y = 0.62; g.add(frame);
      const mm = matShader(col);
      const surf = new THREE.Mesh(new THREE.CircleGeometry(2.1, 6, Math.PI / 6).rotateX(-Math.PI / 2), mm); surf.position.y = 0.6;
      // CircleGeometry rotated: displacement uses local z which after rotateX maps to world y (negated) — so rebuild unrotated and rotate the mesh instead
      surf.geometry = new THREE.CircleGeometry(2.1, 24); surf.rotation.x = -Math.PI / 2; g.add(surf);
      for (let l = 0; l < 6; l++) { const a = l / 6 * Math.PI * 2 + Math.PI / 6; const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), mat('#ddd', { m: 1 })); leg.position.set(Math.cos(a) * 2.2, 0.3, Math.sin(a) * 2.2); g.add(leg); }
      g.position.set(x, 0, z); scene.add(g);
      const t = { x, z, i: idx, mm, dip: 0, frame };
      tramps.push(t);
      terrain.box(x - 1.95, x + 1.95, z - 1.95, z + 1.95, 0.5, { kind: 'tramp', data: t });
      idx++;
    }
    const tl = label('PLAYIFICATION', 1.0, { font: 'Bungee', color: HEX.lime, glow: HEX.lime, stroke: '#1a0838', size: 110 }); tl.position.set(29.6, 12.0, -6); tl.rotation.y = -Math.PI / 2; scene.add(tl);
    const tq = label('“the playing is playing with the rules themselves”', 0.36, { font: 'Fjalla One', color: HEX.cream, glow: HEX.lime, size: 70 }); tq.position.set(29.6, 10.9, -6); tq.rotation.y = -Math.PI / 2; scene.add(tq);
    // mezzanine x 14..29.7, z 15..29.7, top 7.5
    const mz = new THREE.Mesh(new THREE.BoxGeometry(15.7, 0.5, 14.7), mat('#25258c', { m: 0.3, r: 0.4, e: '#480e9e', ei: 0.3 })); mz.position.set(21.85, 7.25, 22.35); scene.add(mz);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(15.7, 0.08, 0.08), glow(HEX.lime, 3)); edge.position.set(21.85, 7.52, 15.0); scene.add(edge);
    const edge2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 14.7), glow(HEX.lime, 3)); edge2.position.set(14.0, 7.52, 22.35); scene.add(edge2);
    for (const [x, z] of [[14.4, 15.4], [14.4, 29], [21.8, 15.4]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7, 12), mat('#c0c0d0', { m: 0.9, r: 0.2 })); p.position.set(x, 3.5, z); scene.add(p); terrain.wall(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 7); }
    terrain.box(14, W, 15, W, 7.5, { kind: 'metal', bottom: 7.0 });
    // launch pad up to the mezzanine
    const lp = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.2, 32), glow(HEX.lime, 1.4)); lp.position.set(11, 0.1, 21); scene.add(lp);
    const lpl = label('LAUNCH ↑', 0.35, { font: 'Bungee', color: HEX.lime, glow: HEX.lime, size: 80 }); lpl.position.set(11, 0.9, 21); lpl.userData.billboard = true; scene.add(lpl);
    terrain.box(9.9, 12.1, 19.9, 22.1, 0.2, { kind: 'launch', data: { target: new THREE.Vector3(21, 7.5, 22), T: 1.5 } });
    updaters.push((dt, t) => { lp.material.emissiveIntensity = 1 + Math.sin(t * 6) * 0.6 + shared.uBeat.value; });
    // DJ booth under the mezzanine
    const dj = new THREE.Group();
    dj.add(new THREE.Mesh(new RoundedBoxGeometry(4, 1.1, 1.2, 2, 0.08), mat('#120626', { m: 0.4 })));
    dj.children[0].position.y = 0.55;
    const front = label('1DER FM', 0.4, { font: 'Bungee', color: HEX.pink, glow: HEX.pink, size: 90 }); front.position.set(0, 0.55, 0.61); dj.add(front);
    const speakers = [];
    for (const s of [-1, 1]) {
      const sp = new THREE.Group(); sp.add(new THREE.Mesh(new RoundedBoxGeometry(1.4, 2.6, 1.2, 2, 0.08), mat('#120626')));
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.35, 0.15, 24).rotateX(Math.PI / 2), mat('#333', { m: 0.5 })); cone.position.set(0, -0.4, 0.62); sp.add(cone);
      const ringL = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.04, 6, 24), glow(HEX.magenta, 2)); ringL.position.set(0, -0.4, 0.63); sp.add(ringL);
      sp.position.set(s * 3, 1.3, 0); dj.add(sp); speakers.push(cone);
    }
    dj.position.set(22, 0, 26); dj.rotation.y = Math.PI; scene.add(dj);
    terrain.wall(17, 27, 25, 27.2, 2.6);
    updaters.push(() => { const s = 1 + shared.uBass.value * 0.5; speakers.forEach(c => c.scale.set(s, s, 1)); });
  }
  // mezzanine slide down to the plaza
  const mezzCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(16.2, 7.95, 16.2), new THREE.Vector3(14.0, 7.3, 14.0), new THREE.Vector3(10.5, 6.2, 15.5), new THREE.Vector3(8.0, 5.0, 13.5),
    new THREE.Vector3(8.5, 3.9, 10.6), new THREE.Vector3(11.4, 3.0, 11.6), new THREE.Vector3(10.8, 2.0, 14.4), new THREE.Vector3(7.6, 1.2, 14.6),
    new THREE.Vector3(5.2, 0.6, 12.0), new THREE.Vector3(4.2, 0.45, 9.8),
  ], false, 'centripetal');
  {
    const tubeM = new THREE.Mesh(new THREE.TubeGeometry(mezzCurve, 240, 0.95, 16, false), new THREE.MeshStandardMaterial({ color: HEX.amber, emissive: HEX.orange, emissiveIntensity: 0.25, transparent: true, opacity: 0.45, side: THREE.DoubleSide, roughness: 0.2, depthWrite: false }));
    scene.add(tubeM);
    for (let i = 0; i < 40; i++) { const t = i / 40, p = mezzCurve.getPointAt(t); const r = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.05, 6, 24), glow(NEON[i % NEON.length], 2)); r.position.copy(p); r.lookAt(p.clone().add(mezzCurve.getTangentAt(t))); scene.add(r); }
    const sl = label('SLIDE ↓', 0.5, { font: 'Bungee', color: HEX.amber, glow: HEX.amber, size: 90 }); sl.position.set(16.2, 9.6, 16.4); sl.userData.billboard = true; scene.add(sl);
    terrain.box(15.2, 17.2, 15.2, 17.0, 7.51, { kind: 'trigger', data: { ride: 'mezz' }, bottom: 7.0 });
  }

  // ---------------- TRAPDOORS ----------------
  for (const t of TRAPS) {
    const g = new THREE.Group(); g.position.set(t.x, 0, t.z);
    const s = t.s;
    const lid = (side) => { const p = new THREE.Group(); p.position.x = side * s / 2; const m = new THREE.Mesh(new THREE.BoxGeometry(s / 2, 0.06, s), mat('#ffbf00', { m: 0.7, r: 0.3 })); m.position.x = -side * s / 4; p.add(m); const st = new THREE.Mesh(new THREE.BoxGeometry(s / 2 - 0.1, 0.065, 0.12), mat('#1a0838')); st.position.x = -side * s / 4; p.add(st); g.add(p); return p; };
    const L = lid(-1), R = lid(1);
    const frame = new THREE.Mesh(new THREE.TorusGeometry(s * 0.72, 0.06, 4, 4).rotateX(Math.PI / 2).rotateY(Math.PI / 4), glow(HEX.red, 2.5)); frame.position.y = 0.04; g.add(frame);
    // the shaft below: code rain walls
    const shaftTex = codeAtlas(selfCode || '// down the rabbit hole', 512, 1024, 18);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(s, 20, s), codeStreamMaterial(shaftTex, { speed: 3, cols: 24, repeatY: 1, hot: C.lime, head: C.cream }));
    shaft.material.side = THREE.BackSide; shaft.position.y = -10; g.add(shaft);
    const warn = label('ENDOGENOUS MAGIC ↓', 0.28, { font: 'Bungee', color: HEX.red, glow: HEX.red, size: 80 }); warn.position.set(0, 0.03, s / 2 + 0.35); warn.rotation.x = -Math.PI / 2; g.add(warn);
    scene.add(g);
    const td = { ...t, g, L, R, open: 0, target: 0, timer: 0 };
    trapdoors.push(td);
    td.box = terrain.box(t.x - s / 2 + 0.25, t.x + s / 2 - 0.25, t.z - s / 2 + 0.25, t.z + s / 2 - 0.25, 0.002, { kind: 'trap', data: td });
  }
  updaters.push((dt) => {
    for (const t of trapdoors) {
      if (t.timer > 0) { t.timer -= dt; if (t.timer <= 0) t.target = 0; }
      t.open += (t.target - t.open) * Math.min(1, dt * (t.target ? 18 : 4));
      t.L.rotation.z = -t.open * 1.6; t.R.rotation.z = t.open * 1.6;
      t.box.active = t.open < 0.3 && t.target === 0;
    }
  });

  // ---------------- MAKER SHOP (south) ----------------
  const shop = {};
  {
    // pegboards, laser row and print farm live in shopfab.js
    shop.fab = buildFab(scene, terrain, fxQueue);
    updaters.push((dt, t) => shop.fab.update(dt, t));
    // place(): add a machine at a scale and give it a matching collision footprint
    const place = (obj, x, z, s, w, d, ht, rotY = 0) => { obj.scale.setScalar(s); obj.position.set(x, obj.position.y, z); obj.rotation.y = rotY; scene.add(obj); terrain.wall(x - w * s / 2, x + w * s / 2, z - d * s / 2, z + d * s / 2, ht * s); return obj; };
    const S = 1.5;
    // left: wood + metal
    place(workbench(4), -24, -28.4, S, 4, 1, 1);
    shop.saw = place(tableSaw(), -19, -24.5, S, 1.6, 1.2, 0.9);
    place(drillPress(), -13.8, -28.6, S, 0.6, 0.6, 2);
    shop.anvil = place(anvil(), -10.8, -24.2, S, 0.9, 0.4, 1);
    const welder = new THREE.Group(); welder.add(new THREE.Mesh(new RoundedBoxGeometry(0.8, 1.0, 0.6, 2, 0.06), mat(HEX.blue, { r: 0.4 }))); welder.children[0].position.y = 0.5;
    const torch = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), glow('#bff8ff', 6)); torch.position.set(0.9, 1.0, 0.4); welder.add(torch);
    place(welder, -17, -28.7, S, 0.8, 0.6, 1); shop.torch = torch;
    place(bandsaw(), -27.6, -22.5, S, 0.8, 0.8, 2);
    place(lumberRack(), -28.9, -14.5, 1.3, 0.6, 3.4, 3, Math.PI / 2);
    place(toolChest(HEX.red), -26.5, -18.2, S, 1.2, 0.6, 1.2, Math.PI / 2);
    place(toolChest(HEX.blue), -14.5, -21.5, S, 1.2, 0.6, 1.2, Math.PI);
    // right: digital fabrication
    shop.laser = shop.fab.lasers[0];
    shop.jet = place(waterjet(), 21, -27.2, S, 3, 2, 1.9);
    shop.printers = shop.fab.printers;
    shop.cnc = place(cncRouter(), 27, -14.5, S, 1.8, 2.6, 1.6, Math.PI / 2);
    shop.arm = place(robotArm(), 10.5, -21.5, S, 1.2, 1.2, 4);
    place(partsShelf(), 16, -29.2, S, 2, 0.5, 2.4);
    place(toolChest(HEX.lime), 25.5, -29.0, S, 1.2, 0.6, 1.2);
    const lc = shop.laser, wj = shop.jet, ts = shop.saw, av = shop.anvil;
    // microcontroller programming stations
    const scrTex = codeAtlas(selfCode || '// flash it', 512, 512, 16);
    shop.stations = [];
    for (const [x, z] of [[15.5, -21.5], [21.5, -21.5], [-21, -20.5]]) {
      const st = mcuStation(codeStreamMaterial(scrTex, { speed: 2, cols: 30, repeatY: 1, opacity: 1 }));
      st.position.set(x, 0, z); st.rotation.y = Math.PI; st.scale.setScalar(1.3); scene.add(st); shop.stations.push(st);
      terrain.wall(x - 1.3, x + 1.3, z - 0.6, z + 0.6, 1.2);
      interact.push({ obj: st, label: 'Program the microcontroller (and play the banana)', dist: 6, action: 'mcu', data: { st } });
    }
    shop.fab.lasers.forEach(l => interact.push({ obj: l, label: 'Laser cutter: watch it cut', dist: 8, action: 'laser', data: { l } }));
    interact.push({ obj: wj, label: 'Waterjet: blast through steel', dist: 8, action: 'waterjet' });
    interact.push({ obj: av, label: 'Anvil: strike it', dist: 7, action: 'anvil', data: { pos: av.position.clone().add(new THREE.Vector3(0, 1.4, 0)) } });
    interact.push({ obj: shop.arm, label: 'Robot arm: wave hello', dist: 9, action: 'arm' });
    interact.push({ obj: shop.cnc, label: 'CNC router: carve', dist: 8, action: 'cnc' });
    interact.push({ obj: ts, label: 'Table saw: spin up', dist: 6, action: 'saw' });
    interact.push({ obj: welder, label: 'Welder: lay a bead', dist: 7, action: 'weld', data: { pos: welder.position.clone().add(new THREE.Vector3(1.3, 1.5, 0.6)) } });
    shop.printers.forEach(p => interact.push({ obj: p, label: '3D printer', dist: 5, action: 'printer', data: { p } }));
    sound.push({ kind: 'machine', pos: new THREE.Vector3(21, 1.5, -27.2), opts: { v: 0.07, freq: 70, hiss: 4000 } });
    sound.push({ kind: 'machine', pos: new THREE.Vector3(16.6, 1.2, -17.6), opts: { v: 0.05, freq: 110, hiss: 2400 } });
    sound.push({ kind: 'machine', pos: new THREE.Vector3(27.6, 1.4, -21.4), opts: { v: 0.04, freq: 160, hiss: 5200 } });
    // drawdio board: draw with sound (Drawdio: resistance -> pitch; here: height -> pitch)
    const dc = document.createElement('canvas'); dc.width = 1024; dc.height = 512;
    const dg = dc.getContext('2d'); dg.fillStyle = '#0d0420'; dg.fillRect(0, 0, 1024, 512);
    dg.font = '44px Bungee'; dg.fillStyle = HEX.amber; dg.fillText('DRAWDIO WALL', 30, 70);
    dg.font = '26px "Fjalla One"'; dg.fillStyle = HEX.cream; dg.fillText('click to draw. high lines sing high. lens × block.', 30, 110);
    const dtex = tex(dc);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshBasicMaterial({ map: dtex, toneMapped: false }));
    board.position.set(-19, 7.5, -29.8); scene.add(board);
    const bframe = new THREE.Mesh(new THREE.BoxGeometry(8.4, 4.4, 0.1), glow(HEX.amber, 1.2)); bframe.position.set(-19, 7.5, -29.9); scene.add(bframe);
    shop.drawdio = { mesh: board, canvas: dc, ctx: dg, tex: dtex };
    interact.push({ obj: board, label: 'Drawdio wall: draw with sound', dist: 16, action: 'drawdio' });
    // shop signage
    const lb = label('LENS × BLOCK', 1.5, { font: 'Bungee', gradient: [HEX.amber, HEX.red], glow: HEX.orange, stroke: '#1a0838', size: 120 }); lb.position.set(0, 12.6, -29.8); scene.add(lb);
    const fw = label('“so form became feeling.”  ~Frank Lloyd Wright', 0.45, { font: 'Fjalla One', color: HEX.cream, glow: HEX.orange, size: 80 }); fw.position.set(0, 11.2, -29.8); scene.add(fw);
    const hu = label('HURRY UP AND INVENT SOMETHING', 0.5, { font: 'Bungee', color: HEX.lime, glow: HEX.lime, size: 90 }); hu.position.set(19, 6.2, -29.8); scene.add(hu);
    const wps = label('WILD PROJECT SPACE', 0.7, { font: 'Bungee', color: HEX.pink, glow: HEX.pink, size: 100 }); wps.position.set(-19, 10.5, -29.8); scene.add(wps);
  }

  // ---------------- GARAGE DOOR + BUTTON ----------------
  const garage = { open: 0, target: 0, moving: 0 };
  {
    const g = new THREE.Group(); g.position.set(0, 0, -30);
    const panels = [];
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Group();
      const hasWin = i === 3;
      const steel = mat('#2c2350', { r: 0.35, m: 0.6 });
      if (hasWin) {
        // a strip of real windows: frame bars around clear glass, so the sunset shows through
        p.add(new THREE.Mesh(new THREE.BoxGeometry(14, 0.22, 0.12), steel).translateY(0.57));
        p.add(new THREE.Mesh(new THREE.BoxGeometry(14, 0.22, 0.12), steel).translateY(-0.57));
        for (let w = 0; w <= 5; w++) p.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.36, 0.12), steel).translateX(-7 + 0.2 + w * 2.72));
        for (let w = 0; w < 5; w++) {
          const gl = new THREE.Mesh(new THREE.PlaneGeometry(2.32, 0.92), new THREE.MeshPhysicalMaterial({ color: '#ffe0f0', transparent: true, opacity: 0.12, roughness: 0, depthWrite: false }));
          gl.position.set(-7 + 1.56 + w * 2.72, 0, 0.0); p.add(gl);
          const rim = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.03, 0.13), glow(HEX.pink, 2)); rim.position.set(-7 + 1.56 + w * 2.72, -0.47, 0); p.add(rim);
        }
      } else {
        p.add(new THREE.Mesh(new THREE.BoxGeometry(14, 1.36, 0.12), steel));
        for (const y of [-0.4, 0.4]) { const rib = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.05, 0.14), glow([HEX.pink, HEX.amber, HEX.lime, HEX.magenta, HEX.blue][i], 1.4)); rib.position.y = y; p.add(rib); }
      }
      p.userData.base = 0.7 + i * 1.4;
      p.position.y = p.userData.base; g.add(p); panels.push(p);
    }
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 14.6, 20).rotateZ(Math.PI / 2), mat('#2a1f40', { m: 0.6 })); housing.position.set(0, 7.6, 0.4); g.add(housing);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.1, 0.1), glow(HEX.amber, 3)); stripe.position.set(0, 7.0, 0.3); g.add(stripe);
    scene.add(g);
    garage.panels = panels;
    // big red mushroom button on a yellow box
    const btn = new THREE.Group();
    btn.add(new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.9, 0.4, 2, 0.06), mat(HEX.amber, { r: 0.4 })));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), mat(HEX.red, { r: 0.3, e: HEX.red, ei: 0.6 })); cap.position.z = 0.22; btn.add(cap);
    const bl = label('PUSH', 0.14, { font: 'Bungee', color: '#1a0838', size: 70 }); bl.position.set(0, -0.32, 0.21); btn.add(bl);
    btn.position.set(8.6, 1.4, -29.65); scene.add(btn);
    garage.cap = cap;
    interact.push({ obj: btn, label: 'Roll the garage door', dist: 14, action: 'garage' });
    // a halo that lights up when you're close enough to press it
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 40), glow(HEX.amber, 0)); halo.position.set(8.6, 1.4, -29.55); scene.add(halo);
    const haloLabel = label('PUSH ME', 0.22, { font: 'Bungee', color: HEX.amber, glow: HEX.amber, size: 80 }); haloLabel.position.set(8.6, 2.35, -29.55); haloLabel.visible = false; scene.add(haloLabel);
    garage.halo = halo; garage.haloLabel = haloLabel; garage.btnPos = btn.position.clone();
    const fl = label('THE OPEN FIELD →', 0.4, { font: 'Bungee', color: HEX.lime, glow: HEX.lime, size: 90 }); fl.position.set(0, 8.4, -29.7); scene.add(fl);
  }
  updaters.push((dt) => {
    const prev = garage.open;
    garage.open += Math.sign(garage.target - garage.open) * Math.min(Math.abs(garage.target - garage.open), dt / 2.6);
    garage.moving = Math.abs(garage.open - prev) > 1e-5;
    garage.panels.forEach((p, i) => {
      const y = p.userData.base + garage.open * 7.4;
      p.position.y = Math.min(y, 7.6);
      p.position.z = y > 7.4 ? 0.5 : 0;
      p.visible = y < 7.9;
    });
    garageBlock.active = garage.open < 0.75;
  });

  // ---------------- THE OPEN FIELD: a wildflower prairie in an air bubble, at permanent extreme sunset ----------------
  const prairie = { butterflies: null, bees: null, fireflies: null };
  {
    const f = new THREE.Group();
    const sky = new THREE.Mesh(new THREE.SphereGeometry(FIELD.r, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), skyMaterial());
    sky.position.copy(FIELD.center); f.add(sky);
    const skin = new THREE.Mesh(new THREE.SphereGeometry(FIELD.r + 0.5, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), bubbleMaterial());
    skin.position.copy(FIELD.center); f.add(skin);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(FIELD.r + 0.5, FIELD.r - 4, 8, 64, 1, true), mat('#3a2050', { r: 1 })); base.position.set(FIELD.center.x, -4, FIELD.center.z); f.add(base);
    const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), -30.05); // never draw prairie inside the hub
    // ground with rolling hills
    const gp = new THREE.PlaneGeometry(FIELD.r * 2, FIELD.r * 2, 120, 120).rotateX(-Math.PI / 2);
    const pa = gp.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i) + FIELD.center.x, z = pa.getZ(i) + FIELD.center.z;
      pa.setY(i, Math.hypot(x - FIELD.center.x, z - FIELD.center.z) > FIELD.r ? -1 : fieldHeight(x, z) - 0.02);
    }
    gp.computeVertexNormals();
    const ground = new THREE.Mesh(gp, new THREE.MeshStandardMaterial({ color: '#9a8a3a', roughness: 1, emissive: '#5a2a18', emissiveIntensity: 0.45, clippingPlanes: [clip] }));
    ground.position.set(FIELD.center.x, 0, FIELD.center.z); f.add(ground);
    const scatter = (n, minR = 0) => { const out = []; while (out.length < n) { const a = Math.random() * 6.28, r = minR + Math.sqrt(Math.random()) * (FIELD.r - 4 - minR); const x = FIELD.center.x + Math.cos(a) * r, z = FIELD.center.z + Math.sin(a) * r; if (z < -31.5) out.push([x, z]); } return out; };
    const sway = (amp) => sh => {
      sh.uniforms.uTime = shared.uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp = instanceMatrix*vec4(0.,0.,0.,1.); float k=clamp(position.y,0.0,2.0);
        float gust = sin(uTime*0.6 + wp.x*0.05 + wp.z*0.04)*0.5+0.5;
        transformed.x += sin(uTime*1.6 + wp.x*0.3 + wp.z*0.2)*k*k*${amp} * (0.5+gust);
        transformed.z += cos(uTime*1.2 + wp.x*0.2)*k*k*${amp}*0.6;`);
    };
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), cc = new THREE.Color(), up = new THREE.Vector3(0, 1, 0), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
    // tall prairie grasses: big bluestem, switchgrass, little bluestem, glowing gold in the low sun
    {
      const blade = new THREE.PlaneGeometry(0.09, 1.5, 1, 4); blade.translate(0, 0.75, 0);
      const gm = new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.8, emissive: '#5a2a08', emissiveIntensity: 0.5, clippingPlanes: [clip] });
      gm.onBeforeCompile = sway(0.18);
      const pts = scatter(65000), grass = new THREE.InstancedMesh(blade, gm, pts.length);
      const tones = ['#c9a23a', '#b0b84a', '#8a9a3a', '#d88a3a', '#b8552a', '#a6ee70'];
      pts.forEach(([x, z], i) => {
        q.setFromAxisAngle(up, Math.random() * 6.28).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (Math.random() - 0.5) * 0.5));
        const s = 0.35 + Math.random() * 0.6;
        m4.compose(v3.set(x, fieldHeight(x, z), z), q, sc.set(1, s, 1)); grass.setMatrixAt(i, m4);
        grass.setColorAt(i, cc.set(tones[Math.floor(Math.random() ** 1.6 * tones.length)]));
      });
      f.add(grass);
    }
    // wildflowers: stems + heads, several species, all instanced
    {
      const stemGeo = new THREE.CylinderGeometry(0.012, 0.016, 1, 4); stemGeo.translate(0, 0.5, 0);
      const stemMat = new THREE.MeshStandardMaterial({ color: '#4a7a2a', roughness: 0.9, clippingPlanes: [clip] }); stemMat.onBeforeCompile = sway(0.12);
      const species = [
        // name, head geometry, colors, count, height range
        ['coneflower', (() => { const g = new THREE.ConeGeometry(0.16, 0.06, 12, 1, true); g.rotateX(Math.PI); return g; })(), ['#ff6caf', '#e35aa8', '#c442dc'], 7279, [0.7, 1.4]],
        ['black-eyed susan', new THREE.CircleGeometry(0.13, 10).rotateX(-Math.PI / 2 + 0.3), ['#ffbf00', '#ffaa00', '#ff8000'], 8680, [0.5, 1.1]],
        ['lupine', new THREE.ConeGeometry(0.06, 0.4, 6), ['#7a5cff', '#4c97ff', '#b07cff'], 5040, [0.5, 1.0]],
        ['blazing star', new THREE.CylinderGeometry(0.035, 0.05, 0.5, 6), ['#c442dc', '#a63ad0', '#ff6caf'], 5040, [0.8, 1.5]],
        ['milkweed', new THREE.IcosahedronGeometry(0.11, 0), ['#ff9ab8', '#ffb3c9', '#e8112d'], 3639, [0.7, 1.3]],
        ['goldenrod', new THREE.ConeGeometry(0.07, 0.4, 6), ['#ffd84a', '#ffbf00'], 6440, [0.7, 1.1]],
        ['aster', new THREE.CircleGeometry(0.07, 8).rotateX(-Math.PI / 2 + 0.4), ['#fff3e0', '#d8c8ff', '#a6ee70'], 5880, [0.3, 0.8]],
      ];
      let stemTotal = species.reduce((a, s) => a + s[3], 0);
      const stems = new THREE.InstancedMesh(stemGeo, stemMat, stemTotal);
      let si = 0;
      for (const [, geo, cols, n, [h0, h1]] of species) {
        const hm = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide, clippingPlanes: [clip] });
        hm.onBeforeCompile = sh => {
          sh.uniforms.uTime = shared.uTime;
          sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            vec4 wp = instanceMatrix*vec4(0.,0.,0.,1.); float k = clamp(wp.y - ${FIELD.center.y.toFixed(1)}, 0.0, 2.0);
            float gust = sin(uTime*0.6 + wp.x*0.05 + wp.z*0.04)*0.5+0.5;
            transformed.x += sin(uTime*1.6 + wp.x*0.3 + wp.z*0.2)*0.12*(0.5+gust)*1.6;
            transformed.z += cos(uTime*1.2 + wp.x*0.2)*0.07*1.6;`);
        };
        const heads = new THREE.InstancedMesh(geo, hm, n);
        // clustered drifts, like a real prairie
        const centers = scatter(Math.ceil(n / 120));
        for (let i = 0; i < n; i++) {
          const [cx, cz] = centers[i % centers.length];
          const x = cx + (Math.random() - 0.5) * 9, z = Math.min(-31.6, cz + (Math.random() - 0.5) * 9);
          if (Math.hypot(x - FIELD.center.x, z - FIELD.center.z) > FIELD.r - 4) { m4.makeScale(0, 0, 0); heads.setMatrixAt(i, m4); stems.setMatrixAt(si++, m4); continue; }
          const h = (h0 + Math.random() * (h1 - h0)) * 0.78, g = fieldHeight(x, z);
          q.setFromAxisAngle(up, Math.random() * 6.28);
          m4.compose(v3.set(x, g, z), q, sc.set(1, h, 1)); stems.setMatrixAt(si++, m4);
          m4.compose(v3.set(x, g + h, z), q, sc.setScalar(0.6 + Math.random() * 0.45)); heads.setMatrixAt(i, m4);
          heads.setColorAt(i, cc.set(cols[i % cols.length]));
        }
        f.add(heads);
      }
      f.add(stems);
    }
    // pollinators: monarch butterflies (flapping), bumblebees (zippy), fireflies (blinking) — all GPU animated
    {
      const wing = new THREE.PlaneGeometry(0.22, 0.16); wing.translate(0.11, 0, 0);
      const wingGeo = new THREE.BufferGeometry().copy(wing);
      const both = wing.clone(); both.scale(-1, 1, 1);
      const merged = new THREE.BufferGeometry();
      const p1 = wing.attributes.position.array, p2 = both.attributes.position.array;
      merged.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...p1, ...p2]), 3));
      merged.setIndex([...wing.index.array, ...[...both.index.array].map(i => i + 4)]);
      merged.computeVertexNormals(); wingGeo.dispose();
      const bm = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide, toneMapped: false });
      bm.onBeforeCompile = sh => {
        sh.uniforms.uTime = shared.uTime;
        sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          vec4 wp = instanceMatrix*vec4(0.,0.,0.,1.); float ph = wp.x*1.7+wp.z*0.9;
          float flap = sin(uTime*14.0 + ph)*0.9;
          float side = sign(position.x);
          transformed.y += abs(position.x)*sin(flap)*1.2;
          transformed.x *= cos(flap);`)
          .replace('#include <project_vertex>', `
          vec3 drift = vec3(sin(uTime*0.35+ph)*4.0, sin(uTime*1.3+ph*2.0)*0.6, cos(uTime*0.3+ph)*4.0);
          vec4 mvPosition = vec4(transformed, 1.0);
          mvPosition = instanceMatrix * mvPosition; mvPosition.xyz += drift;
          mvPosition = modelViewMatrix * mvPosition;
          gl_Position = projectionMatrix * mvPosition;`);
      };
      const nB = 700, bf = new THREE.InstancedMesh(merged, bm, nB);
      scatter(nB).forEach(([x, z], i) => {
        q.setFromAxisAngle(up, Math.random() * 6.28);
        m4.compose(v3.set(x, fieldHeight(x, z) + 1.2 + Math.random() * 2.2, z), q, sc.setScalar(0.5 + Math.random() * 0.45)); bf.setMatrixAt(i, m4);
        bf.setColorAt(i, cc.set(Math.random() < 0.7 ? '#ff8000' : [HEX.pink, HEX.amber, HEX.blue, '#fff3e0'][i % 4]));
      });
      bf.frustumCulled = false; f.add(bf); prairie.butterflies = bf;
      // bees + fireflies as glowing points
      const nP = 2400, pp = new Float32Array(nP * 3), pk = new Float32Array(nP);
      scatter(nP).forEach(([x, z], i) => { pp.set([x, fieldHeight(x, z) + 0.6 + Math.random() * 2.6, z], i * 3); pk[i] = i < 900 ? 0 : 1; });
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('kind', new THREE.BufferAttribute(pk, 1));
      const pm = new THREE.ShaderMaterial({
        uniforms: { uTime: shared.uTime },
        vertexShader: `attribute float kind; uniform float uTime; varying float vK; varying float vB;
          void main(){ vK=kind; vec3 p=position; float ph=p.x*3.1+p.z*1.7;
            if(kind<0.5){ p += vec3(sin(uTime*3.0+ph)*1.2, sin(uTime*7.0+ph)*0.3, cos(uTime*2.6+ph)*1.2); vB=1.0; }
            else { p += vec3(sin(uTime*0.4+ph)*1.5, sin(uTime*0.7+ph)*0.8, cos(uTime*0.35+ph)*1.5); vB=smoothstep(0.6,1.0,sin(uTime*2.0+ph*5.0)); }
            vec4 mv=modelViewMatrix*vec4(p,1.); gl_PointSize=min(14.0,(kind<0.5?0.05:0.12)*600.0/-mv.z); gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `varying float vK; varying float vB; void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); if(d>0.5) discard;
            vec3 col = vK<0.5 ? (step(0.0,sin(gl_PointCoord.y*18.0))>0.5? vec3(1.0,0.78,0.0):vec3(0.1,0.05,0.0)) : vec3(0.85,1.0,0.35)*2.5*vB;
            float a = vK<0.5 ? 1.0 : smoothstep(0.5,0.0,d)*vB; gl_FragColor=vec4(col*a, a); }`,
        transparent: true, depthWrite: false, toneMapped: false,
      });
      const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; f.add(pts); prairie.bees = pts;
    }
    // floating islands, each with its own wildflower patch
    const islands = [];
    for (let i = 0; i < 4; i++) {
      const isl = new THREE.Group();
      const rock = new THREE.Mesh(new THREE.ConeGeometry(4, 6, 7).rotateX(Math.PI), mat('#4a2a6a', { r: 0.9 })); rock.position.y = -3; isl.add(rock);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.6, 7), mat('#8a9a3a')); isl.add(top);
      for (let k = 0; k < 40; k++) { const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), glow(NEON[(k + i) % NEON.length], 0.6)); const a = Math.random() * 6.28, r = Math.random() * 3.4; fl.position.set(Math.cos(a) * r, 0.6, Math.sin(a) * r); isl.add(fl); }
      isl.position.set((i - 1.5) * 30, 26 + i * 4, -130 - (i % 2) * 30); f.add(isl); islands.push(isl);
    }
    updaters.push((dt, t) => islands.forEach((s, i) => { s.position.y = 26 + i * 4 + Math.sin(t * 0.4 + i) * 1.5; s.rotation.y = t * 0.05 * (i % 2 ? 1 : -1); }));
    // the big question on the hill, backlit by the sun
    const ww = label('WHAT WOULD BE WONDERFUL?', 7, { font: 'Bungee', gradient: [HEX.cream, HEX.amber], glow: HEX.red, stroke: '#1a0838', size: 120 });
    ww.position.set(0, 30, -190); f.add(ww);
    for (const [txt, x, z] of [['NATURE AS INTERFACE', -32, -95], ['MODERN NATURE', 34, -100], ['POLLINATOR MADNESS', -22, -150], ['QUESTIONS VS ANSWERS', 26, -150]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 6), mat('#6a3a2a')); post.position.set(x, fieldHeight(x, z) + 1.5, z); f.add(post);
      const s = label(txt, 0.7, { font: 'Bungee', color: '#1a0838', bg: HEX.cream, border: HEX.pink, size: 80 }); s.position.set(x, fieldHeight(x, z) + 3.4, z); s.lookAt(0, 3, -30); f.add(s);
    }
    // a giant kicker ramp in the prairie: launch into the sunset
    const k0 = -52, k1 = -62, kx = 18;
    const kick = (x, z) => Math.max(0, Math.min(1, (k0 - z) / (k0 - k1))) * 4;
    terrain.fn(kx - 4, kx + 4, k1, k0, kick, { kind: 'skate' });
    const kg = new THREE.BufferGeometry();
    kg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([kx - 4, 0, k0, kx + 4, 0, k0, kx + 4, 4, k1, kx - 4, 0, k0, kx + 4, 4, k1, kx - 4, 4, k1]), 3)); kg.computeVertexNormals();
    f.add(new THREE.Mesh(kg, new THREE.MeshStandardMaterial({ color: HEX.magenta, side: THREE.DoubleSide, emissive: HEX.pink, emissiveIntensity: 0.3 })));
    const back = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), mat('#2a0d52')); back.position.set(kx, 2, k1); f.add(back);
    scene.add(f);
    sound.push({ kind: 'wind', pos: new THREE.Vector3(0, 6, -120), opts: { v: 0.2, ref: 30, rolloff: 0.5, max: 300 } });
    for (const [x, z] of [[-20, -70], [18, -85], [-10, -120], [30, -130], [-35, -150], [5, -160]]) sound.push({ kind: 'bees', pos: new THREE.Vector3(x, fieldHeight(x, z) + 1, z), opts: { v: 0.16, ref: 3, rolloff: 1.5, max: 40 } });
  }

  // ambient underwater hum at each wall
  for (const p of [[-31, 6, 0], [31, 6, 0], [0, 9, 31]]) sound.push({ kind: 'underwater', pos: new THREE.Vector3(...p), opts: { v: 0.18, ref: 8, rolloff: 1 } });

  // ---------------- per-frame ----------------
  updaters.push((dt, t) => {
    // fish schools orbit the hub
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s1 = new THREE.Vector3(1, 1, 1);
    for (const s of schools) {
      const base = t * s.speed + s.phase;
      s.fish.forEach((f, i) => {
        const a = base + f.o * 0.08, R = s.R + f.r + Math.sin(t + f.o) * 1.5;
        const x = Math.cos(a) * R, z = Math.sin(a) * R, y = s.Y + f.y + Math.sin(t * 2 + f.o * 3) * 0.6;
        e.set(0, -a + (s.speed > 0 ? Math.PI : 0), Math.sin(t * 8 + f.o) * 0.2);
        q.setFromEuler(e); m4.compose(new THREE.Vector3(x, y, z), q, s1); s.im.setMatrixAt(i, m4);
      });
      s.im.instanceMatrix.needsUpdate = true;
    }
    jellies.forEach(j => { const p = Math.sin(t * 1.4 + j.ph); j.g.position.y = j.base + Math.sin(t * 0.3 + j.ph) * 3; j.bell.scale.set(1 + p * 0.12, 1 - p * 0.15, 1 + p * 0.12); });
    const wa = t * 0.025;
    whale.position.set(Math.cos(wa) * 120, 22 + Math.sin(t * 0.1) * 4, Math.sin(wa) * 120 + 20);
    whale.rotation.y = -wa - Math.PI / 2 + Math.PI;
    whale.userData.tail.rotation.z = Math.sin(t * 1.2) * 0.3;
    lens.rotation.y = t * 0.2; lens.position.y = 10.5 + Math.sin(t * 0.8) * 0.3;
    lens.userData.block.rotation.set(t * 0.5, t * 0.7, 0);
    lensText.rotation.y = -t * 0.12;
    geyser.material.opacity = 0.35 + shared.uBeat.value * 0.5;
    tubeRings.forEach(({ r, t: tt }) => { r.material.emissiveIntensity = 1.2 + Math.max(0, Math.sin(tt * 60 - t * 6)) * 2.5; });
    for (const tr of tramps) { tr.dip *= Math.pow(0.002, dt); tr.mm.userData.dip.value = Math.sin(t * 30) * tr.dip * 0.2 + tr.dip; tr.frame.material.emissiveIntensity = 1.4 + tr.dip * 4 + shared.uBeat.value; }
    lights.plaza.intensity = 26 + shared.uBass.value * 40;
    // shop machines
    const wj = shop.jet.userData; wj.nozzle.position.x = Math.sin(t * 0.7) * 1.2; wj.jet.position.x = wj.nozzle.position.x; wj.jet.scale.y = 0.8 + Math.random() * 0.4;
    shop.stations.forEach((st, i) => st.userData.leds.forEach((l, k) => { l.material = glow([HEX.lime, HEX.amber, HEX.pink][k % 3], Math.sin(t * 7 + k + i) > 0.2 ? 3 : 0.1); }));
    shop.saw.userData.blade.rotation.x += dt * (shop.sawSpin || 0); shop.sawSpin = (shop.sawSpin || 0) * Math.pow(0.4, dt);
    shop.torch.material.emissiveIntensity = Math.random() < 0.3 ? 12 : 3;
    const ar = shop.arm.userData, wave = shop.armWave || 0;
    ar.yawJ.rotation.y = Math.sin(t * 0.5) * 1.2 + wave * Math.sin(t * 9) * 0.5;
    ar.shoulder.rotation.z = Math.sin(t * 0.7) * 0.5 - 0.2; ar.elbow.rotation.z = Math.sin(t * 0.9 + 1) * 0.8 + 0.6 + wave * Math.sin(t * 12) * 0.6;
    ar.wrist.rotation.z = Math.sin(t * 1.3) * 0.6; shop.armWave = wave * Math.pow(0.3, dt);
    const cn = shop.cnc.userData; cn.gantry.position.x = Math.sin(t * 0.6) * 0.9; cn.spindle.position.z = Math.sin(t * 1.7) * 0.6; cn.spindle.rotation.y += dt * 40;
  });
  // billboards
  const billboards = []; scene.traverse(o => { if (o.userData && o.userData.billboard) billboards.push(o); });

  function zoneAt(p) {
    if (p.z < -30.4) return 'field';
    if (p.y > 6.5 && p.x > 13.5 && p.z > 14.5) return 'mezz';
    if (p.x < -12.8 && p.z > HP.minZ - 1 && p.z < HP.maxZ + 1) return 'skate';
    if (p.x > 13.5 && p.z < 12) return 'tramp';
    if (p.z > 18.5 && p.x < 12.5) return 'buffet';
    if (p.z < -19.5) return 'shop';
    return 'plaza';
  }

  return {
    scene, terrain, interact, sound, trapdoors, fxQueue, tramps, garage, shop, lens, billboards, bubbleVents,
    entryCurve, mezzCurve, whale, zoneAt,
    update(dt, t, camera) {
      updaters.forEach(f => f(dt, t));
      for (const b of billboards) b.quaternion.copy(camera.quaternion);
      const near = camera.position.distanceTo(garage.btnPos) < 14;
      garage.halo.material = glow(HEX.amber, near ? 2.5 + Math.sin(t * 6) * 1.2 : 0);
      garage.cap.material = mat(HEX.red, { r: 0.3, e: HEX.red, ei: near ? 1.6 + Math.sin(t * 6) * 0.8 : 0.4 });
      garage.halo.scale.setScalar(near ? 1 + Math.sin(t * 6) * 0.06 : 1);
      garage.haloLabel.visible = near; garage.haloLabel.quaternion.copy(camera.quaternion);
    },
    spots: {
      plaza: { pos: new THREE.Vector3(0, 0, 4.5), yaw: 0 },
      buffet: { pos: new THREE.Vector3(-12, 0, 20.5), yaw: 0.0 + Math.PI },
      skate: { pos: new THREE.Vector3(-21, 0, -10.5), yaw: Math.PI },
      tramp: { pos: new THREE.Vector3(21.5, 0, -10), yaw: Math.PI },
      shop: { pos: new THREE.Vector3(0, 0, -20), yaw: 0 },
      field: { pos: new THREE.Vector3(0, 0, -36), yaw: 0 },
      mezz: { pos: new THREE.Vector3(22, 7.5, 20), yaw: Math.PI / 2 },
    },
  };
}
