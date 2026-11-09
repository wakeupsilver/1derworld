// Custom materials. All of them take a shared `uTime` and an audio-driven `uBeat` so the whole world pulses together.
import * as THREE from 'three';
import { C } from './palette.js';

export const shared = {
  uTime: { value: 0 },
  uBeat: { value: 0 },      // spikes on kick, decays
  uBass: { value: 0 },      // analyser levels
  uHigh: { value: 0 },
  uPlayer: { value: new THREE.Vector3() },
};

const HASH = /* glsl */`
float hash(float n){ return fract(sin(n)*43758.5453123); }
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x), mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
`;

// ---------- CODE STREAM ----------
// Real source code scrolls upward as lines; "rain heads" sweep down each column and set the glyphs on fire.
// Plum -> magenta -> pink trail, amber/cream heads, occasional GameBender-style glitch bands.
export function codeStreamMaterial(atlas, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      map: { value: atlas },
      cBase: { value: (o.base || C.violet).clone() },
      cTrail: { value: (o.trail || C.magenta).clone() },
      cHot: { value: (o.hot || C.pink).clone() },
      cHead: { value: (o.head || C.amber).clone() },
      uSpeed: { value: o.speed ?? 1 },
      uCols: { value: o.cols ?? 48 },
      uOpacity: { value: o.opacity ?? 1 },
      uRepeat: { value: new THREE.Vector2(o.repeatX ?? 1, o.repeatY ?? 0.5) },
      uBoost: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: HASH + /* glsl */`
      uniform sampler2D map; uniform vec3 cBase,cTrail,cHot,cHead; uniform float uTime,uSpeed,uCols,uOpacity,uBeat,uBoost,uHigh; uniform vec2 uRepeat;
      varying vec2 vUv;
      void main(){
        vec2 uv = vUv;
        float band = floor(uv.y*40.0 + floor(uTime*6.0)*3.0);
        float g = step(0.985 - uBoost*0.05, hash(band + floor(uTime*10.0)));
        uv.x += g * (hash(band)-0.5) * 0.08;
        vec2 tuv = vec2(uv.x*uRepeat.x, uv.y*uRepeat.y - uTime*0.018*uSpeed);
        vec4 tx = texture2D(map, tuv);
        float glyph = max(tx.r, tx.g);
        float isComment = clamp(tx.r - tx.g, 0.0, 1.0);
        float col = floor(vUv.x*uCols);
        float r = hash(col*1.37);
        float head = fract(uTime*(0.08+r*0.16)*uSpeed + r*11.0);
        float y = 1.0 - vUv.y;
        float d = fract(head - y);
        float trail = exp(-d*7.0);
        float spark = smoothstep(0.03, 0.0, d);
        vec3 c = mix(cBase, cTrail, smoothstep(0.0,0.4,trail));
        c = mix(c, cHot, smoothstep(0.35,0.9,trail));
        c = mix(c, cHead*1.6, spark);
        c = mix(c, cHead, isComment*0.6);
        float a = glyph * (0.16 + trail*0.95 + uBeat*0.15 + isComment*0.3 + uBoost*0.4);
        float edge = smoothstep(0.0,0.08,vUv.y)*smoothstep(1.0,0.86,vUv.y)*smoothstep(0.0,0.04,vUv.x)*smoothstep(1.0,0.96,vUv.x);
        a *= edge * uOpacity;
        c *= 1.0 + g*1.5 + uHigh*0.6;
        gl_FragColor = vec4(c*a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  });
}

// ---------- PORTAL VORTEX ----------
export function vortexMaterial(color, thumb) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uColor: { value: new THREE.Color(color) },
      uColor2: { value: C.amber.clone() },
      uThumb: { value: thumb || null },
      uHasThumb: { value: thumb ? 1 : 0 },
      uHover: { value: 0 },
      uSeed: { value: Math.random() * 100 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: HASH + /* glsl */`
      uniform vec3 uColor,uColor2; uniform sampler2D uThumb; uniform float uHasThumb,uHover,uTime,uSeed,uBeat,uBass;
      varying vec2 vUv;
      void main(){
        vec2 p = vUv*2.0-1.0;
        float r = length(p);
        if (r>1.0) discard;
        float a = atan(p.y,p.x);
        float t = uTime*(0.6+uHover*1.2);
        float swirl = a + 3.0/(r+0.25) - t*2.0;
        float n = fbm(vec2(swirl*1.3, r*4.0 - t*1.5) + uSeed);
        float arms = 0.5+0.5*sin(swirl*5.0 + n*6.0);
        vec3 c = mix(vec3(0.05,0.0,0.12), uColor, smoothstep(0.2,0.9,arms*n*1.6));
        c = mix(c, uColor2, pow(n,3.0)*1.4);
        c += uColor * pow(1.0-r, 3.0) * (1.2 + uBass*1.5);
        if (uHasThumb>0.5) {
          vec2 tuv = vUv + vec2(sin(swirl)*0.02, cos(swirl)*0.02)*(1.0-uHover);
          tuv = (tuv-0.5)*vec2(1.0,0.625)/(0.78+uHover*0.12)+0.5;
          vec3 th = texture2D(uThumb, tuv).rgb;
          float m = smoothstep(0.82,0.35,r) * (0.35 + uHover*0.6);
          c = mix(c, th*1.15, m);
        }
        float rim = smoothstep(0.8,1.0,r);
        c += uColor*rim*(1.5+uBeat);
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.DoubleSide, toneMapped: false,
  });
}

// ---------- FLOOR: glossy dark with circuit traces that ripple out from the player and pulse with the beat ----------
export function floorMaterial(circuit, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uMap: { value: circuit },
      uScale: { value: o.scale || 1 / 12 },
      cA: { value: (o.a || C.magenta).clone() },
      cB: { value: (o.b || C.pink).clone() },
      cBase: { value: (o.base || new THREE.Color('#14062e')).clone() },
      uCenter: { value: o.center || new THREE.Vector2(0, 0) },
      uLens: { value: 0 },
    },
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: HASH + /* glsl */`
      uniform sampler2D uMap; uniform float uScale,uTime,uBeat,uBass; uniform vec3 cA,cB,cBase,uPlayer; uniform vec2 uCenter;
      varying vec3 vW;
      void main(){
        vec2 p = vW.xz;
        vec4 t = texture2D(uMap, p*uScale);
        float dPlayer = length(p - uPlayer.xz);
        float ripple = 0.5+0.5*sin(dPlayer*1.4 - uTime*5.0);
        ripple *= exp(-dPlayer*0.07);
        float dC = length(p-uCenter);
        float ring = smoothstep(0.25,0.0,abs(fract(dC*0.12 - uTime*0.25)-0.5)) * exp(-dC*0.03);
        float flow = 0.5+0.5*sin((p.x+p.y)*0.6 - uTime*2.2 + noise(p*0.2)*6.0);
        vec3 c = cBase;
        // tiles
        vec2 g = abs(fract(p/3.0)-0.5);
        float grid = smoothstep(0.485,0.5,max(g.x,g.y));
        c += cA*grid*0.12;
        c += cA * t.r * (0.1 + flow*0.22 + ripple*0.9 + uBeat*0.4 + uBass*0.3);
        c += cB * t.g * (0.16 + ripple*1.2 + ring*1.5 + uBeat*0.5);
        // fake reflection sheen
        c += vec3(0.08,0.02,0.12) * fbm(p*0.08 + uTime*0.02);
        gl_FragColor = vec4(c,1.0);
      }`,
    toneMapped: false,
  });
}

// ---------- UNDERWATER sphere (seen through the portholes) ----------
export function underwaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: `varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: HASH + /* glsl */`
      uniform float uTime,uBass; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 deep = vec3(0.012,0.02,0.09);
        vec3 mid  = vec3(0.04,0.13,0.36);
        vec3 surf = vec3(0.12,0.62,0.66);
        vec3 c = mix(deep, mid, smoothstep(-0.6,0.15,h));
        c = mix(c, surf, smoothstep(0.15,0.95,h));
        // caustic shimmer near the surface
        vec2 q = d.xz/(abs(d.y)+0.35)*3.0;
        float caus = pow(abs(sin(fbm(q + uTime*0.15)*9.0)), 6.0);
        c += vec3(0.5,0.9,0.9)*caus*smoothstep(0.1,0.8,h)*0.6;
        // god rays
        float ang = atan(d.x,d.z);
        float rays = pow(max(0.0, sin(ang*14.0 + fbm(vec2(ang*3.0, uTime*0.1))*5.0)), 8.0);
        c += vec3(0.4,0.75,0.9)*rays*smoothstep(-0.2,0.7,h)*0.18;
        // bioluminescent motes in brand colors
        vec2 cell = floor(vec2(ang*60.0, h*50.0));
        float m = step(0.992, hash2(cell));
        float tw = 0.5+0.5*sin(uTime*2.0 + hash2(cell)*30.0);
        vec3 mc = mix(vec3(1.0,0.42,0.69), vec3(0.65,0.93,0.44), hash2(cell+3.1));
        c += mc*m*tw*(1.0+uBass)*smoothstep(0.6,-0.5,h);
        gl_FragColor = vec4(c,1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
  });
}

// ---------- SKY inside the prairie dome: permanent EXTREME sunset ----------
export function skyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: `varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: HASH + /* glsl */`
      uniform float uTime; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = clamp(d.y,0.0,1.0);
        vec3 sunDir = normalize(vec3(0.0,0.1,-1.0));
        float s = max(0.0, dot(d, sunDir));
        float facing = 0.5+0.5*dot(normalize(d.xz+1e-4), normalize(sunDir.xz)); // 1 toward the sun, 0 away
        // horizon to zenith: molten red -> blazing orange -> amber -> hot pink -> magenta -> violet -> night
        vec3 c = vec3(1.0,0.16,0.05);
        c = mix(c, vec3(1.0,0.42,0.02), smoothstep(0.0,0.05,h));
        c = mix(c, vec3(1.0,0.72,0.12), smoothstep(0.04,0.11,h)*facing);
        c = mix(c, vec3(1.0,0.32,0.55), smoothstep(0.1,0.24,h));
        c = mix(c, vec3(0.77,0.18,0.82), smoothstep(0.22,0.42,h));
        c = mix(c, vec3(0.30,0.06,0.62), smoothstep(0.4,0.7,h));
        c = mix(c, vec3(0.07,0.02,0.22), smoothstep(0.68,1.0,h));
        // the away-from-sun side goes dusky purple sooner
        c = mix(c*vec3(0.55,0.4,0.85), c, 0.35+0.65*facing);
        // enormous sun with retro scan bands, sitting on the horizon
        float disc = smoothstep(0.9935,0.9945,s);
        float bands = step(0.45, fract((d.y)*90.0 - uTime*0.15)) + smoothstep(0.125,0.16,d.y);
        vec3 sunCol = mix(vec3(1.0,0.25,0.05), vec3(1.0,0.92,0.4), smoothstep(0.03,0.17,d.y));
        c = mix(c, sunCol*1.25, disc*clamp(bands,0.0,1.0));
        c += (vec3(1.0,0.45,0.1)*pow(s,60.0)*0.55 + vec3(1.0,0.3,0.2)*pow(s,8.0)*0.45 + vec3(1.0,0.5,0.2)*pow(s,2.0)*0.12)*(1.0-disc);
        // god rays fanning up from the sun
        vec2 rel = vec2(atan(d.x, -d.z), d.y - sunDir.y);
        float ang = atan(rel.y, rel.x);
        float rays = pow(max(0.0, sin(ang*22.0 + fbm(vec2(ang*4.0, uTime*0.05))*4.0)), 6.0);
        c += vec3(1.0,0.55,0.25)*rays*pow(s,3.0)*0.55*smoothstep(-0.02,0.05,d.y);
        // clouds: underlit orange/pink, dark purple tops
        vec2 q = d.xz/(d.y+0.12);
        float n = fbm(q*0.45 + vec2(uTime*0.006,0.0));
        float cl = smoothstep(0.5,0.78,n)*smoothstep(0.03,0.2,h)*(1.0-smoothstep(0.6,0.9,h));
        float under = fbm(q*0.45 + vec2(uTime*0.006,0.0) + vec2(0.0,-0.08));
        vec3 cloudLit = mix(vec3(1.0,0.35,0.3), vec3(1.0,0.7,0.25), facing) * (1.2 + pow(s,4.0)*1.5);
        vec3 cloudCol = mix(cloudLit, vec3(0.35,0.1,0.45), smoothstep(0.45,0.75,under));
        c = mix(c, cloudCol, cl*0.85);
        // first stars on the night side
        vec2 st = floor(d.xz/(d.y+0.01)*90.0);
        c += vec3(1.0)*step(0.996,hash2(st))*smoothstep(0.45,0.9,h)*(1.0-facing*0.7)*(0.5+0.5*sin(uTime*3.0+hash2(st)*20.0));
        gl_FragColor = vec4(c,1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
  });
}

// ---------- the bubble skin of the field dome, seen from underwater ----------
export function bubbleMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0-abs(dot(vN,vV)), 3.0);
        vec3 c = mix(vec3(1.0,0.42,0.69), vec3(0.65,0.93,0.44), 0.5+0.5*sin(uTime*0.5+vN.y*6.0));
        gl_FragColor = vec4(c*f*1.4, f*0.8 + 0.06); }`,
    transparent: true, depthWrite: false, side: THREE.FrontSide, toneMapped: false,
  });
}

// ---------- washer door suds ----------
export function sudsMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared, uSpin: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: HASH + /* glsl */`
      uniform float uTime,uSpin; varying vec2 vUv;
      void main(){
        vec2 p = vUv*2.0-1.0; float r=length(p); if(r>1.0) discard;
        float a = atan(p.y,p.x) + uTime*uSpin*3.0;
        vec2 q = vec2(cos(a),sin(a))*r;
        float n = fbm(q*3.0 + uTime*0.3);
        vec3 c = mix(vec3(0.15,0.05,0.4), vec3(0.3,0.75,0.9), n);
        float foam = smoothstep(0.55,0.75, fbm(q*6.0 - uTime*0.5)) * smoothstep(0.2,1.0,r);
        c = mix(c, vec3(1.0), foam);
        // a sock and a taco tumbling
        vec2 s1 = vec2(cos(-uTime*uSpin*3.0), sin(-uTime*uSpin*3.0))*0.45 - p;
        c = mix(c, vec3(1.0,0.42,0.69), smoothstep(0.17,0.14,length(s1*vec2(1.0,2.0))));
        vec2 s2 = vec2(cos(-uTime*uSpin*3.0+3.0), sin(-uTime*uSpin*3.0+3.0))*0.5 - p;
        c = mix(c, vec3(1.0,0.75,0.0), smoothstep(0.16,0.13,length(s2*vec2(2.0,1.0))));
        c += pow(1.0-r,2.0)*0.6*vec3(1.0,0.9,1.0);
        gl_FragColor = vec4(c*1.3, 1.0);
      }`,
    toneMapped: false,
  });
}

// ---------- final screen pass: chromatic aberration, vignette, grain, flash ----------
export const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: shared.uTime,
    uCA: { value: 0.0015 },
    uVignette: { value: 0.35 },
    uFlash: { value: 0 },
    uFlashColor: { value: new THREE.Color(1, 1, 1) },
    uWarp: { value: 0 },
    uGrain: { value: 0.04 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime,uCA,uVignette,uFlash,uWarp,uGrain; uniform vec3 uFlashColor;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 uv = vUv; vec2 c = uv-0.5; float r = length(c);
      // warp: swirl toward center when diving into portals / slides
      float ang = uWarp*3.0*(1.0-smoothstep(0.0,0.7,r));
      uv = 0.5 + mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*c*(1.0-uWarp*0.3*(1.0-r));
      vec2 off = c*(uCA + uWarp*0.02)*(0.5+r*2.0);
      vec3 col = vec3(texture2D(tDiffuse, uv+off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv-off).b);
      col *= 1.0 - uVignette*smoothstep(0.35,0.85,r);
      col += (h(uv*vec2(1920.,1080.)+uTime)-0.5)*uGrain;
      col = mix(col, uFlashColor, uFlash);
      gl_FragColor = vec4(col,1.0);
    }`,
};
