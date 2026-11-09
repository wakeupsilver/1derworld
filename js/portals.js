// Portals: one per project. A vortex disc (with the app's own screenshot swirling inside),
// a curved wall of the app's real source code streaming behind it, its README vocabulary orbiting as relics,
// and a hum tuned to a chord tone so walking the ring plays a chord.
import * as THREE from 'three';
import { label, codeAtlas, loadImage } from './textures.js';
import { vortexMaterial, codeStreamMaterial, shared } from './shaders.js';
import { HEX, C } from './palette.js';
import { glow, mat } from './props.js';
import { HUB } from './hub.js';
import { codeUrl } from './api.js';

export function layoutRing(n) {
  // first ring up to 16, then an inner ring
  const out = [];
  const outer = Math.min(n, 16), inner = n - outer;
  const R1 = Math.max(9, Math.min(11.4, outer * 5.4 / (2 * Math.PI)));
  // offset by half a step so there's a gap facing north (where the slide drops you in)
  for (let i = 0; i < outer; i++) out.push({ R: R1, a: Math.PI / 2 + ((i + 0.5) / outer) * Math.PI * 2 });
  for (let i = 0; i < inner; i++) out.push({ R: 6.2, a: Math.PI / 2 + ((i + 0.5) / Math.max(inner, 1)) * Math.PI * 2 });
  return out;
}

export async function buildPortals(scene, projects, audio) {
  const group = new THREE.Group();
  scene.add(group);
  const portals = [];
  const slots = layoutRing(projects.length);
  const center = HUB.plaza;

  await Promise.all(projects.map(async (p, i) => {
    const { R, a } = slots[i];
    const g = new THREE.Group();
    g.position.set(center.x + Math.cos(a) * R, 0, center.z + Math.sin(a) * R);
    g.lookAt(center.x, 0, center.z); // +z faces the plaza center
    const color = new THREE.Color(p.color || HEX.pink);

    // thumbnail (an artifact from the app itself)
    let thumb = null;
    if (p.thumb) {
      const img = await loadImage(p.thumb);
      if (img) { thumb = new THREE.Texture(img); thumb.colorSpace = THREE.SRGBColorSpace; thumb.needsUpdate = true; }
    }
    // code stream from the app's actual source
    let code = '';
    try { code = await (await fetch(codeUrl(p.id))).text(); } catch { code = `// ${p.title}\n// ${p.tagline || ''}`; }
    const atlas = codeAtlas(code, 1024, 2048, 20);

    // base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.45, 0.22, 6), mat('#1a0838', { r: 0.4, m: 0.5, e: p.color, ei: 0.08 }));
    base.position.y = 0.11; g.add(base);
    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(2.32, 0.05, 4, 6).rotateX(Math.PI / 2), glow(p.color, 2.2)); baseRing.position.y = 0.24; g.add(baseRing);

    // disc + frame
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.8, 64), vortexMaterial(color, thumb));
    disc.position.y = 2.6; g.add(disc);
    const frame = new THREE.Mesh(new THREE.TorusGeometry(1.94, 0.15, 16, 80), mat(p.color, { e: p.color, ei: 1.6, r: 0.3, m: 0.4 }));
    frame.position.y = 2.6; g.add(frame);
    const orbitA = new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.03, 6, 80, Math.PI * 1.3), glow(HEX.amber, 2.5)); orbitA.position.y = 2.6; g.add(orbitA);
    const orbitB = new THREE.Mesh(new THREE.TorusGeometry(2.38, 0.022, 6, 80, Math.PI * 0.8), glow(HEX.cream, 2)); orbitB.position.y = 2.6; g.add(orbitB);

    // code wall behind (curved)
    const theta = 5.0 / 6.5;
    const codeWall = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 9.5, 32, 1, true, Math.PI - theta / 2, theta),
      codeStreamMaterial(atlas, { trail: color, hot: C.pink, head: C.amber, speed: 0.8 + Math.random() * 0.6, cols: 52, repeatY: 0.55, opacity: 0.95 }));
    codeWall.position.set(0, 4.75, 5.3); g.add(codeWall);

    // labels
    const title = label(p.title, 0.62, { font: 'Bungee', color: HEX.cream, glow: p.color, stroke: '#1a0838', size: 110 });
    title.position.set(0, 5.1, 0.1);
    const maxW = 4.8; if (title.geometry.parameters.width > maxW) title.scale.setScalar(maxW / title.geometry.parameters.width);
    g.add(title);
    if (p.tagline) {
      const tl = p.tagline.length > 70 ? p.tagline.slice(0, 68).replace(/\s+\S*$/, '') + '…' : p.tagline;
      const tag = label(tl, 0.2, { font: 'Fjalla One', color: HEX.cream, size: 64 });
      if (tag.geometry.parameters.width > 4.6) tag.scale.setScalar(4.6 / tag.geometry.parameters.width);
      tag.position.set(0, 4.6, 0.1); g.add(tag);
    }
    const kindTxt = { local: 'LIVE · LOCAL', start: 'BOOTS ITS SERVER', url: p.github ? 'GITHUB PAGES' : 'DEV SERVER', external: 'OPENS ON GITHUB' }[p.kind] || '';
    const kind = label(kindTxt, 0.16, { font: 'JetBrains Mono', weight: 800, color: p.color, glow: p.color, size: 56 });
    kind.position.set(0, 0.45, 0.6); kind.rotation.x = -0.6; g.add(kind);

    // relics: the app's own words orbiting
    const relics = [];
    (p.words || []).slice(0, 8).forEach((w, k) => {
      const r = label(w, 0.26, { font: 'Bungee', color: [HEX.amber, HEX.pink, HEX.lime, HEX.cream][k % 4], glow: p.color, size: 70 });
      r.userData = { a: k / 8 * Math.PI * 2, y: 1.2 + (k % 4) * 1.0, sp: 0.25 + Math.random() * 0.2 };
      g.add(r); relics.push(r);
    });
    // floating screenshot card
    let card = null;
    if (thumb) {
      card = new THREE.Group();
      const img = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.19), new THREE.MeshBasicMaterial({ map: thumb, toneMapped: false, side: THREE.DoubleSide }));
      const fr = new THREE.Mesh(new THREE.PlaneGeometry(2.02, 1.31), glow(p.color, 1.8)); fr.position.z = -0.01;
      card.add(fr, img);
      card.position.set(2.9, 3.3, 0.9); card.rotation.y = -0.45;
      g.add(card);
    }
    group.add(g);

    const hum = audio.ready ? audio.loop('hum', g.position.clone().setY(2.6), { freq: 87.31 * Math.pow(2, [0, 3, 5, 7, 10, 12, 15, 17][i % 8] / 12), v: 0.12, ref: 2.5, rolloff: 1.8, max: 30 }) : null;
    portals.push({ p, g, disc, frame, orbitA, orbitB, codeWall, title, relics, card, hum, hover: 0, near: 0, i });
  }));

  return {
    group, portals,
    update(dt, t, player, hovered) {
      for (const P of portals) {
        const d = P.g.position.distanceTo(player.pos);
        P.near = THREE.MathUtils.clamp(1 - (d - 3) / 9, 0, 1);
        const target = Math.max(P.near * 0.6, hovered === P ? 1 : 0);
        P.hover += (target - P.hover) * Math.min(1, dt * 6);
        P.disc.material.uniforms.uHover.value = P.hover;
        P.codeWall.material.uniforms.uBoost.value = P.hover;
        P.orbitA.rotation.z = t * 0.9 + P.i; P.orbitB.rotation.z = -t * 1.3 + P.i;
        const s = 1 + P.hover * 0.06 + shared.uBeat.value * 0.03;
        P.frame.scale.set(s, s, 1);
        P.frame.material.emissiveIntensity = 1.4 + P.hover * 2 + shared.uBeat.value * 1.5;
        P.title.position.y = 5.1 + Math.sin(t * 1.5 + P.i) * 0.08;
        for (const r of P.relics) {
          const u = r.userData, a = u.a + t * u.sp;
          r.position.set(Math.cos(a) * 2.9, u.y + Math.sin(t + u.a) * 0.2, Math.sin(a) * 1.4 + 0.4);
          r.lookAt(player.camera.position);
        }
        if (P.card) { P.card.position.y = 3.3 + Math.sin(t * 0.9 + P.i) * 0.15; }
        if (P.hum) P.hum.setGain(0.08 + P.near * 0.18, 0.2);
      }
    },
    // returns the portal the player just stepped into, if any
    crossing(prevPos, pos) {
      for (const P of portals) {
        const a = P.g.worldToLocal(prevPos.clone().setY(prevPos.y + 1.2));
        const b = P.g.worldToLocal(pos.clone().setY(pos.y + 1.2));
        if (a.z > 0.05 && b.z <= 0.05 && Math.abs(b.x) < 1.7 && b.y > 0.3 && b.y < 4.4) return P;
      }
      return null;
    },
    frontOf(P, dist = 4.2) {
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(P.g.quaternion);
      const pos = P.g.position.clone().addScaledVector(fwd, dist);
      return { pos, yaw: Math.atan2(-fwd.x, -fwd.z) };
    },
  };
}
