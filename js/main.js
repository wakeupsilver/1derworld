// 1derworld: main loop, flow between worlds, interactions, portals and juice.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { audio, PENTA } from './audio.js';
import { buildStreet } from './street.js';
import { buildHub, HUB } from './hub.js';
import { buildPortals } from './portals.js';
import { Player } from './player.js';
import { FX } from './fx.js';
import { shared, FinalShader } from './shaders.js';
import { circuitCanvas } from './textures.js';
import { loadProjects, codeUrl, launchInfo, isStatic } from './api.js';
import { HEX, NEON } from './palette.js';
import { FOODS } from './props.js';

const $ = s => document.querySelector(s);
// report errors to the server console (handy when running headless)
const report = (msg) => { if (!/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) return; try { navigator.sendBeacon('/api/log', String(msg).slice(0, 2000)); } catch {} };
addEventListener('error', e => report('error: ' + e.message + ' @ ' + e.filename + ':' + e.lineno));
addEventListener('unhandledrejection', e => report('rejection: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
const _ce = console.error.bind(console); console.error = (...a) => { report('console.error: ' + a.map(x => x && x.stack || x).join(' ')); _ce(...a); };
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.localClippingEnabled = true;

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 900);
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(new THREE.Scene(), camera);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.6, 0.5, 0.82);
const final = new ShaderPass(FinalShader);
final.uniforms.uTime = shared.uTime;
composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(final); composer.addPass(new OutputPass());
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

const player = new Player(camera, canvas);
const fx = new FX();

let street, hub, portals, projects = [];
let current = null;          // street | hub
let mode = 'title';          // title | world | cine | ride | demo | draw
let ride = null, cine = null;
let lensOn = false, lensTimer = 0;
let zone = null;
let hovered = null;
const tweens = [];
const loops = { street: [], hub: [] };

// ---------- loading ----------
async function boot() {
  drawTitleCircuit();
  await Promise.all(['Bungee', 'Bungee Shade', 'Fjalla One', 'JetBrains Mono'].map(f => document.fonts.load(`400 40px "${f}"`)).concat(document.fonts.load('800 40px "JetBrains Mono"'))).catch(() => {});
  const ps = await loadProjects().catch(() => []);   // decides local-server vs static mode first
  const selfCode = await fetch(codeUrl('_self')).then(r => r.text()).catch(() => '');
  projects = ps;
  street = buildStreet();
  hub = buildHub(selfCode);
  $('#loading').textContent = `building ${projects.length} portals…`;
  portals = await buildPortals(hub.scene, projects, audio);
  buildMenu();
  setScene(street);
  player.place(street.spawn.pos, street.spawn.yaw);
  $('#loading').textContent = `${projects.length} portals ready. pick a door.`;
  renderer.compile(hub.scene, camera);
  const h = location.hash.slice(1);
  // shortcut links are one-shot: clear them so a reload always starts at the taco truck
  if (h && h !== 'selftest') history.replaceState(null, '', location.pathname + location.search);
  if (h === 'selftest') { setTimeout(() => import('./selftest.js').then(t => (testing = true, t.run({ go, player, hub, street, portals, warp, tick, camera, state: () => ({ mode, current, ride }) }))), 100); return; }
  if (h === 'plaza') await go('plaza');
  else if (h.startsWith('warp=')) { await go('plaza'); warp(h.slice(5), true); }
  else if (h.startsWith('portal=')) { await go('plaza'); const P = portals.portals.find(x => x.p.id === h.slice(7)); if (P) enterPortal(P, true); }
  else if (h.startsWith('look=')) { // look=x,y,z,yawDeg,pitchDeg  (screenshots; y < -1 means the parking lot)
    const [x, y, z, yaw, pitch] = h.slice(5).split(',').map(Number);
    await go(y < -1 ? 'street' : 'plaza');
    if (y < -1) player.place(new THREE.Vector3(x, 0, z), yaw * Math.PI / 180, pitch * Math.PI / 180);
    else { player.place(new THREE.Vector3(x, y, z), yaw * Math.PI / 180, pitch * Math.PI / 180); player.grounded = y < 0.1; }
  } else await go('street'); // default: start at the taco truck
  // browsers only allow sound after a click or key press
  if (!audio.ready || audio.ctx.state !== 'running') {
    $('#soundPill').hidden = false;
    const unmute = () => { audio.init().then(() => { $('#soundPill').hidden = true; }); removeEventListener('pointerdown', unmute, true); removeEventListener('keydown', unmute, true); };
    addEventListener('pointerdown', unmute, true); addEventListener('keydown', unmute, true);
  }
}

function drawTitleCircuit() {
  const c = $('#titleCircuit'), src = circuitCanvas(1024, { trace: HEX.magenta, icon: HEX.amber, bg: 'rgba(0,0,0,0)' });
  const fit = () => {
    c.width = innerWidth; c.height = innerHeight;
    const g = c.getContext('2d');
    for (let x = 0; x < c.width; x += 700) for (let y = 0; y < c.height; y += 700) g.drawImage(src, x, y, 700, 700);
  };
  fit(); addEventListener('resize', fit);
}

// ---------- scenes ----------
function setScene(w) {
  current = w;
  renderPass.scene = w.scene;
  fx.attach(w.scene);
  player.world = w.terrain;
  for (const [k, arr] of Object.entries(loops)) for (const l of arr) { const on = w === (k === 'street' ? street : hub) && (l.id === 'roll' || !l.h.pos || k === 'street' || l.h.pos.distanceTo(player.pos) < l.h.max); l.h.setGain(on ? l.v : 0, 0.3); l.h.setActive(on); }
  if (w === street) audio.setMix('street');
}

function startLoops() {
  if (loops.street.length) return;
  const add = (k, kind, pos, opts) => { const h = audio.loop(kind, pos, opts); if (h) loops[k].push({ h, v: opts.v ?? 0.3, id: opts.id }); return h; };
  add('street', 'machine', street.soundSpots.generator, { v: 0.12, freq: 55, hiss: 900, ref: 1.5 });
  add('street', 'city', new THREE.Vector3(0, 2, 20), { v: 0.35, ref: 10, rolloff: 0.5 });
  add('street', 'sizzle', street.soundSpots.grill, { v: 0.35, ref: 1.5 });
  add('street', 'hum', street.soundSpots.washer, { v: 0.12, freq: 87.31, ref: 1.5 });
  for (const s of hub.sound) add('hub', s.kind, s.pos, s.opts);
  for (const P of portals.portals) if (!P.hum) { P.hum = audio.loop('hum', P.g.position.clone().setY(2.6), { freq: 87.31 * Math.pow(2, [0, 3, 5, 7, 10, 12, 15, 17][P.i % 8] / 12), v: 0.12, ref: 2.5, rolloff: 1.8, max: 30 }); loops.hub.push({ h: P.hum, v: 0.12 }); }
  setScene(current);
}

async function go(where) {
  await audio.init().catch(() => {});
  startLoops();
  $('#wordmark').hidden = false;
  $('#title').classList.add('fade');
  setTimeout(() => $('#title').hidden = true, 500);
  $('#hud').hidden = false;
  if (where === 'street') {
    setScene(street); player.place(street.spawn.pos, 0); mode = 'world'; player.enabled = true;
    showZone('1DER TACOS', 'a taco truck in a parking lot. allegedly. step inside.');
    lock();
  } else if (where === 'spin') {
    setScene(street); player.place(new THREE.Vector3(0.9, 0.5, -1.4), 0); mode = 'world';
    openWasher();
  } else {
    setScene(hub); warp('plaza', true); mode = 'world'; player.enabled = true; audio.setMix('hub');
    lock();
  }
}


// ---------- pointer lock ----------
function lock() { /* no pointer capture: look with the arrows, cursor at the screen edge, or drag */ }
function unlock() { if (document.pointerLockElement) document.exitPointerLock(); }

// ---------- the speakeasy washer -> slide ----------
function openWasher() {
  if (mode === 'cine' || mode === 'ride') return;
  mode = 'cine'; player.enabled = false; unlock();
  street.doorState.target = 1;
  audio.tone({ f0: 180, f1: 90, dur: 0.25, type: 'square', v: 0.12 });
  audio.riser(1.1);
  const from = camera.position.clone(), qFrom = camera.quaternion.clone(), fov0 = camera.fov;
  const disc = new THREE.Vector3(0.9, 1.27, -2.888);           // the vortex in the washer drum
  const to = disc.clone().add(new THREE.Vector3(0, 0, 0.06));   // right up into it
  const look = new THREE.Object3D(); look.position.copy(to); look.lookAt(disc.clone().add(new THREE.Vector3(0, 0, -1)));
  cine = { t: 0, dur: 1.35, update(dt) {
    this.t += dt / this.dur;
    const k = Math.min(1, this.t), e = k < 0.3 ? 0.08 * (k / 0.3) : 0.08 + 0.92 * Math.pow((k - 0.3) / 0.7, 2.2); // pause while the door swings, then dive forward
    camera.position.lerpVectors(from, to, e);
    camera.quaternion.slerpQuaternions(qFrom, look.quaternion, Math.min(1, k * 2.2));
    camera.fov = fov0 + (115 - fov0) * Math.max(0, (k - 0.5) * 2); camera.updateProjectionMatrix();
    final.uniforms.uWarp.value = Math.max(0, k - 0.45) * 2.4;
    if (this.t >= 1) {
      cine = null;
      flash(HEX.cream, 1);
      setScene(hub);
      audio.setMix('ride', 0.2);
      startRide(hub.entryCurve, 3.6, () => {
        audio.splash(); fx.burst(player.pos.clone().setY(0.6), { n: 120, speed: 9 }); fx.shake(0.8);
        showZone('THE HUB', 'the world is a construction kit');
        audio.setMix('hub');
        setTimeout(() => street.doorState.target = 0, 500);
      });
    }
  } };
}

// ---------- rides (slides) ----------
function startRide(curve, dur, onEnd) {
  mode = 'ride'; player.enabled = false;
  audio.whoosh(dur * 0.9, 0.4);
  ride = { curve, dur, t: 0, onEnd, lastBubble: 0 };
}
function updateRide(dt) {
  const r = ride;
  r.t = Math.min(1, r.t + dt / r.dur);
  const e = r.t * r.t * 0.45 + r.t * 0.55;
  const p = r.curve.getPointAt(e), tg = r.curve.getTangentAt(Math.min(0.999, e));
  const tg2 = r.curve.getTangentAt(Math.min(0.999, e + 0.02));
  camera.position.copy(p).add(new THREE.Vector3(0, 0.45, 0));
  camera.up.set(0, 1, 0);
  // look a few meters ahead down the tube (and a touch low) so you see where you're going, feet first
  const ahead = r.curve.getPointAt(Math.min(1, e + 6 / r.curve.getLength()));
  camera.lookAt(ahead.add(new THREE.Vector3(0, 0.1, 0)));
  const turn = tg.x * tg2.z - tg.z * tg2.x;
  camera.rotateZ(THREE.MathUtils.clamp(-turn * 18, -0.6, 0.6));
  camera.fov += (100 - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix();
  final.uniforms.uWarp.value = Math.max(0, final.uniforms.uWarp.value - dt * 2);
  final.uniforms.uCA.value = 0.004;
  if (current === hub && (r.lastBubble += dt) > 0.04) { r.lastBubble = 0; fx.spawn(p.clone().add(new THREE.Vector3((Math.random() - .5) * 2, (Math.random() - .5) * 2, (Math.random() - .5) * 2)), { x: 0, y: 1.2, z: 0 }, NEON[Math.floor(Math.random() * NEON.length)], 0.12, 1.2, 0.5, 1); }
  if (r.t >= 1) {
    ride = null;
    const end = r.curve.getPointAt(1), dir = r.curve.getTangentAt(0.999).setY(0).normalize();
    player.place(new THREE.Vector3(end.x, Math.max(0, end.y - 0.5), end.z), Math.atan2(-dir.x, -dir.z), -0.05);
    player.vel.set(dir.x * 9, 0, dir.z * 9);
    player.enabled = true; mode = 'world';
    player.fovKick = 14;
    r.onEnd && r.onEnd();
    lock();
  }
}

// ---------- juice helpers ----------
function flash(color = '#fff', amt = 0.8) { final.uniforms.uFlashColor.value.set(color); final.uniforms.uFlash.value = amt; }
let toastTimer = 0;
function toast(msg, ms = 2200) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms); }
let zoneTimer = 0;
function showZone(a, b) { const z = $('#zone'); z.querySelector('b').textContent = a; z.querySelector('i').textContent = b; z.classList.add('on'); clearTimeout(zoneTimer); zoneTimer = setTimeout(() => z.classList.remove('on'), 2800); }
function bump(obj, amt = 0.25) { const s0 = obj.scale.clone(); tweens.push({ t: 0, dur: 0.45, f: k => obj.scale.copy(s0).multiplyScalar(1 + Math.sin(k * Math.PI) * amt * (1 - k)), end: () => obj.scale.copy(s0) }); }

const ZONES = {
  plaza: ['PORTAL PLAZA', 'code metaphors · walk into any portal'],
  buffet: ['TREND BUFFET', 'micro-creativity · every food is a key'],
  skate: ['SKATE BOWL', 'gigahand measure · hold shift and drop in'],
  tramp: ['BOUNCE FIELD', 'playification · keep bouncing up to the mezzanine'],
  mezz: ['THE MEZZANINE', 'take the slide ↓'],
  shop: ['THE SHOP', 'wild project space · hurry up and invent something'],
  field: ['THE PRAIRIE', 'pollinator madness · what would be wonderful?'],
};

function warp(z, quiet) {
  if (current !== hub) setScene(hub);
  const s = hub.spots[z]; if (!s) return;
  player.place(s.pos, s.yaw); player.grounded = true;
  if (!quiet) { audio.whoosh(0.5, 0.3); flash(HEX.pink, 0.5); player.fovKick = 18; }
  mode = 'world'; player.enabled = true;
}

// ---------- player events -> sound + juice ----------
const SURF = { floor: 'floor', metal: 'metal', grass: 'grass', skate: 'wood', tramp: 'tramp', trap: 'metal', trigger: 'metal', launch: 'metal' };
player.on('step', (k, sp) => audio.footstep(SURF[k] || 'floor', Math.min(1.5, sp / 5)));
player.on('jump', () => audio.jump());
player.on('land', (impact, kind, air, from) => {
  if (impact > 7) { audio.land(impact / 8); fx.shake(Math.min(0.6, impact / 30)); fx.burst(player.pos.clone().setY(player.pos.y + 0.1), { n: 14, speed: 3, colors: ['#fff3e0', HEX.pink], size: 0.1, life: 0.5, up: 0.5 }); }
  if (air > 0.75 && (from === 'skate' || kind === 'skate')) {
    const names = ['GIGAHAND AIR', 'CODE METAPHOR 360', 'LENS × BLOCK GRAB', 'INVENT BY METAPHOR', 'ENDOGENOUS MAGIC', 'AXIOMATIC FLIP'];
    const n = Math.floor(air * 2);
    fx.pop(`${names[Math.floor(Math.random() * names.length)]}${n > 1 ? ' ×' + n : ''}`, player.pos.clone().add(player.forward().multiplyScalar(3)).setY(player.pos.y + 2.2), { color: HEX.amber });
    audio.trick(n); fx.burst(player.pos.clone().setY(player.pos.y + 1), { n: 60, speed: 7 });
  }
});
player.on('bounce', (t, vy) => {
  t.dip = 0.7; audio.boing(t.i + Math.floor(vy / 6), vy / 24); player.fovKick = 6 + vy * 0.3;
  fx.ring(new THREE.Vector3(t.x, 0.8, t.z), { color: NEON[t.i % NEON.length], speed: 5 + vy * 0.2 });
  if (vy > 20) { fx.pop('MEGA BOUNCE', player.pos.clone().add(player.forward().multiplyScalar(4)).setY(player.pos.y + 3), { color: HEX.lime }); fx.shake(0.2); }
});
player.on('launch', d => { audio.launch(); player.fovKick = 16; fx.burst(player.pos.clone(), { n: 70, speed: 8, colors: [HEX.lime, HEX.amber] }); });
player.on('bump', sp => { if (sp > 7) { fx.shake(0.15); audio.land(0.6); } });
player.on('bonk', () => { audio.land(0.8); fx.shake(0.3); });
player.on('trigger', d => { if (d.ride === 'mezz' && mode === 'world') { audio.setMix('ride', 0.3); startRide(hub.mezzCurve, 2.6, () => { audio.setMix('hub'); audio.splash(); fx.burst(player.pos.clone().setY(0.5), { n: 60 }); fx.shake(0.4); }); } });
player.on('trap', td => { td.target = 1; td.timer = 2.2; audio.trapdoor(); flash(HEX.red, 0.3); toast('ENDOGENOUS MAGIC ↓'); });
player.on('fellOut', () => {
  if (current !== hub) return;
  player.place(new THREE.Vector3(HUB.plaza.x, 0.2, HUB.plaza.z), player.yaw, 0.9);
  player.vel.set(0, 25, 0);
  audio.geyser(); fx.shake(0.8); flash(HEX.aqua, 0.6); player.fovKick = 22;
  fx.burst(new THREE.Vector3(HUB.plaza.x, 0.5, HUB.plaza.z), { n: 220, speed: 14, up: 4, colors: [HEX.aqua, '#ffffff', HEX.pink], life: 1.8 });
  setTimeout(() => { setLens(true); lensTimer = 4; }, 450);
});

// ---------- interactions ----------
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
addEventListener('mousemove', e => { mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); });
function interactables() {
  const list = current.interact.slice();
  if (current === hub) for (const P of portals.portals) list.push({ obj: P.disc, label: `Enter ${P.p.title}`, dist: 16, action: 'portal', data: P });
  return list;
}
let rayTick = 0, lastHover = null;
function updateHover() {
  if (mode !== 'world') { hovered = null; return; }
  if ((rayTick++ & 1) === 0) {
    const locked = document.pointerLockElement === canvas;
    ray.setFromCamera(locked ? new THREE.Vector2(0, 0) : mouse, camera);
    const list = interactables();
    const objs = list.map(i => i.obj);
    const hits = ray.intersectObjects(objs, true);
    hovered = null;
    for (const h of hits) {
      let o = h.object; let ia = null;
      while (o && !ia) { ia = list.find(i => i.obj === o); o = o.parent; }
      if (ia && h.distance <= ia.dist) { hovered = ia; break; }
      if (ia) break;
    }
  }
  const pr = $('#prompt');
  if (!hovered && heldTaco) { pr.textContent = 'click · take a bite 🌮'; pr.style.left = (mouse.x + 1) / 2 * innerWidth + 18 + 'px'; pr.style.top = (1 - mouse.y) / 2 * innerHeight + 14 + 'px'; pr.classList.add('on'); }
  else if (hovered) { pr.textContent = `click · ${hovered.label}`; pr.style.left = (mouse.x + 1) / 2 * innerWidth + 18 + 'px'; pr.style.top = (1 - mouse.y) / 2 * innerHeight + 14 + 'px'; pr.classList.add('on'); }
  else pr.classList.remove('on');
  if (hovered && hovered !== lastHover) audio.hover();
  lastHover = hovered;
}

player.on('click', () => { if (mode !== 'world') return; if (hovered && hovered.action !== 'portal' || hovered && !heldTaco) act(hovered); else if (heldTaco) biteTaco(); else if (hovered) act(hovered); });

function act(ia) {
  const d = ia.data || {};
  audio.click();
  switch (ia.action) {
    case 'washer': openWasher(); break;
    case 'vendor': serveTaco(); break;
    case 'tacos': toast('🌮 order up. (it only serves tacos... unless you check the back)'); audio.foodNote(0); bump(ia.obj, 0.08); break;
    case 'taco': case 'food': {
      const pos = (d.pos || ia.obj.getWorldPosition(new THREE.Vector3())).clone().add(new THREE.Vector3(0, 0.5, 0));
      audio.foodNote(d.i || 0, pos); bump(ia.obj, 0.35);
      fx.burst(pos, { n: 30, speed: 4, size: 0.12, life: 0.9 });
      fx.pop(['♪', '♫', 'nom', '✦'][Math.floor(Math.random() * 4)], pos.clone().setY(pos.y + 0.6), { size: 0.4, color: NEON[(d.i || 0) % NEON.length] });
      break;
    }
    case 'fryer': audio.noiseShot({ dur: 1.2, f0: 5000, f1: 2500, v: 0.4, pos: d.pos }); bump(ia.obj, 0.12); fx.burst(d.pos, { n: 40, speed: 2, colors: ['#ffffff', '#ffe0c0'], size: 0.25, life: 1.6, grav: 2, up: 3 }); fx.pop('400°F', d.pos.clone().setY(d.pos.y + 0.8), { size: 0.35, color: HEX.amber }); break;
    case 'lens': setLens(!lensOn); break;
    case 'garage': {
      const g = hub.garage; g.target = g.target ? 0 : 1;
      audio.garage(2.6, new THREE.Vector3(0, 5, -29.5)); bump(ia.obj, 0.15); fx.shake(0.2);
      toast(g.target ? 'rolling up… the prairie awaits' : 'closing the garage');
      if (g.target) setTimeout(() => { audio.bell(audio.now, 77, 0.2); audio.bell(audio.now + 0.1, 84, 0.2); }, 2400);
      break;
    }
    case 'mcu': {
      const st = d.st;
      toast('flashing firmware… avrdude: 1024 bytes written ✓');
      for (let i = 0; i < 12; i++) audio.tone({ t: audio.now + i * 0.06, f0: 1200 + (i % 3) * 400, dur: 0.04, type: 'square', v: 0.05 });
      setTimeout(() => { audio.foodNote(5, st.position); fx.pop('UPLOAD OK ✓', st.position.clone().setY(2.3), { color: HEX.lime, size: 0.4 }); }, 800);
      bump(st, 0.05); break;
    }
    case 'laser': { const h = d.l || hub.shop.laser; const p = h.userData.dot.getWorldPosition(new THREE.Vector3()); for (let i = 0; i < 6; i++) setTimeout(() => { audio.laserBeep(p); fx.sparks(h.userData.dot.getWorldPosition(new THREE.Vector3()), 8); }, i * 120); fx.pop('cut!', p.clone().setY(2.4), { color: HEX.red, size: 0.4 }); break; }
    case 'waterjet': { const p = hub.shop.jet.userData.jet.getWorldPosition(new THREE.Vector3()); audio.noiseShot({ dur: 1.6, type: 'highpass', f0: 3000, f1: 2000, v: 0.4, pos: p }); fx.burst(p.setY(1), { n: 120, speed: 6, colors: ['#bff8ff', HEX.aqua, '#ffffff'], size: 0.1, life: 1, up: 2 }); fx.shake(0.15); break; }
    case 'anvil': [1, 2.76, 5.4, 8.9].forEach((m, i) => audio.tone({ f0: 520 * m, dur: 1.5 - i * 0.3, v: 0.2 / (i + 1), type: 'sine', pos: d.pos })); fx.sparks(d.pos, 40); fx.shake(0.25); bump(ia.obj, 0.04); break;
    case 'saw': hub.shop.sawSpin = 60; audio.tone({ f0: 300, f1: 2400, dur: 1.6, type: 'sawtooth', v: 0.08, pos: ia.obj.position }); break;
    case 'weld': for (let i = 0; i < 6; i++) setTimeout(() => { audio.sparks(d.pos); fx.sparks(d.pos, 20); flash('#bff8ff', 0.15); }, i * 130); break;
    case 'printer': audio.arp(audio.now, 77, 0.3); fx.pop('printing a 1derworld trophy…', d.p.getWorldPosition(new THREE.Vector3()).setY(2.2), { size: 0.25, color: HEX.lime }); bump(d.p, 0.1); break;
    case 'arm': hub.shop.armWave = 1; audio.tone({ f0: 300, f1: 900, dur: 0.4, type: 'square', v: 0.06, pos: ia.obj.position }); setTimeout(() => audio.tone({ f0: 900, f1: 400, dur: 0.4, type: 'square', v: 0.06, pos: ia.obj.position }), 400); fx.pop('hi!', ia.obj.position.clone().setY(5.5), { color: HEX.lime }); break;
    case 'cnc': audio.tone({ f0: 180, f1: 1800, dur: 2, type: 'sawtooth', v: 0.06, pos: ia.obj.position }); fx.burst(ia.obj.position.clone().setY(1.5), { n: 80, speed: 3, colors: ['#e3b77a', '#f0d0a0'], size: 0.08, life: 1.2, up: 2 }); break;
    case 'drawdio': enterDraw(); break;
    case 'portal': enterPortal(d); break;
  }
}

// ---------- Memo's tacos: get one, hold it, eat it ----------
let heldTaco = null, bites = 0;
const MEMO_LINES = ['¡Órale! Al pastor, fresh off the trompo.', 'One taco, extra salsa. Careful, it bites back.', 'Don\'t worry about the washer in the back.', 'Birria day. You\'re gonna love it.', 'Best taco in the parking lot. Only taco in the parking lot.'];
function serveTaco() {
  const V = street.vendor;
  if (heldTaco) { toast('finish the one you have first. click to take a bite'); return; }
  V.userData.serving = 1.2;
  const head = V.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 2.5, 0.3));
  fx.pop(MEMO_LINES[Math.floor(Math.random() * MEMO_LINES.length)], head, { size: 0.16, color: HEX.cream, font: 'Fjalla One', life: 2.6, rise: 0.4 });
  audio.tone({ f0: 900, f1: 1300, dur: 0.12, type: 'triangle', v: 0.1 });
  setTimeout(() => {
    heldTaco = new THREE.Group();
    const t = FOODS[0].make().children[0]; t.scale.setScalar(1.6); t.rotation.set(0.35, 0.5, -0.2); heldTaco.add(t);
    current.scene.add(heldTaco); bites = 0;
    audio.bell(audio.now, 77, 0.15); audio.bell(audio.now + 0.08, 84, 0.12);
    toast('🌮 click to take a bite', 2600);
  }, 650);
}
function biteTaco() {
  if (!heldTaco) return;
  bites++;
  const p = heldTaco.getWorldPosition(new THREE.Vector3());
  for (let i = 0; i < 3; i++) audio.noiseShot({ t: audio.now + i * 0.045, dur: 0.05, f0: 2600 + Math.random() * 1500, q: 2, v: 0.25 });
  audio.tone({ t: audio.now + 0.15, f0: 300, f1: 180, dur: 0.12, type: 'sawtooth', v: 0.05 });
  fx.burst(p, { n: 22, speed: 2.5, colors: ['#f2c14e', '#67da5e', '#e8112d', '#d9581c'], size: 0.05, life: 0.8, up: 1 });
  heldTaco.children[0].scale.multiplyScalar(0.72);
  fx.shake(0.05);
  if (bites >= 3) {
    current.scene.remove(heldTaco); heldTaco = null;
    player.boost = 30;
    fx.pop('TACO POWER!', player.pos.clone().add(player.forward().multiplyScalar(2.5)).setY(player.pos.y + 2.1), { color: HEX.amber, size: 0.45 });
    toast('TACO POWER: faster running and higher jumps for 30 seconds', 3200);
    audio.trick(3);
  } else fx.pop(['nom', 'crunch', 'mmm'][bites - 1], p.clone().add(new THREE.Vector3(0, 0.25, 0)), { size: 0.18, color: HEX.cream, life: 0.8 });
}
function holdTaco() {
  if (!heldTaco) return;
  if (heldTaco.parent !== current.scene) current.scene.add(heldTaco);
  heldTaco.position.copy(camera.localToWorld(new THREE.Vector3(0.32, -0.3, -0.65)));
  heldTaco.quaternion.copy(camera.quaternion);
}

// ---------- the Constructive Lens ----------
const lensMat = new THREE.MeshBasicMaterial({ color: HEX.lime, wireframe: true, toneMapped: false });
function setLens(on) {
  lensOn = on;
  for (const w of [street, hub]) { w.scene.overrideMaterial = on ? lensMat : null; }
  flash(HEX.lime, 0.5); final.uniforms.uCA.value = 0.02; player.fovKick = 10;
  audio.setMix(on ? 'lens' : zone === 'field' ? 'field' : current === street ? 'street' : 'hub');
  audio.riser(0.4);
  if (on) toast('LENS × BLOCK · re-seeing the everyday world as something we can re-make', 3200);
}

// ---------- Drawdio wall ----------
let drawLast = null, drawDown = false, drawHue = 0;
function enterDraw() { mode = 'draw'; player.enabled = false; unlock(); $('#drawHint').hidden = false; drawLast = null; }
function exitDraw() { mode = 'world'; player.enabled = true; $('#drawHint').hidden = true; audio.drawdio(0, false); lock(); }
canvas.addEventListener('mousedown', () => { if (mode === 'draw') drawDown = true; });
addEventListener('mouseup', () => { drawDown = false; if (mode === 'draw') audio.drawdio(0, false); drawLast = null; });
function updateDraw() {
  const dd = hub.shop.drawdio;
  ray.setFromCamera(mouse, camera);
  const h = ray.intersectObject(dd.mesh)[0];
  if (!h || !drawDown) { drawLast = null; audio.drawdio(0, false); return; }
  const x = h.uv.x * dd.canvas.width, y = (1 - h.uv.y) * dd.canvas.height;
  const g = dd.ctx;
  drawHue = (drawHue + 2) % 360;
  g.strokeStyle = `hsl(${drawHue},100%,65%)`; g.lineWidth = 7; g.lineCap = 'round'; g.shadowColor = g.strokeStyle; g.shadowBlur = 14;
  if (drawLast) { g.beginPath(); g.moveTo(drawLast.x, drawLast.y); g.lineTo(x, y); g.stroke(); }
  drawLast = { x, y };
  dd.tex.needsUpdate = true;
  audio.drawdio(h.uv.y < 1 ? 1 - h.uv.y : 0.5, true);
}

// ---------- portals -> demos ----------
let activePortal = null, bootTimer = null;
function portalView(P, d = 4.6) {
  const center = P.disc.getWorldPosition(new THREE.Vector3());
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(P.g.quaternion);
  const o = new THREE.Object3D(); o.position.copy(center).addScaledVector(fwd, d); o.lookAt(center);
  return { pos: o.position, quat: o.quaternion, fwd, center };
}
function enterPortal(P, instant = false) {
  if (mode !== 'world' && !instant) return;
  activePortal = P; mode = 'cine'; player.enabled = false; unlock();
  audio.portalIn();
  const v = portalView(P);
  fx.burst(v.center, { n: 140, speed: 8, colors: [P.p.color, HEX.amber, HEX.cream] });
  P.hover = 1;
  if (instant) { camera.position.copy(v.pos); camera.quaternion.copy(v.quat); camera.fov = 72; camera.updateProjectionMatrix(); flash(P.p.color, 0.8); openDemo(P.p); return; }
  const from = camera.position.clone(), qFrom = camera.quaternion.clone(), fov0 = camera.fov;
  cine = { t: 0, dur: 0.7, update(dt) {
    this.t = Math.min(1, this.t + dt / this.dur);
    const e = 1 - Math.pow(1 - this.t, 3);
    camera.position.lerpVectors(from, v.pos, e);
    camera.quaternion.slerpQuaternions(qFrom, v.quat, e);
    camera.fov = fov0 + (72 - fov0) * e; camera.updateProjectionMatrix();
    final.uniforms.uWarp.value = Math.sin(e * Math.PI) * 0.35; final.uniforms.uCA.value = 0.004 + Math.sin(e * Math.PI) * 0.012;
    if (this.t >= 1) { cine = null; flash(P.p.color, 0.6); openDemo(P.p); }
  } };
}

async function openDemo(p) {
  mode = 'demo';
  document.body.classList.add('in-demo');
  const demo = $('#demo'); demo.hidden = false; demo.style.setProperty('--c', p.color); $('#demoWin').classList.remove('closing');
  $('#demoTitle').textContent = p.title;
  $('#demoCam').hidden = !p.camera;
  demoUrl = null;
  const frame = $('#demoFrame'); frame.src = 'about:blank';
  audio.setMix('demo', 0.3);
  setTimeout(() => { if (mode === 'demo') audio.suspend(); }, 450); // the app gets the speakers to itself (no shared-audio glitches)
  let info;
  try { info = await launchInfo(p); } catch { info = { url: p.launch || p.url, up: true, kind: p.kind }; }
  if (info.kind === 'external') {
    window.open(info.url, '_blank', 'noopener');
    toast(`${p.title} opened on GitHub in a new tab`);
    return closeDemo();
  }
  const bootEl = $('#boot');
  if (!info.up) {
    bootEl.hidden = false;
    $('#bootCode').textContent = '';
    if (info.canStart) {
      $('#bootMsg').textContent = `booting ${p.title}…`;
      fetch(`/api/start/${p.id}`, { method: 'POST' });
      const t0 = performance.now();
      clearInterval(bootTimer);
      bootTimer = setInterval(async () => {
        const s = await (await fetch(`/api/launch/${p.id}`)).json().catch(() => ({}));
        if (s.up) { clearInterval(bootTimer); bootEl.hidden = true; frame.src = s.url; }
        else if (performance.now() - t0 > 30000) { clearInterval(bootTimer); $('#bootMsg').textContent = `${p.title} didn't answer. check cache/${p.id}.log`; }
      }, 700);
    } else {
      $('#bootMsg').textContent = `${p.title} isn't running yet`;
      $('#bootCode').textContent = info.hint ? `start it in a terminal:\n\n${info.hint}\n\nthen hit ↻` : `nothing answering at ${info.url}\nstart it, then hit ↻`;
    }
  } else { bootEl.hidden = true; frame.src = info.url; }
  demoUrl = new URL(info.url, location.href).href;
}

let closing = false;
function closeDemo() {
  if (closing || mode !== 'demo') return;
  closing = true;
  clearInterval(bootTimer);
  $('#demoWin').classList.add('closing');
  audio.portalOut();
  setTimeout(() => {
    closing = false;
    demoFrozen = false;
    audio.resume();
    $('#demoFrame').src = 'about:blank';
    $('#demo').hidden = true; $('#boot').hidden = true; document.body.classList.remove('in-demo');
    const P = activePortal;
    if (P) {
      // step back out: standing in front of the portal, facing it, drifting backward
      const v = portalView(P, 5.2);
      player.place(v.pos.clone().setY(0), Math.atan2(v.fwd.x, v.fwd.z), -0.05); player.grounded = true;
      player.vel.copy(v.fwd).setY(0).multiplyScalar(3.5);
      fx.burst(v.center, { n: 90, speed: 6, colors: [P.p.color, HEX.cream] });
    }
    audio.setMix(zone === 'field' ? 'field' : 'hub');
    flash(P ? P.p.color : HEX.pink, 0.5); player.fovKick = 12;
    mode = 'world'; player.enabled = true;
    activePortal = null;
  }, 330);
}
$('#demoBackdrop').addEventListener('mousedown', closeDemo);
$('#demoBack').addEventListener('click', closeDemo);
// full-screen app: silence and freeze the world behind it; bring it back on exit
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement || mode === 'demo') audio.suspend();
  else audio.resume();
});
let demoUrl = null;
$('#demoPop').addEventListener('click', () => {
  if (!demoUrl) return;
  const w = Math.min(1400, screen.availWidth - 80), h = Math.min(900, screen.availHeight - 80);
  window.open(demoUrl, '1derworld-app', `popup,width=${w},height=${h},left=40,top=40`);
  $('#demoFrame').src = 'about:blank'; // release the camera so the popup can have it
  closeDemo();
});
$('#demoFull').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else ($('#demoFrame').requestFullscreen || $('#demoFrame').webkitRequestFullscreen).call($('#demoFrame'));
});
$('#demoReload').addEventListener('click', async () => {
  const p = activePortal?.p; if (!p) return;
  const info = await (await fetch(`/api/launch/${p.id}`)).json().catch(() => null);
  if (info?.up) { $('#boot').hidden = true; $('#demoFrame').src = info.url; } else toast('still not answering');
});

// ---------- portal menu ----------
function buildMenu() {
  const cards = $('#cards');
  cards.innerHTML = '';
  for (const p of projects) {
    const el = document.createElement('div');
    el.className = 'card'; el.style.setProperty('--c', p.color);
    el.dataset.q = `${p.title} ${p.tagline} ${(p.words || []).join(' ')}`.toLowerCase();
    const kind = { local: 'local', start: 'boots its server', url: p.github ? 'github pages' : 'dev server', external: 'github repo' }[p.kind];
    el.innerHTML = `<div class="th"${p.thumb ? ` style="background-image:url('${p.thumb}')"` : ''}>${p.thumb ? '' : p.title.slice(0, 2).toUpperCase()}</div>
      <div class="body"><div class="t"></div><div class="d"></div><div class="k">${kind}</div>
      <div class="row"><button data-a="warp">Warp</button><button class="go" data-a="go">Launch</button></div></div>`;
    el.querySelector('.t').textContent = p.title;
    el.querySelector('.d').textContent = p.tagline || '';
    el.querySelector('[data-a=warp]').onclick = () => { closeModals(); const P = portals.portals.find(x => x.p === p); if (current !== hub) setScene(hub); const f = portals.frontOf(P, 6); player.place(f.pos, f.yaw + Math.PI); audio.whoosh(0.5); flash(p.color, 0.5); mode = 'world'; player.enabled = true; lock(); };
    el.querySelector('[data-a=go]').onclick = () => { closeModals(); const P = portals.portals.find(x => x.p === p); if (current !== hub) setScene(hub); enterPortal(P, true); };
    cards.appendChild(el);
  }
  $('#search').addEventListener('input', e => { const q = e.target.value.toLowerCase(); cards.querySelectorAll('.card').forEach(c => c.hidden = q && !c.dataset.q.includes(q)); });
}
function openModal(id) { closeModals(); $(id).hidden = false; unlock(); player.steerOff = true; if (id === '#portalMenu') setTimeout(() => $('#search').focus(), 50); }
function closeModals() { document.querySelectorAll('.modal').forEach(m => m.hidden = true); player.steerOff = false; }
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { closeModals(); if (mode === 'world') lock(); });
document.querySelectorAll('.modal').forEach(m => m.addEventListener('mousedown', e => { if (e.target === m) closeModals(); }));
$('#btnList').onclick = () => openModal('#portalMenu');
$('#btnHelp').onclick = () => openModal('#help');
$('#btnLens').onclick = () => setLens(!lensOn);
$('#btnMute').onclick = () => { const m = audio.toggleMute(); $('#btnMute').style.opacity = m ? 0.5 : 1; };
$('#vol').oninput = e => audio.setVolume(+e.target.value);
document.querySelectorAll('[data-zone]').forEach(b => b.onclick = () => { warp(b.dataset.zone); lock(); });

// ---------- keys ----------
addEventListener('keydown', e => {
  const typing = e.target.tagName === 'INPUT';
  if (mode === 'title') return;
  if (e.code === 'Escape') {
    if (mode === 'demo') return closeDemo();
    if (mode === 'draw') return exitDraw();
    if (!document.querySelectorAll('.modal:not([hidden])').length) return;
    closeModals(); return;
  }
  if (typing) return;
  if (e.code === 'Tab') { e.preventDefault(); $('#portalMenu').hidden ? openModal('#portalMenu') : closeModals(); return; }
  if (mode === 'ride' && (e.code === 'Space' || e.code === 'Enter') && ride) { ride.t = Math.max(ride.t, 0.93); return; }
  if (mode !== 'world') return;
  if (e.code === 'KeyE' && hovered) act(hovered);
  if (e.code === 'KeyF' && heldTaco) biteTaco();
  if (e.code === 'KeyL') setLens(!lensOn);
  if (e.code === 'KeyM') $('#btnMute').click();
  if (e.code === 'KeyH') openModal('#help');
  const zi = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'].indexOf(e.code);
  if (zi >= 0) warp(['plaza', 'buffet', 'skate', 'tramp', 'shop', 'field', 'mezz'][zi]);
});

// MIDI keyboard: the world reacts
audio.on('midi', (note) => {
  shared.uBeat.value = 1;
  if (current === hub && portals) { const P = portals.portals[note % portals.portals.length]; P.hover = 1; fx.burst(P.disc.getWorldPosition(new THREE.Vector3()), { n: 20, speed: 4, colors: [P.p.color] }); }
});
audio.on('beat', e => {
  if (e.type === 'kick') shared.uBeat.value = 1;
  if (e.type === 'bar' && e.bar % 4 === 0 && current === hub && zone === 'plaza') bloom.strength = 1.3;
});

// ---------- main loop ----------
const clock = new THREE.Clock();
const prevPos = new THREE.Vector3();
let zoneTick = 0, ambTick = 0, whaleTick = 12, ventTick = 0, cullTick = 0;
const rollLoop = () => loops.hub.find(l => l.id === 'roll');

let simTime = 0, demoFrozen = false;
function frame() {
  requestAnimationFrame(frame);
  if (testing) return;
  tick(Math.min(clock.getDelta(), 0.05), true);
}
let testing = false;
function tick(dt, draw = true) {
  const t = (simTime += dt);
  shared.uTime.value = t;
  audio.pollEvents();
  const lv = audio.analyse();
  shared.uBass.value = lv.bass; shared.uHigh.value = lv.high;
  shared.uBeat.value *= Math.pow(0.004, dt);
  bloom.strength += (0.6 + lv.bass * 0.3 - bloom.strength) * Math.min(1, dt * 3);
  if (!current) return;
  if (document.fullscreenElement) return; // an app is full screen: don't render the world
  if (mode === 'demo' && demoFrozen) return; // an app is open: the world freezes as a backdrop so the app gets the whole machine
  if (mode === 'demo') demoFrozen = true;      // ...after drawing one last frame

  if (mode === 'title') {
    const a = t * 0.08;
    camera.position.set(Math.sin(a) * 9, 2.4 + Math.sin(t * 0.3) * 0.4, 3 + Math.cos(a) * 7);
    camera.lookAt(0, 1.8, -2);
  } else if (mode === 'ride') updateRide(dt);
  else if (mode === 'cine') cine && cine.update(dt);
  else {
    prevPos.copy(player.pos);
    player.update(dt);
    if (mode === 'draw') updateDraw();
    if (current === hub && mode === 'world') {
      const P = portals.crossing(prevPos, player.pos);
      if (P) enterPortal(P);
    }
    if (current === street && mode === 'world' && street.insideTruck(player.pos) && player.pos.z < -2.4 && Math.abs(player.pos.x - 0.9) < 0.9) openWasher();
  }

  // shake
  if (fx.shakeAmt > 0.001 && mode !== 'title') {
    const s = fx.shakeAmt * 0.12;
    camera.position.x += (Math.random() - 0.5) * s; camera.position.y += (Math.random() - 0.5) * s;
    camera.rotation.z += (Math.random() - 0.5) * s * 0.3;
  }

  shared.uPlayer.value.copy(player.pos);
  current.update(dt, t, camera);
  if (current === hub) portals.update(dt, t, player, hovered && hovered.action === 'portal' ? hovered.data : null);
  if (current === hub) for (const e of hub.fxQueue.splice(0)) {
    if (e.type === 'sparks') fx.sparks(e.pos, e.n);
    else if (e.type === 'smoke') fx.spawn(e.pos, { x: (Math.random() - .5) * 0.3, y: 0.8, z: (Math.random() - .5) * 0.3 }, '#8a7a9a', 0.25, 1.6, 0.4, 0.97);
    else if (e.type === 'pop' && player.pos.distanceTo(e.pos) < 14) fx.pop(e.text, e.pos, { size: 0.28, color: e.color });
    else if (e.type === 'burst' && player.pos.distanceTo(e.pos) < 14) fx.burst(e.pos, { n: 30, speed: 3, colors: [e.color, HEX.cream], size: 0.08 });
  } else if (hub) hub.fxQueue.length = 0;
  fx.update(dt, camera);
  for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i]; tw.t += dt / tw.dur; tw.f(Math.min(1, tw.t)); if (tw.t >= 1) { tw.end && tw.end(); tweens.splice(i, 1); } }
  updateHover();
  holdTaco();

  // zones, ambience
  if (current === hub && (zoneTick += dt) > 0.25) {
    zoneTick = 0;
    const z = hub.zoneAt(player.pos);
    if (z !== zone && mode === 'world') {
      zone = z; showZone(...ZONES[z]);
      document.querySelectorAll('#quickbar button').forEach(b => b.classList.toggle('here', b.dataset.zone === z));
      if (!lensOn) audio.setMix(z === 'field' ? 'field' : 'hub', 1.5);
      hub.scene.fog.color.set(z === 'field' ? '#ff6a3a' : HEX.deep);
      hub.scene.fog.near = z === 'field' ? 90 : 70;
    }
  }
  if (current === hub) {
    const rl = rollLoop();
    if (rl) {
      rl.h.setGain(player.grounded && player.groundKind === 'skate' ? Math.min(0.45, player.speed / 14 * 0.45) : 0, 0.05);
      const pn = rl.h.panner; if (pn.positionX) { pn.positionX.value = player.pos.x; pn.positionY.value = player.pos.y; pn.positionZ.value = player.pos.z; }
    }
    if ((ambTick -= dt) < 0) {
      ambTick = 0.3 + Math.random() * 1.2;
      if (zone === 'field') audio.chirp(player.pos.clone().add(new THREE.Vector3((Math.random() - .5) * 40, 3 + Math.random() * 6, (Math.random() - .5) * 40)));
    }
    if ((whaleTick -= dt) < 0) { whaleTick = 25 + Math.random() * 20; if (zone !== 'field') audio.whale(hub.whale.position); }
    // coming back from the prairie: the door opens for you
    if (player.pos.z < -31 && player.pos.z > -40 && Math.abs(player.pos.x) < 12 && hub.garage.target === 0) { hub.garage.target = 1; audio.garage(2.6, new THREE.Vector3(0, 5, -29.5)); }
    if ((cullTick += dt) > 0.5) { cullTick = 0; for (const l of loops.hub) if (l.id !== 'roll') l.h.setActive(l.h.pos.distanceTo(player.pos) < l.h.max); }
    if ((ventTick += dt) > 0.25) { ventTick = 0; for (const v of hub.bubbleVents) fx.bubbles(v, 2); }
  }
  if (lensTimer > 0) { lensTimer -= dt; if (lensTimer <= 0 && lensOn) setLens(false); }

  // post fx decay
  const F = final.uniforms;
  F.uFlash.value *= Math.pow(0.02, dt);
  F.uCA.value += (0.0015 - F.uCA.value) * Math.min(1, dt * 3);
  if (mode !== 'cine') F.uWarp.value *= Math.pow(0.01, dt);

  // audio listener follows the camera
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  audio.setListener(camera.position, fwd, up);
  if (current === street) audio.musicFilter && audio.musicFilter.frequency.setTargetAtTime(street.insideTruck(player.pos) ? 2600 : 650, audio.now, 0.3);

  if (draw) composer.render();
}

boot().then(() => frame()).catch(err => { console.error(err); $('#loading').textContent = 'something broke: ' + err.message; });
