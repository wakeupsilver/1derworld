// First-person body: walking, running, skate-glide, jumping, trampolines, launch pads, ramps that throw you.
// Works with WASD/arrows + Space + mouse, which also means it works with a Makey Makey.
import * as THREE from 'three';

const G = -24, STEP = 0.55, EYE = 1.65, RADIUS = 0.32;

export class Player {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0; this.roll = 0;
    this.grounded = true;
    this.groundKind = 'floor';
    this.groundVel = 0;
    this.keys = {};
    this.enabled = false;
    this.world = null;
    this.stepAcc = 0;
    this.bob = 0;
    this.airTime = 0;
    this.airFrom = 'floor';
    this.fovKick = 0;
    this.baseFov = 72;
    this.handlers = {};
    this.lookVel = { x: 0, y: 0 };
    this.lastTrap = null;
    this.dragging = false;
    this.mouse = { x: 0, y: 0, inside: false };
    addEventListener('mousemove', e => { this.mouse.x = e.clientX / innerWidth * 2 - 1; this.mouse.y = e.clientY / innerHeight * 2 - 1; this.mouse.inside = e.target === dom; }); // over buttons/menus: no steering
    document.addEventListener('mouseleave', () => { this.mouse.inside = false; });
    addEventListener('blur', () => { this.mouse.inside = false; });

    addEventListener('keydown', e => { this.keys[e.code] = true; if ((e.code === 'Space' || e.code.startsWith('Arrow')) && this.enabled) e.preventDefault(); });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });

    // Look like the Scratch Portfolio Bedroom: grab the world and drag it. No pointer lock, no "click to look".
    // A press that moves less than 6px is a click (used to pick things); anything more is a look-drag.
    dom.style.cursor = 'grab';
    let down = null;
    dom.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      down = { lastX: e.clientX, lastY: e.clientY, moved: 0, id: e.pointerId };
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener('pointermove', e => {
      if (!down || e.pointerId !== down.id) return;
      const dx = e.clientX - down.lastX, dy = e.clientY - down.lastY;
      down.lastX = e.clientX; down.lastY = e.clientY;
      down.moved += Math.abs(dx) + Math.abs(dy);
      if (down.moved > 6 && this.enabled) {
        this.yaw += dx * 0.0042;
        this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + dy * 0.0042));
        this.lookVel.x = -dx;
        this.dragging = true;
        dom.style.cursor = 'grabbing';
      }
    });
    const up = e => {
      if (!down) return;
      const wasClick = down.moved <= 6;
      down = null; this.dragging = false; dom.style.cursor = 'grab';
      if (wasClick) this.emit('click', e);
    };
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', () => { down = null; this.dragging = false; dom.style.cursor = 'grab'; });
    // scroll wheel steps you forward / back
    dom.addEventListener('wheel', e => {
      e.preventDefault();
      if (!this.enabled) return;
      const f = this.forward().multiplyScalar(-Math.sign(e.deltaY) * Math.min(6, 2 + Math.abs(e.deltaY) * 0.04));
      this.vel.x += f.x; this.vel.z += f.z;
    }, { passive: false });
    dom.addEventListener('contextmenu', e => e.preventDefault());
  }

  on(ev, fn) { (this.handlers[ev] ||= []).push(fn); }
  emit(ev, ...a) { (this.handlers[ev] || []).forEach(f => f(...a)); }

  look(dx, dy) {
    const s = 0.0022;
    this.yaw -= dx * s; this.pitch -= dy * s;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    this.lookVel.x = dx;
  }

  place(p, yaw = this.yaw, pitch = 0) {
    this.pos.copy(p); this.vel.set(0, 0, 0); this.yaw = yaw; this.pitch = pitch; this.grounded = false; this.airTime = 0;
  }

  forward(out = new THREE.Vector3()) { return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }

  launchTo(target, T = 1.1) {
    const d = target.clone().sub(this.pos);
    this.vel.set(d.x / T, (d.y - 0.5 * G * T * T) / T, d.z / T);
    this.grounded = false; this.airFrom = 'launch'; this.airTime = 0;
  }

  update(dt) {
    const w = this.world;
    if (!w) return;
    const k = this.keys;
    const f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const r = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
    // arrows turn (Makey Makey friendly)
    if (this.enabled) {
      this.yaw += ((k.ArrowLeft ? 1 : 0) - (k.ArrowRight ? 1 : 0)) * 2.3 * dt;
    }
    const run = k.ShiftLeft || k.ShiftRight;
    const fwd = this.forward(), right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const wish = fwd.multiplyScalar(f).add(right.multiplyScalar(r));
    if (wish.lengthSq() > 1) wish.normalize();
    if (!this.enabled) wish.set(0, 0, 0);

    const skate = this.groundKind === 'skate';
    const boost = this.boost > 0 ? 1.4 : 1;   // taco power
    if (this.boost > 0) this.boost -= dt;
    const top = (skate ? (run ? 15 : 10) : (run ? 10.5 : 5.6)) * boost;
    const accel = this.grounded ? (skate ? 4 : 11) : 1.8;
    const hv = new THREE.Vector3(this.vel.x, 0, this.vel.z);
    if (wish.lengthSq() > 0 || !skate || !this.grounded) {
      const target = wish.multiplyScalar(top);
      if (!this.grounded && wish.lengthSq() === 0) target.copy(hv); // keep momentum in the air
      hv.lerp(target, Math.min(1, accel * dt));
    } else hv.multiplyScalar(1 - Math.min(1, 0.35 * dt)); // skate glide
    // ramps push you downhill when skating
    if (skate && this.grounded) {
      const e = 0.3, h0 = w.sample(this.pos.x, this.pos.z, this.pos.y + 1).h;
      const gx = (w.sample(this.pos.x + e, this.pos.z, this.pos.y + 1).h - h0) / e;
      const gz = (w.sample(this.pos.x, this.pos.z + e, this.pos.y + 1).h - h0) / e;
      hv.x -= gx * 6 * dt; hv.z -= gz * 6 * dt;
    }
    this.vel.x = hv.x; this.vel.z = hv.z;

    if (this.enabled && k.Space && this.grounded && !this.jumpLock) {
      this.vel.y = this.boost > 0 ? 12 : 8.6; this.grounded = false; this.airFrom = this.groundKind; this.airTime = 0; this.jumpLock = true;
      this.emit('jump');
    }
    if (!k.Space) this.jumpLock = false;

    // horizontal, axis separated
    const y = this.pos.y;
    const nx = this.pos.x + this.vel.x * dt;
    if (!w.blocked(nx, this.pos.z, y, RADIUS)) this.pos.x = nx; else { this.emit('bump', Math.abs(this.vel.x)); this.vel.x *= -0.2; }
    const nz = this.pos.z + this.vel.z * dt;
    if (!w.blocked(this.pos.x, nz, y, RADIUS)) this.pos.z = nz; else { this.emit('bump', Math.abs(this.vel.z)); this.vel.z *= -0.2; }

    // vertical
    const g = w.sample(this.pos.x, this.pos.z, this.pos.y);
    if (this.grounded) {
      if (g.h >= this.pos.y - 0.35 && g.h <= this.pos.y + STEP) {
        this.groundVel = (g.h - this.pos.y) / Math.max(dt, 1e-4);
        this.pos.y = g.h; this.vel.y = 0;
        this.setGround(g);
        if (g.kind === 'launch') { this.launchTo(g.data.target, g.data.T || 1.1); this.emit('launch', g.data); }
        else if (g.kind === 'tramp') { this.vel.y = 10; this.grounded = false; this.airFrom = 'tramp'; this.airTime = 0; this.emit('bounce', g.data, 10); }
      } else {
        this.grounded = false; this.airFrom = this.groundKind; this.airTime = 0;
        this.vel.y = Math.max(0, Math.min(this.groundVel, 14)); // ramps throw you
      }
    }
    if (!this.grounded) {
      this.airTime += dt;
      this.vel.y += G * dt;
      this.pos.y += this.vel.y * dt;
      const c = w.ceiling(this.pos.x, this.pos.z, this.pos.y);
      if (this.pos.y + 1.8 > c && this.vel.y > 0) { this.pos.y = c - 1.8; this.vel.y = -2; this.emit('bonk'); }
      const g2 = w.sample(this.pos.x, this.pos.z, this.pos.y - this.vel.y * dt);
      if (this.pos.y <= g2.h && this.vel.y <= 0) {
        const impact = -this.vel.y;
        this.pos.y = g2.h;
        if (g2.kind === 'tramp') {
          this.vel.y = Math.min(24, Math.max(10, impact * 0.93 + 4) + (k.Space ? 5 : 0));
          this.emit('bounce', g2.data, this.vel.y);
          this.airFrom = 'tramp'; this.airTime = 0;
        } else if (g2.kind === 'launch') {
          this.pos.y = g2.h; this.launchTo(g2.data.target, g2.data.T || 1.1); this.emit('launch', g2.data);
        } else {
          this.grounded = true; this.vel.y = 0; this.groundVel = 0;
          this.emit('land', impact, g2.kind, this.airTime, this.airFrom);
          this.setGround(g2);
        }
      }
      if (this.pos.y < -18) this.emit('fellOut');
    }

    // footsteps
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (this.grounded && sp > 0.8) {
      this.stepAcc += sp * dt;
      this.bob += sp * dt * 2.2;
      const stride = run ? 2.6 : 2.0;
      if (this.stepAcc > stride && this.groundKind !== 'skate') { this.stepAcc = 0; this.emit('step', this.groundKind, sp); }
    }
    this.speed = sp;

    // camera
    const targetRoll = (skate ? -r * 0.06 : -r * 0.015) - this.lookVel.x * 0.0004;
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 6);
    this.lookVel.x *= 0.8;
    const bobY = this.grounded && !skate ? Math.sin(this.bob) * 0.05 * Math.min(1, sp / 5) : 0;
    this.camera.position.set(this.pos.x, this.pos.y + EYE + bobY, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ');
    const fov = this.baseFov + Math.min(16, Math.max(0, sp - 5) * 1.1) + Math.min(10, Math.abs(this.vel.y) * 0.35) + this.fovKick;
    this.fovKick *= Math.pow(0.05, dt);
    if (Math.abs(this.camera.fov - fov) > 0.05) { this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 8); this.camera.updateProjectionMatrix(); }
  }

  setGround(g) {
    if (g.kind !== this.groundKind) this.emit('surface', g.kind, this.groundKind);
    this.groundKind = g.kind;
    if (g.kind === 'trap' && this.lastTrap !== g.data) { this.lastTrap = g.data; this.emit('trap', g.data); }
    if (g.kind !== 'trap') this.lastTrap = null;
    if (g.kind === 'trigger') this.emit('trigger', g.data);
  }
}

export { EYE };
