// Juice: particle bursts, confetti, sparks, bubbles, floating pop-text, camera shake.
import * as THREE from 'three';
import { label } from './textures.js';
import { NEON } from './palette.js';

const MAX = 4000;

export class FX {
  constructor(scene) {
    this.scene = scene;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.size = new Float32Array(MAX);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.grav = new Float32Array(MAX);
    this.drag = new Float32Array(MAX);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 } },
      vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC; varying float vA;
        void main(){ vC=color; vA=step(0.001,size); vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*600.0/-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 p=gl_PointCoord-0.5; float d=length(p); if(d>0.5||vA<0.5) discard; float a=smoothstep(0.5,0.0,d); gl_FragColor=vec4(vC*(0.6+a*1.8)*a, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.geo = geo;
    this.cursor = 0;
    this.texts = [];
    this.shakeAmt = 0;
  }

  attach(scene) { scene.add(this.points); this.scene = scene; }

  spawn(p, v, color, size, life, grav = -9, drag = 0.98) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % MAX;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.vel.set([v.x, v.y, v.z], i * 3);
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    this.col.set([c.r, c.g, c.b], i * 3);
    this.size[i] = size; this.life[i] = life; this.maxLife[i] = life; this.grav[i] = grav; this.drag[i] = drag;
  }

  burst(p, { n = 40, speed = 6, colors = NEON, size = 0.18, life = 1.2, grav = -9, up = 2, spread = 1 } = {}) {
    for (let k = 0; k < n; k++) {
      const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5 + up * 0.25, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      d.x *= spread; d.z *= spread;
      this.spawn(p, d, colors[k % colors.length], size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.6), grav);
    }
  }

  ring(p, { n = 48, speed = 7, color = '#ff6caf', size = 0.2, life = 0.8 } = {}) {
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; this.spawn(p, { x: Math.cos(a) * speed, y: 0.6, z: Math.sin(a) * speed }, color, size, life, 0, 0.93); }
  }

  sparks(p, n = 24) { this.burst(p, { n, speed: 5, colors: ['#ffbf00', '#ff8000', '#fff3e0'], size: 0.06, life: 0.6, grav: -14, up: 1.5 }); }

  bubbles(p, n = 6) { for (let k = 0; k < n; k++) this.spawn({ x: p.x + (Math.random() - .5) * 0.6, y: p.y, z: p.z + (Math.random() - .5) * 0.6 }, { x: 0, y: 0.8 + Math.random(), z: 0 }, '#9ff', 0.08 + Math.random() * 0.1, 3, 0.3, 1); }

  pop(text, p, { color = '#ffbf00', size = 0.5, life = 1.4, font = 'Bungee', rise = 1.4 } = {}) {
    const m = label(text, size, { color, glow: color, stroke: '#1a0838', font, size: 110 });
    m.position.copy(p);
    m.userData = { life, max: life, rise };
    this.scene.add(m);
    this.texts.push(m);
    return m;
  }

  shake(a) { this.shakeAmt = Math.min(1.2, this.shakeAmt + a); }

  update(dt, camera) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) { if (this.size[i]) this.size[i] = 0; continue; }
      this.life[i] -= dt;
      const j = i * 3, d = this.drag[i];
      this.vel[j + 1] += this.grav[i] * dt;
      this.vel[j] *= d; this.vel[j + 1] *= d; this.vel[j + 2] *= d;
      this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      const k = this.life[i] / this.maxLife[i];
      if (k < 0.3) this.size[i] *= 0.9;
      if (this.life[i] <= 0) this.size[i] = 0;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i], u = t.userData;
      u.life -= dt;
      const k = 1 - u.life / u.max;
      t.position.y += dt * u.rise * (1 - k);
      t.quaternion.copy(camera.quaternion);
      const s = k < 0.15 ? k / 0.15 * 1.25 : 1.25 - Math.min(0.25, (k - 0.15) * 2);
      t.scale.setScalar(s);
      t.material.opacity = u.life < 0.4 ? u.life / 0.4 : 1;
      if (u.life <= 0) { this.scene.remove(t); t.geometry.dispose(); t.material.map.dispose(); t.material.dispose(); this.texts.splice(i, 1); }
    }
    this.shakeAmt *= Math.pow(0.02, dt);
  }
}
