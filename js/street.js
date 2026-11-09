// The front door: a taco truck in a parking lot at night. It only serves tacos... unless you step inside
// and open the washer in the back. That's the speakeasy.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Terrain } from './terrain.js';
import { label, circuitWall, tex, stripes, canvas } from './textures.js';
import { HEX } from './palette.js';
import { mat, glow, FOODS } from './props.js';
import { sudsMaterial, vortexMaterial, shared } from './shaders.js';

function asphaltTexture() {
  const c = canvas(1024, 1024), g = c.getContext('2d');
  g.fillStyle = '#26202e'; g.fillRect(0, 0, 1024, 1024);
  const d = g.getImageData(0, 0, 1024, 1024);
  for (let i = 0; i < d.data.length; i += 4) { const n = (Math.random() - 0.5) * 26; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
  g.putImageData(d, 0, 0);
  g.strokeStyle = 'rgba(10,8,14,0.6)'; g.lineWidth = 2;
  for (let i = 0; i < 14; i++) { g.beginPath(); let x = Math.random() * 1024, y = Math.random() * 1024; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (Math.random() - 0.5) * 80; y += (Math.random() - 0.5) * 80; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(12,8,18,0.35)'; g.beginPath(); g.ellipse(Math.random() * 1024, Math.random() * 1024, 30 + Math.random() * 60, 15 + Math.random() * 30, Math.random() * 3, 0, 7); g.fill(); }
  return tex(c, { repeat: [5, 5] });
}

function car(color) {
  const g = new THREE.Group();
  const paint = mat(color, { r: 0.25, m: 0.5 });
  const b = new THREE.Mesh(new RoundedBoxGeometry(4.3, 0.75, 1.85, 3, 0.2), paint); b.position.y = 0.62; g.add(b);
  const cab = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.62, 1.68, 3, 0.18), mat('#141022', { r: 0.1, m: 0.8 })); cab.position.set(-0.2, 1.22, 0); g.add(cab);
  for (const x of [-1.35, 1.35]) for (const z of [-0.85, 0.85]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 16).rotateX(Math.PI / 2), mat('#111')); w.position.set(x, 0.36, z); g.add(w); }
  for (const z of [-0.6, 0.6]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.35), glow('#fff3d0', 0.6)); hl.position.set(2.16, 0.72, z); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.4), glow('#ff2040', 1.2)); tl.position.set(-2.16, 0.72, z); g.add(tl);
  }
  return g;
}

function nightSky() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: shared.uTime },
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uTime; varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){ float y=clamp(vD.y,0.,1.);
        vec3 c=mix(vec3(0.42,0.12,0.38), vec3(0.16,0.05,0.32), smoothstep(0.0,0.18,y));
        c=mix(c, vec3(0.03,0.01,0.09), smoothstep(0.15,0.8,y));
        vec2 st=floor(vD.xz/(vD.y+0.05)*120.0);
        c+=vec3(1.)*step(0.996,h(st))*smoothstep(0.12,0.5,y)*(0.6+0.4*sin(uTime*2.+h(st)*30.));
        gl_FragColor=vec4(c,1.); }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
}

export function buildStreet() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a0318');
  scene.fog = new THREE.Fog('#1a0a2a', 30, 110);
  const terrain = new Terrain();
  const interact = [];
  const updaters = [];

  scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), nightSky()));
  scene.add(new THREE.HemisphereLight('#8a5cff', '#2a1838', 0.75));
  const moon = new THREE.DirectionalLight('#b9a6ff', 0.5); moon.position.set(-10, 20, 8); scene.add(moon);

  // ---------------- THE PARKING LOT ----------------
  // lot: x -22..22, z -11..30. Truck sits mid-lot; a 24h laundromat strip behind it.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1c1624', roughness: 0.95 }));
  ground.position.y = -0.01; scene.add(ground);
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(46, 44).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.55, metalness: 0.15 }));
  lot.position.set(0, 0, 9); scene.add(lot);
  // painted stall lines + curb stops on both sides
  const paint = new THREE.MeshBasicMaterial({ color: '#e8e2d4', toneMapped: false }); paint.color.multiplyScalar(0.6);
  const yellow = new THREE.MeshBasicMaterial({ color: '#c9a21a' });
  const line = (x, z, w, d, m = paint) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), m); l.position.set(x, 0.01, z); scene.add(l); };
  const carColors = [HEX.blue, '#f2eef8', '#2a2238', HEX.amber, '#6a6f80', HEX.red, '#1b4a3a', HEX.lime];
  let ci = 0;
  for (const side of [-1, 1]) {
    const xEdge = side * 13.5, xStall = side * 17;
    for (let z = -8; z <= 28; z += 3) line(xStall, z, 7, 0.12);
    line(xEdge, 10, 0.12, 36);
    for (let z = -6.5; z <= 26.5; z += 3) {
      const stop = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.14, 1.6), mat('#8a8494', { r: 0.9 })); stop.position.set(side * 20, 0.07, z); scene.add(stop);
      if ((z * 7 + side * 3) % 4 === 0 || Math.abs(z - 9.5) < 1) continue; // some empty stalls
      const c = car(carColors[ci++ % carColors.length]);
      c.position.set(side * 17.2, 0, z); c.rotation.y = side > 0 ? 0 : Math.PI; scene.add(c);
      terrain.wall(side * 17.2 - 2.2, side * 17.2 + 2.2, z - 1.0, z + 1.0, 1.6);
    }
  }
  // fire lane stripes in front of the laundromat
  for (let x = -10; x <= 10; x += 1.2) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 2.2).rotateX(-Math.PI / 2), yellow); s.position.set(x, 0.011, -8.6); s.rotation.y = 0.6; scene.add(s); }
  // curb + sidewalk
  const curb = new THREE.Mesh(new THREE.BoxGeometry(46, 0.15, 2.4), mat('#5a5464', { r: 0.9 })); curb.position.set(0, 0.075, -10.5); scene.add(curb);
  terrain.box(-23, 23, -11.7, -9.3, 0.15, { kind: 'floor' });

  // the strip: SPIN CITY 24H LAUNDROMAT (foreshadowing) + a closed nail salon
  const strip = new THREE.Mesh(new THREE.BoxGeometry(46, 6.5, 6), mat('#3a2a48', { r: 0.8 })); strip.position.set(0, 3.25, -14.7); scene.add(strip);
  terrain.wall(-23, 23, -17.7, -11.7, 7);
  const awn = new THREE.Mesh(new THREE.BoxGeometry(46, 0.25, 1.4), mat('#1a0838')); awn.position.set(0, 3.6, -11.1); scene.add(awn);
  // laundromat windows with glowing washers inside
  const win = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.6), new THREE.MeshBasicMaterial({ color: '#8fd8e8', toneMapped: false })); win.material.color.multiplyScalar(0.55);
  win.position.set(-4, 1.75, -11.68); scene.add(win);
  for (let i = 0; i < 9; i++) {
    const wsh = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), sudsMaterial()); wsh.position.set(-10 + i * 1.5, 1.3, -11.66); scene.add(wsh);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.05, 6, 24), mat('#d0d0e0', { m: 1, r: 0.2 })); ring.position.copy(wsh.position); scene.add(ring);
  }
  const ls = label('SPIN CITY · 24H LAUNDROMAT', 0.85, { font: 'Bungee', color: HEX.cream, glow: HEX.aqua, stroke: '#0b3a7a', size: 110 }); ls.position.set(-4, 4.6, -11.6); scene.add(ls);
  const nail = label('NAILS · CLOSED', 0.6, { font: 'Bungee', color: '#5a4a6a', size: 90 }); nail.position.set(12.5, 4.6, -11.6); scene.add(nail);
  const nailWin = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.6), mat('#120a1a', { r: 0.1, m: 0.6 })); nailWin.position.set(12.5, 1.75, -11.68); scene.add(nailWin);
  const neonOpen = label('OPEN', 0.5, { font: 'Bungee', color: HEX.pink, glow: HEX.pink, size: 90 }); neonOpen.position.set(5.2, 2.5, -11.6); scene.add(neonOpen);
  // the circuit decoration from the JoyLabz deck, painted along the top of the strip
  const deco = new THREE.Mesh(new THREE.PlaneGeometry(46, 1.6), new THREE.MeshBasicMaterial({ map: tex(circuitWall(1024, HEX.magenta, HEX.amber), { repeat: [8, 0.3] }), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, toneMapped: false }));
  deco.position.set(0, 5.6, -11.65); scene.add(deco);

  // billboard on poles
  const bb = new THREE.Group();
  for (const x of [-3, 3]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 10, 8), mat('#5a5464', { m: 0.7 })); p.position.set(x, 5, 0); bb.add(p); }
  const board = new THREE.Mesh(new THREE.BoxGeometry(12, 4.4, 0.4), mat('#1a0838')); board.position.y = 11.5; bb.add(board);
  const bt = label('THE WORLD IS A\nCONSTRUCTION KIT', 1.5, { font: 'Bungee', gradient: [HEX.amber, HEX.pink], glow: HEX.pink, stroke: '#1a0838', size: 110 }); bt.position.set(0, 11.5, 0.22); bb.add(bt);
  for (const x of [-4.5, 0, 4.5]) { const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.4), glow('#fff3d0', 2)); lamp.position.set(x, 14, 0.6); bb.add(lamp); }
  bb.position.set(16, 0, -20); bb.rotation.y = -0.35; scene.add(bb);

  // sodium-vapor light poles
  for (const [x, z] of [[-10, 2], [10, 2], [-10, 20], [10, 20]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 8, 8), mat('#4a4454', { m: 0.7 })); pole.position.set(x, 4, z); scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.3), mat('#4a4454', { m: 0.7 })); arm.position.set(x - Math.sign(x) * 0.7, 8, z); scene.add(arm);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.5), glow('#ffb35a', 3)); hd.position.set(x - Math.sign(x) * 1.3, 7.9, z); scene.add(hd);
    const l = new THREE.PointLight('#ffa040', 40, 22, 1.3); l.position.set(x - Math.sign(x) * 1.3, 7.6, z); scene.add(l);
    terrain.wall(x - 0.25, x + 0.25, z - 0.25, z + 0.25, 8);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.5, 10), mat('#8a8494', { r: 0.9 })); base.position.set(x, 0.25, z); scene.add(base);
  }

  // city skyline beyond the lot
  {
    const wc = canvas(128, 256), wg = wc.getContext('2d'); wg.fillStyle = '#0d0818'; wg.fillRect(0, 0, 128, 256);
    for (let y = 8; y < 256; y += 16) for (let x = 8; x < 128; x += 14) if (Math.random() < 0.35) { wg.fillStyle = ['#ffd28a', '#ffbf70', '#8fd8e8', '#ff6caf'][Math.floor(Math.random() * 4)]; wg.fillRect(x, y, 7, 8); }
    const wt = tex(wc); wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
    for (let i = 0; i < 40; i++) {
      const a = Math.PI * (0.15 + Math.random() * 0.7), r = 120 + Math.random() * 60;
      const w = 8 + Math.random() * 14, h = 15 + Math.random() * 55;
      const t2 = wt.clone(); t2.repeat.set(w / 10, h / 20); t2.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshBasicMaterial({ map: t2, fog: false }));
      m.position.set(Math.cos(a) * r * (Math.random() < 0.5 ? 1 : -1), h / 2, -Math.sin(a) * r * 0.9 - 20);
      scene.add(m);
    }
  }

  // lot edges you can't walk past
  terrain.wall(-24, -22, -12, 32); terrain.wall(22, 24, -12, 32); terrain.wall(-24, 24, 30, 32);

  // picnic tables, an A-frame sign, a trash can, a generator
  const wood = mat('#b5743a', { r: 0.8 });
  for (const [x, z] of [[-7.5, 1.5], [7.8, 2.5]]) {
    const t = new THREE.Group();
    t.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.9), wood).translateY(0.78));
    for (const s of [-0.75, 0.75]) t.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.3), wood).translateY(0.45).translateZ(s));
    for (const lx of [-0.9, 0.9]) t.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 1.6), wood).translateX(lx).translateY(0.4));
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.6, 8, 1, true), new THREE.MeshStandardMaterial({ map: stripes('#ff6caf', '#fff3e0', 8), side: THREE.DoubleSide })); umb.position.y = 2.4; t.add(umb);
    t.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), mat('#ddd', { m: 0.8 })).translateY(1.2));
    t.position.set(x, 0, z); t.rotation.y = x > 0 ? 0.3 : -0.2; scene.add(t);
    terrain.wall(x - 1.2, x + 1.2, z - 0.9, z + 0.9, 0.9);
  }
  const aframe = label('TACOS\n→', 0.5, { font: 'Bungee', color: '#1a0838', bg: HEX.cream, border: HEX.red, size: 90 });
  aframe.position.set(-4.6, 0.75, 1.3); aframe.rotation.set(-0.25, 0.4, 0); scene.add(aframe);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 1, 12), mat('#2a5a3a', { r: 0.6 })); can.position.set(4.6, 0.5, 0.6); scene.add(can);
  terrain.wall(4.25, 4.95, 0.25, 0.95, 1);
  const gen = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.8, 0.8, 2, 0.08), mat(HEX.amber, { r: 0.5 })); gen.position.set(4.6, 0.4, -2.2); scene.add(gen);
  terrain.wall(4.0, 5.2, -2.65, -1.75, 0.9);

  // string lights from the truck roof out to the poles
  const bulbs = new THREE.Group(), bulbGeo = new THREE.SphereGeometry(0.07, 8, 6), neon = [HEX.pink, HEX.amber, HEX.lime, HEX.magenta, HEX.blue];
  for (const [ax, az, bx, bz] of [[-3.5, -0.6, -9.7, 2], [3.5, -0.6, 9.7, 2], [-3.5, -0.6, -7.5, 1.5], [3.5, -0.6, 7.8, 2.5]]) {
    for (let i = 0; i <= 18; i++) {
      const t = i / 18, y = (3.5 + (ax === -3.5 && az === -0.6 && bx === -6.5 ? -1 : 0)) + t * 2.5 - Math.sin(t * Math.PI) * 1.2;
      const b = new THREE.Mesh(bulbGeo, glow(neon[i % neon.length], 3)); b.position.set(ax + (bx - ax) * t, Math.max(2.4, y), az + (bz - az) * t); bulbs.add(b);
    }
  }
  scene.add(bulbs);

  // ---------------- THE TRUCK ----------------
  // body spans x -3.6..3.6, z -3.4..-0.6, floor at 0.5, roof at 3.3
  const truck = new THREE.Group();
  const body = mat('#e8112d', { r: 0.35, m: 0.2 });
  const cream = mat('#fff3e0', { r: 0.5 });
  const rb = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.06), m); o.position.set(x, y, z); truck.add(o); return o; };
  rb(7.2, 0.5, 2.8, mat('#2a1f40'), 0, 0.25, -2.0);               // chassis
  rb(7.2, 0.15, 2.8, mat('#3a2f5c', { r: 0.3, m: 0.6 }), 0, 0.5, -2.0); // floor plate
  rb(7.2, 2.8, 0.15, body, 0, 1.9, -3.35);                        // back wall
  rb(0.15, 2.8, 2.8, body, -3.55, 1.9, -2.0);                     // left end
  rb(0.15, 2.8, 2.8, body, 3.55, 1.9, -2.0);                      // right end
  rb(7.4, 0.2, 3.0, cream, 0, 3.35, -2.0);                        // roof
  // front wall with a serving window (x -3..0.8, y 1.6..2.6) and a door (x 1.9..3.0)
  rb(5.4, 1.1, 0.15, body, -0.8, 1.05, -0.68);
  rb(5.4, 0.55, 0.15, body, -0.8, 2.95, -0.68);
  rb(0.6, 1.0, 0.15, body, -3.3, 2.1, -0.68);
  rb(1.1, 1.0, 0.15, body, 1.35, 2.1, -0.68);
  rb(0.5, 2.8, 0.15, body, 3.3, 1.9, -0.68);
  rb(1.1, 0.4, 0.15, body, 2.45, 3.1, -0.68);
  // serving ledge
  rb(4.0, 0.08, 0.5, mat('#c0c0d0', { m: 0.9, r: 0.25 }), -1.1, 1.55, -0.4);
  // striped awning
  const aw = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.2), new THREE.MeshStandardMaterial({ map: stripes('#fff3e0', '#e8112d', 8), side: THREE.DoubleSide, roughness: 0.7 }));
  aw.position.set(-1.1, 2.95, 0.0); aw.rotation.x = -1.0; truck.add(aw);
  // wheels
  for (const x of [-2.4, 2.4]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 20).rotateX(Math.PI / 2), mat('#111')); w.position.set(x, 0.42, -0.55); truck.add(w); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 12).rotateX(Math.PI / 2), mat('#c0c0d0', { m: 1, r: 0.2 })); hub.position.copy(w.position); truck.add(hub); }
  // circuit decoration on the side panels
  const panelDeco = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 1.0), new THREE.MeshBasicMaterial({ map: tex(circuitWall(512, '#ffffff', HEX.amber)), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, toneMapped: false }));
  panelDeco.position.set(-0.8, 1.0, -0.59); truck.add(panelDeco);
  // roof sign
  const sign = label('1DER TACOS', 0.95, { font: 'Bungee', color: HEX.cream, glow: HEX.pink, stroke: HEX.red, size: 120 });
  sign.position.set(0, 4.2, -2.0); truck.add(sign);
  const signBack = new THREE.Mesh(new RoundedBoxGeometry(6.2, 1.3, 0.2, 2, 0.1), mat('#1a0838')); signBack.position.set(0, 4.2, -2.12); truck.add(signBack);
  const open = label('OPEN LATE', 0.32, { font: 'Bungee', color: HEX.lime, glow: HEX.lime, size: 90 });
  open.position.set(1.35, 2.25, -0.58); truck.add(open);
  const menu = label('MENU\nal pastor ....... 3\nbirria ......... 4\nbaja fish ...... 4\n\nask about the\nspin cycle', 1.2, { font: 'JetBrains Mono', weight: 800, color: HEX.cream, bg: '#1a0838', border: HEX.amber, size: 52, align: 'left', lineHeight: 1.2 });
  menu.position.set(-3.6, 1.6, 0.0); menu.rotation.y = 0.5; truck.add(menu);
  // tacos on the ledge
  const tacos = FOODS[0].make(); tacos.scale.setScalar(1.8); tacos.position.set(-2.75, 1.6, -0.4); truck.add(tacos);
  const tacos2 = FOODS[1].make(); tacos2.scale.setScalar(1.8); tacos2.position.set(0.25, 1.6, -0.4); truck.add(tacos2);
  // interior: grill counter and warm light
  rb(4.6, 0.95, 0.6, mat('#c0c0d0', { m: 0.9, r: 0.3 }), -1.0, 0.98, -1.1);
  const grill = new THREE.Mesh(new THREE.BoxGeometry(2, 0.03, 0.5), glow('#ff5a1a', 0.6)); grill.position.set(-1.6, 1.47, -1.1); truck.add(grill);
  const inside = new THREE.PointLight('#ffb36b', 12, 7, 1.2); inside.position.set(0, 3.0, -2.0); truck.add(inside);
  const neonLight = new THREE.PointLight(HEX.pink, 25, 14, 1.3); neonLight.position.set(0, 4.5, 0.5); truck.add(neonLight);

  // THE WASHER, on the back wall inside
  const washer = new THREE.Group();
  washer.add(new THREE.Mesh(new RoundedBoxGeometry(1.3, 1.5, 0.5, 3, 0.12), mat('#f6f2ff', { r: 0.25 })));
  washer.children[0].position.y = 0.75;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.07, 12, 40), mat('#d0d0e0', { m: 1, r: 0.15 })); ring.position.set(0, 0.7, 0.27); washer.add(ring);
  const doorPivot = new THREE.Group(); doorPivot.position.set(-0.46, 0.7, 0.3); washer.add(doorPivot);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.42, 40), sudsMaterial()); glass.position.set(0.46, 0, 0.0); doorPivot.add(glass);
  const glassRing = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.04, 8, 40), glow(HEX.pink, 2.5)); glassRing.position.set(0.46, 0, 0.01); doorPivot.add(glassRing);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16).rotateX(Math.PI / 2), glow(HEX.amber, 2)); knob.position.set(0.4, 1.32, 0.27); washer.add(knob);
  const dispLbl = label('SPIN', 0.12, { font: 'JetBrains Mono', weight: 800, color: HEX.lime, glow: HEX.lime, size: 64 }); dispLbl.position.set(-0.25, 1.32, 0.26); washer.add(dispLbl);
  // behind the door: a vortex in the drum. Open the door and you dive in, forward, onto the slide.
  const drumPortal = new THREE.Mesh(new THREE.CircleGeometry(0.4, 48), vortexMaterial(new THREE.Color(HEX.aqua)));
  drumPortal.position.set(0, 0.7, 0.262); drumPortal.material.uniforms.uColor2.value.set(HEX.pink); washer.add(drumPortal);
  washer.position.set(0.9, 0.57, -3.15);
  truck.add(washer);

  // ---- Memo, working the truck ----
  const vendor = new THREE.Group();
  {
    const skin = mat('#d8a070', { r: 0.6 }), shirt = mat(HEX.blue, { r: 0.6 }), apron = mat('#fff3e0', { r: 0.8 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.5, 6, 14), shirt); torso.position.y = 1.25; vendor.add(torso);
    const ap = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.55, 0.06, 2, 0.03), apron); ap.position.set(0, 1.12, 0.25); vendor.add(ap);
    const head = new THREE.Group(); head.position.y = 1.93; vendor.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), skin));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.205, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(HEX.red, { r: 0.5 })); cap.position.y = 0.03; head.add(cap);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 16, 1, false, -Math.PI / 2, Math.PI), mat(HEX.red)); brim.position.set(0, 0.05, 0.16); head.add(brim);
    for (const sx of [-0.07, 0.07]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mat('#1a0838')); e.position.set(sx, 0.02, 0.18); head.add(e); }
    const stache = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.1, 4, 8).rotateZ(Math.PI / 2), mat('#2a1a10')); stache.position.set(0, -0.06, 0.19); head.add(stache);
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 12, Math.PI), mat('#5a1a1a')); smile.position.set(0, -0.1, 0.185); smile.rotation.z = Math.PI; head.add(smile);
    const arm = side => {
      const pivot = new THREE.Group(); pivot.position.set(side * 0.33, 1.62, 0); vendor.add(pivot);
      const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.42, 4, 10), shirt); a.position.y = -0.26; pivot.add(a);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), skin); hand.position.y = -0.55; pivot.add(hand);
      return { pivot, hand };
    };
    const L = arm(-1), R = arm(1);
    const spat = new THREE.Group(); spat.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.02), mat('#3a2a1a'))); const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.1), mat('#ddd', { m: 1, r: 0.2 })); blade.position.set(0, -0.12, 0.05); spat.add(blade);
    spat.position.y = -0.6; R.pivot.add(spat);
    const name = label('MEMO', 0.12, { font: 'Bungee', color: HEX.cream, bg: HEX.red, size: 60, pad: 14 }); name.position.set(0, 1.3, 0.29); vendor.add(name);
    vendor.userData = { head, L, R, spat, serving: 0 };
  }
  vendor.position.set(-1.3, 0.5, -1.75); vendor.scale.setScalar(1.12);
  truck.add(vendor);
  const memoLight = new THREE.PointLight('#fff0dc', 6, 3.5, 1.2); memoLight.position.set(-1.3, 2.6, -0.9); truck.add(memoLight);
  terrain.wall(-1.75, -0.85, -2.1, -1.4, 2.4);
  const washerLight = new THREE.PointLight(HEX.aqua, 8, 4, 1.5); washerLight.position.set(0.9, 1.3, -2.4); truck.add(washerLight);
  const dare = label('“I want to put on a fantastic show,\nand risk death! Here it goes...”', 0.2, { font: 'Fjalla One', color: HEX.cream, glow: HEX.pink, size: 70 });
  dare.position.set(0.9, 2.65, -3.25); truck.add(dare);
  const tag = label('~ Jay Silver, Lens × Block (2014)', 0.1, { font: 'Fjalla One', color: HEX.amber, size: 60 });
  tag.position.set(0.9, 2.35, -3.25); truck.add(tag);
  const arrow = label('↓ OPEN ME ↓', 0.22, { font: 'Bungee', color: HEX.lime, glow: HEX.lime, size: 80 });
  arrow.position.set(0.9, 2.1, -3.2); truck.add(arrow);
  scene.add(truck);

  // truck collision
  terrain.box(-3.6, 3.6, -3.4, -0.6, 0.5, { kind: 'metal' });          // floor
  terrain.box(1.9, 3.0, -0.6, 0.1, 0.25, { kind: 'metal' });            // step
  terrain.wall(-3.7, 3.7, -3.5, -3.25, 3.4);                            // back
  terrain.wall(-3.7, -3.45, -3.5, -0.55, 3.4);                          // left end
  terrain.wall(3.45, 3.7, -3.5, -0.55, 3.4);                            // right end
  terrain.wall(-3.7, 1.9, -0.75, -0.55, 3.4);                           // front left of door
  terrain.wall(3.0, 3.7, -0.75, -0.55, 3.4);                            // front right of door
  terrain.wall(-3.3, 1.3, -1.45, -0.75, 1.5);                           // grill counter
  terrain.wall(0.2, 1.6, -3.3, -2.85, 2.2);                             // washer
  terrain.wall(-3.8, 1.6, -0.6, -0.15, 1.6, { bottom: 1.0 });           // ledge (head height)


  const doorState = { open: 0, target: 0 };
  interact.push({ obj: washer, label: 'Open the washer ⤵ (take the slide)', dist: 4.5, action: 'washer' });
  interact.push({ obj: sign, label: 'Order a taco from Memo', dist: 9, action: 'vendor' });
  interact.push({ obj: vendor, label: 'Get a taco from Memo', dist: 7, action: 'vendor' });
  interact.push({ obj: tacos, label: 'Taco! (plays a note)', dist: 5, action: 'taco', data: { i: 0 } });
  interact.push({ obj: tacos2, label: 'Birria! (plays a note)', dist: 5, action: 'taco', data: { i: 2 } });

  updaters.push((dt, t) => {
    doorState.open += (doorState.target - doorState.open) * Math.min(1, dt * 7);
    doorPivot.rotation.y = -doorState.open * 1.9;
    sign.material.color.setScalar(0.85 + (Math.random() < 0.02 ? -0.5 : 0) + Math.sin(t * 3) * 0.1);
    glassRing.material.emissiveIntensity = 2 + shared.uBeat.value * 3;
    knob.rotation.z = t * 2;
    drumPortal.visible = doorState.open > 0.15;
    drumPortal.material.uniforms.uHover.value = doorState.open;
    const V = vendor.userData;
    V.serving = Math.max(0, V.serving - dt);
    if (V.serving > 0) { V.R.pivot.rotation.x += (-1.5 - V.R.pivot.rotation.x) * Math.min(1, dt * 10); V.head.rotation.y = 0; }
    else { V.R.pivot.rotation.x = -0.6 + Math.sin(t * 6) * 0.35; V.R.pivot.rotation.z = 0.2; V.head.rotation.y = Math.sin(t * 0.7) * 0.4; }
    V.L.pivot.rotation.x = -0.3 + Math.sin(t * 1.3) * 0.1;
    vendor.rotation.y = Math.sin(t * 0.5) * 0.15; vendor.position.y = 0.5 + Math.abs(Math.sin(t * 3)) * 0.015;
  });

  return {
    scene, terrain, interact, vendor,
    spawn: { pos: new THREE.Vector3(0, 0, 10), yaw: 0 },
    washer, washerFocus: new THREE.Vector3(0.9, 1.27, -2.8),
    doorState,
    soundSpots: { grill: new THREE.Vector3(-1.6, 1.5, -1.1), washer: new THREE.Vector3(0.9, 1.2, -3), generator: new THREE.Vector3(4.6, 0.5, -2.2) },
    update(dt, t) { updaters.forEach(f => f(dt, t)); },
    insideTruck: p => p.x > -3.6 && p.x < 3.6 && p.z > -3.4 && p.z < -0.6,
  };
}
