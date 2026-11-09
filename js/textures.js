// Canvas-made textures: neon labels, the JoyLabz circuit-board decoration, code atlases.
import * as THREE from 'three';
import { HEX } from './palette.js';

const rand = (a, b) => a + Math.random() * (b - a);

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function tex(c, { repeat, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// Neon text. Returns {texture, aspect}.
export function textTexture(text, o = {}) {
  const font = o.font || 'Bungee';
  const size = o.size || 96;
  const pad = o.pad ?? size * 0.45;
  const lines = String(text).split('\n');
  const m = canvas(8, 8).getContext('2d');
  m.font = `${o.weight || 400} ${size}px "${font}"`;
  const lineH = size * (o.lineHeight || 1.15);
  let w = Math.max(...lines.map(l => m.measureText(l).width)) + pad * 2;
  const h = lineH * lines.length + pad * 2 - (lineH - size);
  const c = canvas(Math.ceil(w), Math.ceil(h));
  const g = c.getContext('2d');
  if (o.bg) {
    g.fillStyle = o.bg;
    roundRect(g, 0, 0, c.width, c.height, o.radius ?? size * 0.3); g.fill();
    if (o.border) { g.lineWidth = size * 0.08; g.strokeStyle = o.border; roundRect(g, g.lineWidth, g.lineWidth, c.width - g.lineWidth * 2, c.height - g.lineWidth * 2, o.radius ?? size * 0.3); g.stroke(); }
  }
  g.font = m.font;
  g.textBaseline = 'top';
  g.textAlign = o.align || 'center';
  const x = g.textAlign === 'center' ? c.width / 2 : pad;
  lines.forEach((l, i) => {
    const y = pad + i * lineH;
    if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = size * 0.35; }
    if (o.stroke) { g.lineWidth = size * 0.12; g.strokeStyle = o.stroke; g.lineJoin = 'round'; g.strokeText(l, x, y); }
    if (o.gradient) {
      const gr = g.createLinearGradient(0, y, 0, y + size);
      o.gradient.forEach((cc, j) => gr.addColorStop(j / (o.gradient.length - 1), cc));
      g.fillStyle = gr;
    } else g.fillStyle = o.color || '#fff';
    g.fillText(l, x, y);
    if (o.glow) { g.shadowBlur = 0; g.fillText(l, x, y); }
  });
  return { texture: tex(c), aspect: c.width / c.height, canvas: c };
}

// A flat label mesh `height` world units tall. Unlit so it glows under bloom.
export function label(text, height, o = {}) {
  const { texture, aspect } = textTexture(text, o);
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: o.side ?? THREE.DoubleSide, toneMapped: false, fog: o.fog ?? false });
  if (o.intensity) mat.color.setScalar(o.intensity);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height), mat);
  mesh.userData.aspect = aspect;
  mesh.renderOrder = 2;
  return mesh;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// ---- The deck decoration: circuit traces with pads, vias and game-icon tiles ----
// Red channel = traces, green channel = icons/pads (so shaders can pulse them separately).
function drawIcon(g, kind, x, y, s) {
  g.save(); g.translate(x, y);
  g.lineWidth = s * 0.07; g.lineCap = 'round'; g.lineJoin = 'round';
  roundRect(g, -s / 2, -s / 2, s, s, s * 0.18); g.stroke();
  const k = s * 0.28;
  g.beginPath();
  if (kind === 'heart') {
    g.moveTo(0, k * 0.9);
    g.bezierCurveTo(-k * 1.6, -k * 0.2, -k * 0.7, -k * 1.3, 0, -k * 0.45);
    g.bezierCurveTo(k * 0.7, -k * 1.3, k * 1.6, -k * 0.2, 0, k * 0.9); g.fill();
  } else if (kind === 'star') {
    for (let i = 0; i < 10; i++) { const r = i % 2 ? k * 0.45 : k * 1.05, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill();
  } else if (kind === 'dpad') {
    const t = k * 0.42;
    g.rect(-t, -k * 1.1, t * 2, k * 2.2); g.rect(-k * 1.1, -t, k * 2.2, t * 2); g.fill();
  } else if (kind === 'bolt') {
    g.moveTo(k * 0.2, -k * 1.1); g.lineTo(-k * 0.6, k * 0.15); g.lineTo(-k * 0.05, k * 0.15);
    g.lineTo(-k * 0.3, k * 1.1); g.lineTo(k * 0.6, -k * 0.2); g.lineTo(k * 0.05, -k * 0.2); g.closePath(); g.fill();
  } else if (kind === 'buttons') {
    g.arc(-k * 0.55, k * 0.25, k * 0.38, 0, 7); g.fill(); g.beginPath(); g.arc(k * 0.55, -k * 0.25, k * 0.38, 0, 7); g.fill();
  } else if (kind === 'plus') {
    g.arc(0, 0, k * 0.9, 0, 7); g.stroke(); g.beginPath(); g.moveTo(-k * 0.5, 0); g.lineTo(k * 0.5, 0); g.moveTo(0, -k * 0.5); g.lineTo(0, k * 0.5); g.stroke();
  }
  g.restore();
}

export function circuitCanvas(size = 1024, o = {}) {
  const c = canvas(size, size);
  const g = c.getContext('2d');
  g.fillStyle = o.bg || '#000'; g.fillRect(0, 0, size, size);
  const grid = size / 32;
  const trace = o.trace || '#ff0000';
  const icon = o.icon || '#00ff00';
  // draw everything 9 times shifted so the texture tiles
  const shapes = [];
  for (let i = 0; i < (o.traces || 46); i++) {
    let x = Math.floor(rand(0, 32)) * grid, y = Math.floor(rand(0, 32)) * grid;
    const pts = [[x, y]];
    let dir = Math.floor(rand(0, 4));
    const segs = 2 + Math.floor(rand(0, 4));
    for (let s = 0; s < segs; s++) {
      const len = Math.floor(rand(2, 7)) * grid;
      const d = [[1, 0], [0, 1], [-1, 0], [0, -1]][dir];
      const diag = Math.random() < 0.35;
      if (diag) { x += (d[0] || (Math.random() < .5 ? 1 : -1)) * len * 0.7; y += (d[1] || (Math.random() < .5 ? 1 : -1)) * len * 0.7; }
      else { x += d[0] * len; y += d[1] * len; }
      pts.push([x, y]);
      dir = (dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
    }
    shapes.push({ t: 'trace', pts, w: rand(0.12, 0.22) * grid, dots: Math.random() < 0.3 });
  }
  const kinds = ['heart', 'star', 'dpad', 'bolt', 'buttons', 'plus'];
  for (let i = 0; i < (o.icons ?? 9); i++) shapes.push({ t: 'icon', k: kinds[i % kinds.length], x: rand(0, size), y: rand(0, size), s: grid * rand(2.2, 3.6) });
  for (let i = 0; i < 40; i++) shapes.push({ t: 'via', x: Math.floor(rand(0, 32)) * grid, y: Math.floor(rand(0, 32)) * grid, r: grid * rand(0.15, 0.3) });

  for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
    g.save(); g.translate(ox, oy);
    for (const s of shapes) {
      if (s.t === 'trace') {
        g.strokeStyle = trace; g.lineWidth = s.w; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); s.pts.forEach(([x, y], j) => j ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
        const [ex, ey] = s.pts[s.pts.length - 1], [sx, sy] = s.pts[0];
        g.fillStyle = icon; g.strokeStyle = icon; g.lineWidth = s.w * 0.8;
        g.beginPath(); g.arc(ex, ey, grid * 0.38, 0, 7); g.stroke();
        g.beginPath(); g.arc(sx, sy, grid * 0.22, 0, 7); g.fill();
        if (s.dots) for (let d = 1; d < 4; d++) { g.beginPath(); g.arc(ex + d * grid * 0.6, ey, grid * 0.1, 0, 7); g.fill(); }
      } else if (s.t === 'icon') {
        g.strokeStyle = icon; g.fillStyle = icon; drawIcon(g, s.k, s.x, s.y, s.s);
      } else {
        g.fillStyle = icon; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 7); g.fill();
      }
    }
    g.restore();
  }
  return c;
}

// Pretty colored circuit art for walls (emissive map).
export function circuitWall(size = 1024, traceColor = HEX.magenta, iconColor = HEX.pink) {
  return circuitCanvas(size, { trace: traceColor, icon: iconColor, bg: '#000' });
}

// ---- Code atlas: real source code drawn as lines for the code-stream shader ----
export function codeAtlas(text, w = 1024, h = 2048, fontPx = 22) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.font = `500 ${fontPx}px "JetBrains Mono", monospace`;
  g.textBaseline = 'top';
  const lineH = fontPx * 1.25;
  const lines = text.split('\n').filter(l => l.trim());
  const rows = Math.floor(h / lineH);
  const cols = Math.floor(w / (fontPx * 0.6));
  for (let r = 0, i = 0; r < rows; r++, i++) {
    const l = (lines[i % Math.max(1, lines.length)] || '').replace(/\t/g, '  ');
    const indent = l.length - l.trimStart().length;
    const isComment = /^\s*(\/\/|#)/.test(l);
    g.fillStyle = isComment ? '#ff0000' : '#ffffff'; // red channel marks comments: file names show as bright headers
    g.fillText(l.slice(0, cols), 6 + Math.min(indent, 12) * 2, r * lineH + 2);
  }
  const t = tex(c, { srgb: false });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function loadImage(url) {
  return new Promise(res => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = url;
  });
}

// Stripes (awnings, hazard tape)
export function stripes(a, b, n = 8, size = 256, angle = 0) {
  const c = canvas(size, size), g = c.getContext('2d');
  g.fillStyle = a; g.fillRect(0, 0, size, size);
  g.fillStyle = b;
  g.save(); g.translate(size / 2, size / 2); g.rotate(angle); g.translate(-size, -size);
  const sw = size / n;
  for (let i = 0; i < n * 4; i += 2) g.fillRect(i * sw, 0, sw, size * 2);
  g.restore();
  return tex(c, { repeat: [1, 1] });
}

export function brickTexture(base = '#3a1530', mortar = '#1a0a18') {
  const c = canvas(512, 512), g = c.getContext('2d');
  g.fillStyle = mortar; g.fillRect(0, 0, 512, 512);
  const bh = 32, bw = 96;
  for (let r = 0; r < 512 / bh; r++) for (let x = -bw; x < 512 + bw; x += bw) {
    const off = r % 2 ? bw / 2 : 0;
    const l = 0.75 + Math.random() * 0.35;
    const cc = new THREE.Color(base).multiplyScalar(l);
    g.fillStyle = '#' + cc.getHexString();
    g.fillRect(x + off + 3, r * bh + 3, bw - 6, bh - 6);
  }
  return tex(c, { repeat: [4, 2] });
}

export function noiseTexture(size = 256) {
  const c = canvas(size, size), g = c.getContext('2d'), d = g.createImageData(size, size);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
  const t = tex(c, { srgb: false }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
