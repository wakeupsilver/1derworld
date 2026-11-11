// Memo, who runs the taco truck. Stylized but properly built: shaped body, two-jointed arms, a face with
// eyes that blink and look at you, brows, nose, ears, mustache, and a jaw that moves when he talks.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat } from './props.js';
import { label } from './textures.js';
import { HEX } from './palette.js';

const M = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };

export function makeCook(name = 'MEMO') {
  const skin = mat('#c98c5e', { r: 0.55 }), skinDark = mat('#a86e44', { r: 0.6 });
  const tee = mat('#2f5fb8', { r: 0.75 }), apronM = mat('#f4efe6', { r: 0.85 }), hairM = mat('#1f150f', { r: 0.9 });
  const capM = mat('#d8202f', { r: 0.6 }), dark = mat('#1a0f0a', { r: 0.4 }), white = mat('#fbf8f2', { r: 0.3 });
  const g = new THREE.Group();

  // torso: lathe profile from waist up through a little belly to the shoulders
  const prof = [[0.0, 0], [0.2, 0], [0.235, 0.12], [0.25, 0.28], [0.245, 0.42], [0.23, 0.55], [0.2, 0.63], [0.12, 0.67], [0.06, 0.68]].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = M(new THREE.LatheGeometry(prof, 28), tee, 0, 0.95, 0); torso.scale.set(1.08, 1, 0.78); g.add(torso);
  // apron with strap and pocket
  const apron = M(new RoundedBoxGeometry(0.4, 0.58, 0.02, 2, 0.01), apronM, 0, 1.18, 0.19); apron.rotation.x = -0.06; g.add(apron);
  g.add(M(new THREE.BoxGeometry(0.03, 0.22, 0.012), apronM, -0.12, 1.55, 0.17), M(new THREE.BoxGeometry(0.03, 0.22, 0.012), apronM, 0.12, 1.55, 0.17));
  g.add(M(new RoundedBoxGeometry(0.16, 0.08, 0.012, 2, 0.005), mat('#e6dfd2', { r: 0.9 }), 0, 1.06, 0.205));
  const tag = label(name, 0.07, { font: 'Bungee', color: HEX.cream, bg: HEX.red, size: 60, pad: 12 }); tag.position.set(0.1, 1.38, 0.205); g.add(tag);
  // neck + head
  g.add(M(new THREE.CylinderGeometry(0.065, 0.075, 0.12, 14), skin, 0, 1.68, 0));
  const head = new THREE.Group(); head.position.set(0, 1.86, 0.01); g.add(head);
  const skull = M(new THREE.SphereGeometry(0.135, 28, 20), skin); skull.scale.set(0.95, 1.12, 1.0); head.add(skull);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.06, 0.02); head.add(jaw);
  const chin = M(new THREE.SphereGeometry(0.1, 20, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skin); chin.scale.set(1.05, 0.9, 1.05); jaw.add(chin);
  for (const s of [-1, 1]) { const ear = M(new THREE.SphereGeometry(0.03, 10, 8), skinDark, s * 0.128, 0.0, -0.005); ear.scale.set(0.5, 1, 0.8); head.add(ear); }
  const nose = M(new THREE.SphereGeometry(0.026, 12, 10), skinDark, 0, -0.012, 0.132); nose.scale.set(1, 1.2, 1.1); head.add(nose);
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(s * 0.048, 0.03, 0.112); head.add(eye);
    eye.add(M(new THREE.SphereGeometry(0.022, 14, 10), white));
    const pupil = M(new THREE.SphereGeometry(0.012, 10, 8), dark, 0, 0, 0.014); eye.add(pupil);
    eyes.push({ eye, pupil });
    const brow = M(new RoundedBoxGeometry(0.05, 0.012, 0.012, 2, 0.005), hairM, s * 0.05, 0.072, 0.118); brow.rotation.z = -s * 0.12; head.add(brow);
  }
  const stache = M(new THREE.TorusGeometry(0.045, 0.014, 8, 20, Math.PI), hairM, 0, -0.045, 0.118); stache.rotation.z = Math.PI; stache.scale.set(1.15, 0.7, 1); head.add(stache);
  const mouth = M(new THREE.TorusGeometry(0.025, 0.005, 6, 12, Math.PI), mat('#5a1f1a'), 0, -0.07, 0.115); mouth.rotation.z = Math.PI; jaw.add(mouth); mouth.position.y = -0.005;
  // hair band under a cap with a brim facing forward
  const hairBand = M(new THREE.CylinderGeometry(0.133, 0.133, 0.05, 24, 1, true), hairM, 0, 0.055, -0.01); hairBand.material.side = THREE.DoubleSide; head.add(hairBand);
  const cap = M(new THREE.SphereGeometry(0.14, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), capM, 0, 0.07, -0.005); cap.scale.set(1, 0.85, 1.02); head.add(cap);
  const brim = M(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 20, 1, false, -Math.PI / 2, Math.PI), capM, 0, 0.075, 0.1); brim.scale.z = 0.9; brim.rotation.x = 0.12; head.add(brim);
  const button = M(new THREE.SphereGeometry(0.012, 8, 6), capM, 0, 0.19, -0.005); head.add(button);

  // arms: shoulder -> upper sleeve -> elbow -> skin forearm -> mitten hand
  const arm = side => {
    const shoulder = new THREE.Group(); shoulder.position.set(side * 0.255, 1.58, 0); g.add(shoulder);
    shoulder.add(M(new THREE.SphereGeometry(0.075, 14, 10), tee));
    shoulder.add(M(new THREE.CapsuleGeometry(0.068, 0.14, 4, 12), tee, 0, -0.12, 0));
    const elbow = new THREE.Group(); elbow.position.y = -0.26; shoulder.add(elbow);
    elbow.add(M(new THREE.CapsuleGeometry(0.05, 0.2, 4, 12), skin, 0, -0.12, 0));
    const hand = new THREE.Group(); hand.position.y = -0.27; elbow.add(hand);
    hand.add(M(new RoundedBoxGeometry(0.075, 0.09, 0.04, 2, 0.018), skin));
    const thumb = M(new THREE.CapsuleGeometry(0.013, 0.03, 3, 6), skin, side * -0.035, 0.01, 0.015); thumb.rotation.z = side * 0.6; hand.add(thumb);
    return { shoulder, elbow, hand };
  };
  const L = arm(-1), R = arm(1);
  // spatula in the right hand
  const spat = new THREE.Group(); spat.add(M(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), mat('#3a2a1a'), 0, -0.05, 0));
  spat.add(M(new THREE.BoxGeometry(0.1, 0.004, 0.08), mat('#d8d8e0', { m: 1, r: 0.25 }), 0, -0.16, 0.03));
  R.hand.add(spat);

  const st = { blink: 2, talk: 0, serving: 0 };
  const tmp = new THREE.Vector3(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion();
  g.userData = {
    st, head,
    say(seconds = 2) { st.talk = seconds; },
    serve(seconds = 1.2) { st.serving = seconds; },
    update(dt, t, lookAt) {
      // breathing + a little sway
      torso.scale.y = 1 + Math.sin(t * 2.2) * 0.012;
      g.rotation.y = Math.sin(t * 0.45) * 0.08;
      // look at the visitor if they're near, otherwise glance around
      q0.copy(head.quaternion);
      if (lookAt && g.parent) {
        head.lookAt(tmp.copy(lookAt));
        const e = new THREE.Euler().setFromQuaternion(head.quaternion, 'YXZ');
        e.y = THREE.MathUtils.clamp(e.y, -1.0, 1.0); e.x = THREE.MathUtils.clamp(e.x, -0.4, 0.35); e.z = 0;
        q1.setFromEuler(e);
      } else q1.setFromEuler(new THREE.Euler(0, Math.sin(t * 0.6) * 0.5, 0));
      head.quaternion.copy(q0).slerp(q1, Math.min(1, dt * 4));
      // blink
      st.blink -= dt; const closed = st.blink < 0.12; if (st.blink < 0) st.blink = 2 + Math.random() * 3;
      for (const { eye } of eyes) eye.scale.y = closed ? 0.12 : 1;
      // talk: jaw + mustache
      st.talk = Math.max(0, st.talk - dt);
      const open = st.talk > 0 ? Math.abs(Math.sin(t * 16)) * 0.18 : 0;
      jaw.rotation.x = open; stache.position.y = -0.045 - open * 0.02;
      // arms: flipping on the grill, or reaching out to hand you a taco
      st.serving = Math.max(0, st.serving - dt);
      if (st.serving > 0) {
        R.shoulder.rotation.x += (-1.35 - R.shoulder.rotation.x) * Math.min(1, dt * 10);
        R.elbow.rotation.x += (-0.2 - R.elbow.rotation.x) * Math.min(1, dt * 10);
      } else {
        R.shoulder.rotation.x = -0.55 + Math.sin(t * 5) * 0.15; R.shoulder.rotation.z = 0.15;
        R.elbow.rotation.x = -0.9 + Math.sin(t * 5 + 0.6) * 0.45;
      }
      L.shoulder.rotation.x = -0.35 + Math.sin(t * 1.3) * 0.06; L.shoulder.rotation.z = -0.12; L.elbow.rotation.x = -0.6;
    },
  };
  return g;
}
