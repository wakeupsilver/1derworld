// 1derworld sound engine. Plain Web Audio API, nothing sampled: everything is synthesized live.
//  - Lookahead scheduler (setInterval + AudioContext clock) drives a generative future-funk score.
//  - Zone mixes: street hears the music muffled through the cart; the hub gets everything;
//    the field gets airy; demos duck it all.
//  - HRTF PannerNodes place sizzling air fryers, humming portals, whales, welders, birds in 3D.
//  - Sidechain-style pumping on the kick, convolution reverb, ping-pong delay, glue compressor + limiter.
//  - An AnalyserNode feeds the visuals (synesthetic lens: sound becomes light).
//  - Web MIDI: plug in a keyboard and play the world.

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const PENTA = [65, 68, 70, 72, 75, 77, 80, 82, 84, 87, 89, 92]; // F minor pentatonic

// Dbmaj9 -> Cm7 -> Fm9 -> Ebadd9 : dreamy, a little bittersweet, very loopable
const CHORDS = [
  { root: 37, pad: [56, 60, 63, 65], arp: [61, 65, 68, 72, 75] },
  { root: 36, pad: [55, 58, 62, 63], arp: [60, 63, 67, 70, 74] },
  { root: 41, pad: [56, 60, 63, 67], arp: [65, 68, 72, 75, 79] },
  { root: 39, pad: [55, 58, 63, 65], arp: [63, 67, 70, 74, 77] },
];

const MIXES = {
  title:   { drums: 0.0, bass: 0.5, pad: 0.9, arp: 0.5, bells: 0.5, music: 0.75, cutoff: 2400 },
  street:  { drums: 0.7, bass: 0.9, pad: 0.6, arp: 0.3, bells: 0.0, music: 0.8, cutoff: 650 },
  ride:    { drums: 1.0, bass: 1.0, pad: 1.0, arp: 1.0, bells: 1.0, music: 1.0, cutoff: 20000 },
  hub:     { drums: 0.9, bass: 1.0, pad: 0.9, arp: 0.8, bells: 0.7, music: 0.85, cutoff: 20000 },
  field:   { drums: 0.25, bass: 0.6, pad: 1.0, arp: 0.9, bells: 1.0, music: 0.75, cutoff: 9000 },
  lens:    { drums: 0.5, bass: 0.8, pad: 1.0, arp: 1.0, bells: 1.0, music: 0.9, cutoff: 3200 },
  demo:    { drums: 0.2, bass: 0.4, pad: 0.6, arp: 0, bells: 0, music: 0.18, cutoff: 700 },
};

export class AudioEngine {
  constructor() {
    this.ready = false;
    this.muted = false;
    this.volume = 0.85;
    this.bpm = 100;
    this.seqStep = 0;
    this.bar = 0;
    this.listeners = { beat: [], midi: [] };
    this.events = [];
    this.loops = [];
    this.levels = { bass: 0, mid: 0, high: 0, all: 0 };
    this.mixName = 'title';
  }

  on(ev, fn) { this.listeners[ev].push(fn); }

  async init() {
    if (this.ready) { if (this.ctx.state !== 'running') await this.ctx.resume(); return; }
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' }); // bigger buffer = no dropouts
    // if the OS or browser suspends audio (headphones switch, etc.), bring it back
    ctx.onstatechange = () => { if (ctx.state !== 'running' && !this.wantSuspended) ctx.resume().catch(() => {}); };
    const g = v => { const n = ctx.createGain(); n.gain.value = v; return n; };

    // master chain: buses -> glue comp -> limiter -> analyser -> out
    this.out = g(this.volume * 0.8);
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -16; glue.ratio.value = 3.5; glue.knee.value = 8; glue.attack.value = 0.004; glue.release.value = 0.22;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -2.5; lim.ratio.value = 20; lim.knee.value = 0; lim.attack.value = 0.001; lim.release.value = 0.08;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 1024; this.analyser.smoothingTimeConstant = 0.7;
    this.fft = new Uint8Array(this.analyser.frequencyBinCount);
    // final safety: a soft clipper (tanh) so a big moment can never hard-clip and crackle
    const soft = ctx.createWaveShaper(), curve = new Float32Array(2048);
    for (let i = 0; i < curve.length; i++) { const v = i / (curve.length - 1) * 2 - 1; curve[i] = Math.tanh(v * 1.2) / Math.tanh(1.2); }
    soft.curve = curve; soft.oversample = '2x';
    this.out.connect(glue); glue.connect(lim); lim.connect(soft); soft.connect(this.analyser); this.analyser.connect(ctx.destination);

    // reverb (generated stereo impulse) and ping-pong delay sends
    this.reverb = ctx.createConvolver(); this.reverb.buffer = this.impulse(2.0, 2.4); // shorter impulse = lighter on the audio thread
    this.reverbRet = g(0.55); this.reverb.connect(this.reverbRet); this.reverbRet.connect(this.out);
    this.verbSend = g(1); this.verbSend.connect(this.reverb);
    const dl = ctx.createDelay(2), dr = ctx.createDelay(2), fb = g(0.42), dlp = ctx.createBiquadFilter();
    dlp.type = 'lowpass'; dlp.frequency.value = 3800;
    const t16 = 60 / this.bpm / 4;
    dl.delayTime.value = t16 * 3; dr.delayTime.value = t16 * 3;
    const merger = ctx.createChannelMerger(2);
    this.delaySend = g(1);
    this.delaySend.connect(dl); dl.connect(dlp); dlp.connect(dr); dr.connect(fb); fb.connect(dl);
    dl.connect(merger, 0, 0); dr.connect(merger, 0, 1);
    const dret = g(0.38); merger.connect(dret); dret.connect(this.out); dret.connect(this.verbSend);

    // music bus with zone filter
    this.music = g(0); this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass'; this.musicFilter.frequency.value = 2400; this.musicFilter.Q.value = 0.8;
    this.music.connect(this.musicFilter); this.musicFilter.connect(this.out);
    this.layers = {};
    for (const k of ['drums', 'bass', 'pad', 'arp', 'bells']) { this.layers[k] = g(0); this.layers[k].connect(this.music); }
    this.pump = g(1); this.pump.connect(this.layers.pad); // sidechain duck target for pads
    this.arpPump = g(1); this.arpPump.connect(this.layers.arp);
    // (reverb/delay for the music are baked into the pre-rendered stems)

    this.sfx = g(0.9); this.sfx.connect(this.out); this.sfxVerb = g(0.25); this.sfx.connect(this.sfxVerb); this.sfxVerb.connect(this.verbSend);
    this.amb = g(0.9); this.amb.connect(this.out);

    this.noise = this.noiseBuffer(2, 'white');
    this.brown = this.noiseBuffer(4, 'brown');
    this.pink = this.noiseBuffer(3, 'pink');

    this.ready = true;
    // The score is pre-rendered once into looping stems: playing 5 buffers costs almost nothing,
    // where live synthesis (~40 oscillators per bar) made the audio thread fall behind ("slow and glitchy").
    this.renderStems().then(() => this.startStems());
    this.setMix(this.mixName, 0.01);
    this.initMIDI();
  }

  impulse(sec, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < 80 ? i / 80 : 1);
    }
    return b;
  }

  noiseBuffer(sec, type) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (type === 'pink') { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; d[i] = (b0 + b1 + b2 + w * 0.04) * 2.2; }
      else d[i] = w;
    }
    return b;
  }

  // ---------- mixing ----------
  setMix(name, fade = 0.8) {
    if (this.ready && name === this.mixName && this._mixApplied === name && !this._mixDirty) return;
    this.mixName = name;
    if (!this.ready) return;
    this._mixApplied = name; this._mixDirty = false;
    const m = MIXES[name] || MIXES.hub, t = this.ctx.currentTime;
    for (const k of Object.keys(this.layers)) this.layers[k].gain.setTargetAtTime(m[k], t, fade / 3);
    this.music.gain.setTargetAtTime(this.muted ? 0 : m.music, t, fade / 3);
    this.musicFilter.frequency.setTargetAtTime(m.cutoff, t, fade / 3);
  }

  setVolume(v) { this.volume = v; if (this.ready) this.out.gain.setTargetAtTime(this.muted ? 0 : v * 0.8, this.ctx.currentTime, 0.05); }
  toggleMute() { this.muted = !this.muted; this.setVolume(this.volume); this._mixDirty = true; this.setMix(this.mixName, 0.1); return this.muted; }
  suspend() { if (this.ready) { this.wantSuspended = true; this.ctx.suspend(); } }
  resume() { if (this.ready) { this.wantSuspended = false; this.ctx.resume(); } }

  // ---------- listener ----------
  setListener(pos, fwd, up) {
    if (!this.ready) return;
    // set values directly (no automation events): queuing 6 setTargetAtTime calls per frame piled up
    // events on the audio thread and caused crackles over time
    const L = this.ctx.listener, k = pos.x + pos.y * 7 + pos.z * 13 + fwd.x * 3 + fwd.y * 5 + fwd.z * 11;
    if (Math.abs(k - (this._lk || 0)) < 1e-3) return;
    this._lk = k;
    if (L.positionX) {
      L.positionX.value = pos.x; L.positionY.value = pos.y; L.positionZ.value = pos.z;
      L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z;
      L.upX.value = up.x; L.upY.value = up.y; L.upZ.value = up.z;
    } else { L.setPosition(pos.x, pos.y, pos.z); L.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z); }
  }

  panner(pos, ref = 2, rolloff = 1.3, max = 90, model = 'equalpower') { // HRTF is costly; equal-power keeps the audio thread light
    const p = this.ctx.createPanner();
    p.panningModel = model; p.distanceModel = 'inverse';
    p.refDistance = ref; p.rolloffFactor = rolloff; p.maxDistance = max;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
    return p;
  }

  // ---------- analysis for visuals ----------
  analyse() {
    if (!this.ready) return this.levels;
    this.analyser.getByteFrequencyData(this.fft);
    const f = this.fft, n = f.length, avg = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += f[i]; return s / (b - a) / 255; };
    const L = this.levels;
    L.bass += (avg(1, 8) - L.bass) * 0.5; L.mid += (avg(8, 80) - L.mid) * 0.4; L.high += (avg(80, n / 2) - L.high) * 0.4;
    L.all = (L.bass + L.mid + L.high) / 3;
    return L;
  }

  // drain scheduled beat events whose time has come (called every frame)
  pollEvents() {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    while (this.events.length && this.events[0].t <= now) {
      const e = this.events.shift();
      for (const fn of this.listeners.beat) fn(e);
    }
  }

  // ---------- the score ----------
  playStep(s, t, spb) {
    const chord = CHORDS[this.bar % 4];
    const fill = this.bar % 8 === 7;
    const on = k => !this.only || this.only === k;
    // drums
    if (s % 4 === 0 || (fill && s === 14)) { if (on('drums')) this.kick(t); this.duck(t); }
    if ((s === 4 || s === 12) && on('drums')) this.snare(t);
    if (fill && (s === 13 || s === 15) && on('drums')) this.snare(t, 0.5);
    if (on('drums')) this.hat(t, s % 4 === 2 ? 0.55 : (s % 2 ? 0.2 : 0.3), s === 14 && this.bar % 2 ? 0.25 : 0.04);
    // bass: syncopated root / octave / fifth
    const bassPat = { 0: 0, 3: 12, 6: 0, 8: 7, 10: 12, 11: 0, 14: 10 };
    if (s in bassPat && on('bass')) this.bass(t, chord.root + bassPat[s], s === 0 ? 0.36 : 0.22);
    // pad once per bar
    if (s === 0 && on('pad')) chord.pad.forEach((n, i) => this.pad(t + i * 0.012, n, spb * 16 * 1.02));
    // arp sixteenths with a shifting pattern
    const pat = [0, 2, 1, 3, 2, 4, 3, 1];
    if ((s % 2 === 0 || this.bar % 2) && on('arp')) this.arp(t, chord.arp[pat[(s + this.bar) % pat.length] % chord.arp.length] + (s >= 8 && this.bar % 4 === 3 ? 12 : 0), s % 4 === 0 ? 0.13 : 0.08);
    // sparkle bells
    if (on('bells') && Math.random() < 0.09) this.bell(t, PENTA[4 + Math.floor(Math.random() * 7)] + 12, 0.07, this.layers.bells);
  }

  // ---------- pre-rendered stems ----------
  async renderStems() {
    const real = { ctx: this.ctx, layers: this.layers, pump: this.pump, arpPump: this.arpPump, verbSend: this.verbSend, delaySend: this.delaySend };
    const sr = this.ctx.sampleRate, spb = 60 / this.bpm / 4, BARS = 8;
    const len = Math.round(BARS * 16 * spb * sr), tail = Math.round(2.5 * sr);
    this.loopLen = len / sr;
    this.stems = {};
    for (const name of ['drums', 'bass', 'pad', 'arp', 'bells']) {
      const off = new OfflineAudioContext(2, len + tail, sr);
      const out = off.createGain(); out.connect(off.destination);
      const L = {}; for (const k of ['drums', 'bass', 'pad', 'arp', 'bells']) { L[k] = off.createGain(); L[k].connect(out); }
      const pump = off.createGain(); pump.connect(L.pad);
      const arpPump = off.createGain(); arpPump.connect(L.arp);
      // reverb + ping-pong delay inside the offline graph
      const verb = off.createConvolver(); verb.buffer = this.reverb.buffer;
      const verbSend = off.createGain(), verbRet = off.createGain(); verbRet.gain.value = 0.55;
      verbSend.connect(verb); verb.connect(verbRet); verbRet.connect(out);
      const dl = off.createDelay(2), dr = off.createDelay(2), fb = off.createGain(), dlp = off.createBiquadFilter(), merger = off.createChannelMerger(2), dret = off.createGain(), delaySend = off.createGain();
      dl.delayTime.value = dr.delayTime.value = spb * 3; fb.gain.value = 0.42; dlp.type = 'lowpass'; dlp.frequency.value = 3800; dret.gain.value = 0.38;
      delaySend.connect(dl); dl.connect(dlp); dlp.connect(dr); dr.connect(fb); fb.connect(dl);
      dl.connect(merger, 0, 0); dr.connect(merger, 0, 1); merger.connect(dret); dret.connect(out); dret.connect(verbSend);
      L.pad.connect(verbSend); L.arp.connect(delaySend); L.bells.connect(delaySend); L.bells.connect(verbSend);
      Object.assign(this, { ctx: off, layers: L, pump, arpPump, verbSend, delaySend, only: name, bar: 0 });
      let t = 0, step = 0;
      for (let i = 0; i < BARS * 16; i++) {
        this.playStep(step, t, spb);
        t += spb * (step % 2 ? 0.92 : 1.08);
        step = (step + 1) % 16; if (step === 0) this.bar++;
      }
      Object.assign(this, real, { only: null, bar: 0 });
      const buf = await off.startRendering();
      // fold the ringing tail back onto the start so the loop is seamless
      const loop = this.ctx.createBuffer(2, len, sr);
      for (let c = 0; c < 2; c++) {
        const src = buf.getChannelData(c), dst = loop.getChannelData(c);
        dst.set(src.subarray(0, len));
        for (let i = 0; i < tail && i < len; i++) dst[i] += src[len + i];
      }
      let peak = 0; for (let c = 0; c < 2; c++) { const d = loop.getChannelData(c); for (let i = 0; i < d.length; i += 3) { const v = Math.abs(d[i]); if (v > peak) peak = v; } }
      const k = peak > 0.32 ? 0.32 / peak : 1;
      if (k < 1) for (let c = 0; c < 2; c++) { const d = loop.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; }
      this.stemPeaks = { ...(this.stemPeaks || {}), [name]: +(peak.toFixed(3)) };
      this.stems[name] = loop;
    }
  }

  startStems() {
    const T0 = this.ctx.currentTime + 0.1;
    for (const [name, buf] of Object.entries(this.stems)) {
      const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(this.layers[name]); s.start(T0);
    }
    // beat events for the visuals follow the same timeline
    this.evTime = T0; this.evStep = 0; this.evBar = 0;
    this.timer = setInterval(() => this.scheduleEvents(), 50);
  }

  scheduleEvents() {
    const spb = 60 / this.bpm / 4, now = this.ctx.currentTime;
    if (this.evTime < now - 0.5) { // fell far behind (tab was asleep): jump to the right spot in the loop
      const loops = Math.floor((now - this.evTime) / this.loopLen); this.evTime += loops * this.loopLen;
    }
    while (this.evTime < now + 0.2) {
      const s = this.evStep, fill = this.evBar % 8 === 7, t = this.evTime;
      if (s % 4 === 0 || (fill && s === 14)) this.events.push({ t, type: 'kick', step: s });
      if (s === 4 || s === 12) this.events.push({ t, type: 'snare' });
      if (s === 0) this.events.push({ t, type: 'bar', bar: this.evBar, chord: this.evBar % 4 });
      this.evTime += spb * (s % 2 ? 0.92 : 1.08);
      this.evStep = (s + 1) % 16; if (this.evStep === 0) this.evBar = (this.evBar + 1) % 8;
    }
  }

  env(param, t, a, peak, d, sustain = 0) {
    param.cancelScheduledValues(t);
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(peak, t + a);
    param.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t + a + d);
  }

  duck(t) {
    for (const p of [this.pump.gain, this.arpPump.gain]) {
      p.cancelScheduledValues(t); p.setValueAtTime(0.35, t); p.setTargetAtTime(1, t + 0.02, 0.09);
    }
  }

  kick(t) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(g.gain, t, 0.002, 0.95, 0.42);
    o.connect(g); g.connect(this.layers.drums); o.start(t); o.stop(t + 0.5);
    const c = ctx.createBufferSource(), cg = ctx.createGain(), hp = ctx.createBiquadFilter();
    c.buffer = this.noise; hp.type = 'highpass'; hp.frequency.value = 2000;
    this.env(cg.gain, t, 0.001, 0.25, 0.02); c.connect(hp); hp.connect(cg); cg.connect(this.layers.drums); c.start(t); c.stop(t + 0.05);
  }

  snare(t, v = 1) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = this.noise; bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.7;
    this.env(g.gain, t, 0.001, 0.5 * v, 0.2);
    n.connect(bp); bp.connect(g); g.connect(this.layers.drums); g.connect(this.verbSend);
    n.start(t, Math.random()); n.stop(t + 0.3);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
    this.env(og.gain, t, 0.001, 0.32 * v, 0.1); o.connect(og); og.connect(this.layers.drums); o.start(t); o.stop(t + 0.2);
    // clap: three quick bursts
    for (let i = 0; i < 3; i++) {
      const c = ctx.createBufferSource(), cg = ctx.createGain(), cf = ctx.createBiquadFilter();
      c.buffer = this.noise; cf.type = 'bandpass'; cf.frequency.value = 1200; cf.Q.value = 2;
      const tt = t + i * 0.011; this.env(cg.gain, tt, 0.001, 0.28 * v, i === 2 ? 0.14 : 0.012);
      c.connect(cf); cf.connect(cg); cg.connect(this.layers.drums); c.start(tt, Math.random()); c.stop(tt + 0.2);
    }
  }

  hat(t, v, dec) {
    const ctx = this.ctx, n = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
    n.buffer = this.noise; hp.type = 'highpass'; hp.frequency.value = 7500; p.pan.value = 0.25;
    this.env(g.gain, t, 0.001, v * 0.35, dec);
    n.connect(hp); hp.connect(g); g.connect(p); p.connect(this.layers.drums); n.start(t, Math.random()); n.stop(t + dec + 0.05);
  }

  bass(t, note, len) {
    const ctx = this.ctx, f = mtof(note);
    const o = ctx.createOscillator(), s = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; s.type = 'sine'; s.frequency.value = f / 2;
    lp.type = 'lowpass'; lp.Q.value = 7;
    lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(180, t + len);
    this.env(g.gain, t, 0.005, 0.32, len + 0.1, 0.0001);
    const sg = ctx.createGain(); sg.gain.value = 0.9;
    o.connect(lp); lp.connect(g); s.connect(sg); sg.connect(g); g.connect(this.layers.bass);
    o.start(t); s.start(t); o.stop(t + len + 0.2); s.stop(t + len + 0.2);
  }

  pad(t, note, len) {
    const ctx = this.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(700, t); lp.frequency.linearRampToValueAtTime(2200, t + len * 0.5); lp.frequency.linearRampToValueAtTime(900, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.5); g.gain.setValueAtTime(0.06, t + len - 0.4); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.6);
    const pan = ctx.createStereoPanner(); pan.pan.value = (note % 3 - 1) * 0.5;
    for (const det of [-9, 0, 8]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(note); o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + len + 0.7);
    }
    lp.connect(g); g.connect(pan); pan.connect(this.pump);
  }

  arp(t, note, v) {
    const ctx = this.ctx, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'square'; o2.type = 'triangle'; o.frequency.value = mtof(note); o2.frequency.value = mtof(note + 12);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(600, t + 0.18);
    this.env(g.gain, t, 0.003, v * 0.5, 0.2);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.arpPump);
    o.start(t); o2.start(t); o.stop(t + 0.3); o2.stop(t + 0.3);
  }

  // FM bell: used for sparkles, food keys, trampolines
  bell(t, note, v, dest, dur = 1.4) {
    const ctx = this.ctx, car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    const f = mtof(note);
    car.frequency.value = f; mod.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(1, t + dur);
    this.env(g.gain, t, 0.002, v, dur);
    mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(dest || this.sfx);
    car.start(t); mod.start(t); car.stop(t + dur + 0.1); mod.stop(t + dur + 0.1);
  }

  // ---------- one-shot SFX ----------
  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  noiseShot({ t = this.now, dur = 0.3, type = 'bandpass', f0 = 1000, f1 = f0, q = 1, v = 0.3, dest = this.sfx, buf = this.noise, attack = 0.005, pos }) {
    if (!this.ready) return;
    const ctx = this.ctx, n = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = buf; n.loop = true; fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(fl); fl.connect(g);
    if (pos) { const p = this.panner(pos); g.connect(p); p.connect(dest); } else g.connect(dest);
    n.start(t, Math.random() * 0.5); n.stop(t + dur + 0.05);
  }

  tone({ t = this.now, f0 = 440, f1 = f0, dur = 0.3, type = 'sine', v = 0.3, dest = this.sfx, attack = 0.005, pos, vibrato = 0 }) {
    if (!this.ready) return;
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (vibrato) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 9; lg.gain.value = vibrato; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    if (pos) { const p = this.panner(pos); g.connect(p); p.connect(dest); } else g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  footstep(surface = 'floor', speed = 1) {
    const f = { floor: 900, metal: 2600, wood: 600, grass: 3200, wet: 1500, tramp: 300 }[surface] || 900;
    this.noiseShot({ dur: 0.07, f0: f * (0.85 + Math.random() * 0.3), q: surface === 'metal' ? 6 : 1.2, v: 0.12 * speed });
    if (surface === 'metal') this.tone({ f0: 1800 + Math.random() * 400, dur: 0.12, v: 0.03, type: 'triangle' });
    if (surface === 'wet') this.noiseShot({ dur: 0.15, f0: 3000, f1: 1200, q: 2, v: 0.06 });
  }
  jump() { this.tone({ f0: 300, f1: 520, dur: 0.15, type: 'triangle', v: 0.12 }); this.noiseShot({ dur: 0.12, f0: 800, f1: 2400, v: 0.05 }); }
  land(force = 1) { this.tone({ f0: 110, f1: 45, dur: 0.22, v: Math.min(0.5, 0.15 * force) }); this.noiseShot({ dur: 0.15, f0: 400, f1: 150, v: Math.min(0.3, 0.08 * force) }); }
  boing(i = 0, power = 1) {
    const note = PENTA[i % PENTA.length] - 12;
    this.tone({ f0: mtof(note) * 0.5, f1: mtof(note), dur: 0.45, type: 'sine', v: 0.35, vibrato: 18 * power });
    this.tone({ f0: mtof(note + 7) * 0.5, f1: mtof(note + 7), dur: 0.35, type: 'triangle', v: 0.1 });
    this.bell(this.now, note + 12, 0.08, this.sfx, 0.8);
  }
  whoosh(dur = 1, v = 0.35) { this.noiseShot({ dur, f0: 300, f1: 4000, q: 0.8, v, attack: dur * 0.6, buf: this.pink }); }
  riser(dur = 1.5) { this.noiseShot({ dur, f0: 200, f1: 8000, q: 3, v: 0.2, attack: dur * 0.9 }); this.tone({ f0: 80, f1: 640, dur, type: 'sawtooth', v: 0.06, attack: dur * 0.9 }); }
  splash() { this.noiseShot({ dur: 0.7, f0: 2500, f1: 400, q: 0.6, v: 0.4, buf: this.pink }); for (let i = 0; i < 6; i++) this.tone({ t: this.now + 0.05 + Math.random() * 0.4, f0: 800 + Math.random() * 1500, f1: 2400, dur: 0.06, v: 0.05 }); }
  boom() { this.tone({ f0: 90, f1: 30, dur: 1.2, v: 0.6 }); this.noiseShot({ dur: 0.9, type: 'lowpass', f0: 1200, f1: 80, v: 0.35, buf: this.brown }); }
  portalIn() { this.riser(0.6); setTimeout(() => { this.boom(); this.bell(this.now, 89, 0.2, this.sfx, 2); this.bell(this.now, 84, 0.15, this.sfx, 2); }, 550); }
  portalOut() { this.whoosh(0.5, 0.3); this.tone({ f0: 1400, f1: 200, dur: 0.6, type: 'triangle', v: 0.15 }); this.bell(this.now + 0.3, 77, 0.15); }
  click() { this.tone({ f0: 2400, f1: 1800, dur: 0.04, type: 'square', v: 0.06 }); }
  hover() { this.tone({ f0: 1800, dur: 0.05, type: 'sine', v: 0.03 }); }
  launch() { this.tone({ f0: 200, f1: 1200, dur: 0.5, type: 'sawtooth', v: 0.12 }); this.whoosh(0.6, 0.3); }
  trapdoor() { this.tone({ f0: 160, f1: 60, dur: 0.3, type: 'square', v: 0.12 }); this.noiseShot({ dur: 0.25, f0: 500, v: 0.2 }); setTimeout(() => this.whoosh(1.4, 0.3), 120); }
  geyser() { this.noiseShot({ dur: 1.2, f0: 600, f1: 5000, q: 0.7, v: 0.45, buf: this.pink, attack: 0.05 }); this.boom(); }
  trick(n = 1) { [0, 4, 7, 12].slice(0, 2 + Math.min(2, n)).forEach((s, i) => this.bell(this.now + i * 0.07, 77 + s, 0.12)); this.noiseShot({ dur: 1, f0: 1000, f1: 3000, q: 0.5, v: 0.08, buf: this.pink, attack: 0.3 }); }
  foodNote(i, pos) {
    const n = PENTA[i % PENTA.length];
    this.bell(this.now, n, 0.22, this.sfx, 1.2);
    this.tone({ f0: mtof(n - 12), dur: 0.35, type: 'triangle', v: 0.12, pos });
    // "nom": quick formant chirp
    this.tone({ t: this.now + 0.05, f0: 520, f1: 260, dur: 0.12, type: 'sawtooth', v: 0.05 });
  }
  garage(dur = 2.6, pos) {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now, o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), p = this.panner(pos, 4);
    o.type = 'sawtooth'; o.frequency.value = 58; lfo.frequency.value = 14; lg.gain.value = 0.05;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.14, t + 0.2); g.gain.setValueAtTime(0.14, t + dur - 0.2); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    lfo.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(p); p.connect(this.sfx);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
    for (let i = 0; i < dur * 9; i++) this.noiseShot({ t: t + i / 9 + Math.random() * 0.03, dur: 0.05, f0: 2200, q: 5, v: 0.06 });
    this.noiseShot({ t: t + dur, dur: 0.3, f0: 300, v: 0.3, pos });
  }
  sparks(pos) { for (let i = 0; i < 5; i++) this.noiseShot({ t: this.now + Math.random() * 0.5, dur: 0.03 + Math.random() * 0.05, f0: 4000 + Math.random() * 4000, q: 3, v: 0.12, pos }); }
  laserBeep(pos) { this.tone({ f0: 2200, dur: 0.08, type: 'square', v: 0.05, pos }); }
  chirp(pos) {
    const t = this.now, base = 2400 + Math.random() * 2000;
    for (let i = 0; i < 2 + Math.random() * 4; i++) this.tone({ t: t + i * 0.09, f0: base, f1: base * (1.2 + Math.random() * 0.5), dur: 0.07, v: 0.06, pos });
  }
  whale(pos) {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now, o = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter(), p = this.panner(pos, 25, 0.6, 400);
    const f = 140 + Math.random() * 120;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.1, t + 1.6); o.frequency.exponentialRampToValueAtTime(f * 0.8, t + 3.6);
    bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 4;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
    o.connect(bp); bp.connect(g); g.connect(p); p.connect(this.amb); g.connect(this.verbSend);
    o.start(t); o.stop(t + 4);
  }
  drawdio(y01, active) {
    if (!this.ready) return;
    if (!this.dd) {
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'square'; f.type = 'lowpass'; f.frequency.value = 2400; g.gain.value = 0;
      o.connect(f); f.connect(g); g.connect(this.sfx); g.connect(this.delaySend); o.start();
      this.dd = { o, g };
    }
    const t = this.now;
    this.dd.o.frequency.setTargetAtTime(110 + Math.pow(1 - y01, 2) * 1600, t, 0.01);
    this.dd.g.gain.setTargetAtTime(active ? 0.08 : 0, t, 0.02);
  }

  // ---------- loops placed in space ----------
  loop(kind, pos, opts = {}) {
    if (!this.ready) return null;
    // ambient loops use cheap equal-power panning (HRTF on ~25 always-on sources made the audio thread stutter)
    const ctx = this.ctx, out = ctx.createGain(), p = this.panner(pos, opts.ref || 2, opts.rolloff || 1.4, opts.max || 80, opts.hrtf ? 'HRTF' : 'equalpower');
    out.gain.value = opts.v ?? 0.3;
    out.connect(p); p.connect(opts.dest || this.amb);
    const src = [];
    // build() creates the sound sources; setActive(false) stops them outright so far-away loops cost nothing
    const build = () => {
    const noise = (buf, type, f, q) => { const n = ctx.createBufferSource(), fl = ctx.createBiquadFilter(); n.buffer = buf; n.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; n.connect(fl); n.start(0, Math.random() * 2); src.push(n); return fl; };
    if (kind === 'sizzle') {
      const fl = noise(this.noise, 'bandpass', 4200, 0.9), crackle = ctx.createGain(), lfo = ctx.createBufferSource(), lg = ctx.createGain();
      lfo.buffer = this.noise; lfo.loop = true; lfo.playbackRate.value = 0.02; lg.gain.value = 0.6; crackle.gain.value = 0.5;
      lfo.connect(lg); lg.connect(crackle.gain); lfo.start(); src.push(lfo);
      fl.connect(crackle); crackle.connect(out);
      const hum = ctx.createOscillator(), hg = ctx.createGain(); hum.frequency.value = 120; hg.gain.value = 0.05; hum.connect(hg); hg.connect(out); hum.start(); src.push(hum);
    } else if (kind === 'hum') {
      const f = opts.freq || 220;
      for (const [m, type, v] of [[1, 'sine', 0.5], [1.005, 'triangle', 0.25], [2, 'sine', 0.12]]) {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f * m; g.gain.value = v; o.connect(g); g.connect(out); o.start(); src.push(o);
      }
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 0.3 + Math.random() * 0.4; lg.gain.value = (opts.v ?? 0.3) * 0.5; l.connect(lg); lg.connect(out.gain); l.start(); src.push(l);
    } else if (kind === 'underwater') {
      noise(this.brown, 'lowpass', 260, 0.7).connect(out);
      const b = noise(this.pink, 'bandpass', 900, 8), bg = ctx.createGain(); bg.gain.value = 0.15; b.connect(bg); bg.connect(out);
    } else if (kind === 'rain') {
      noise(this.pink, 'highpass', 1500, 0.5).connect(out);
    } else if (kind === 'city') {
      noise(this.brown, 'lowpass', 180, 0.5).connect(out);
    } else if (kind === 'wind') {
      const fl = noise(this.pink, 'bandpass', 500, 1.5), l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = 0.08; lg.gain.value = 300; l.connect(lg); lg.connect(fl.frequency); l.start(); src.push(l); fl.connect(out);
    } else if (kind === 'roll') {
      const fl = noise(this.pink, 'bandpass', 320, 1.2); fl.connect(out);
      const rumble = noise(this.brown, 'lowpass', 90, 0.7); rumble.connect(out);
      out.gain.value = 0;
    } else if (kind === 'machine') {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = opts.freq || 90; g.gain.value = 0.08;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; o.connect(lp); lp.connect(g); g.connect(out); o.start(); src.push(o);
      noise(this.noise, 'bandpass', opts.hiss || 3000, 2).connect(out);
    } else if (kind === 'bees') {
      // a little swarm: detuned buzzing saws with fast wobble, through a nasal bandpass
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.5; bp.connect(out);
      for (let i = 0; i < 2; i++) {
        const o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(), w = ctx.createOscillator(), wg = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = 170 + i * 23 + Math.random() * 10;
        l.frequency.value = 0.3 + Math.random() * 0.8; lg.gain.value = 25; l.connect(lg); lg.connect(o.frequency);
        w.frequency.value = 9 + Math.random() * 6; wg.gain.value = 0.08; w.connect(wg); wg.connect(g.gain);
        g.gain.value = 0.1; o.connect(g); g.connect(bp); [o, l, w].forEach(n => { n.start(); src.push(n); });
      }
    } else if (kind === 'water') {
      noise(this.noise, 'highpass', 2500, 0.7).connect(out);
      noise(this.pink, 'lowpass', 400, 0.7).connect(out);
    }
    };
    build();
    const handle = { out, panner: p, src, pos: pos.clone ? pos.clone() : pos, max: opts.max || 80, connected: true,
      last: null,
      setGain(v, tc = 0.1) { if (this.last !== null && Math.abs(v - this.last) < 0.01) return; this.last = v; out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(v, ctx.currentTime, tc); },
      // disconnect loops that are out of earshot so the audio thread doesn't render them
      setActive(on) {
        if (on === this.connected) return;
        this.connected = on;
        if (on) { build(); out.connect(p); }
        else { for (const s of src) { try { s.stop(); } catch { /* already stopped */ } try { s.disconnect(); } catch { /* fine */ } } src.length = 0; out.disconnect(p); }
      } };
    this.loops.push(handle);
    return handle;
  }

  // ---------- Web MIDI ----------
  initMIDI() {
    if (!navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess().then(acc => {
      const bind = inp => { inp.onmidimessage = e => this.onMIDI(e.data); };
      acc.inputs.forEach(bind);
      acc.onstatechange = e => { if (e.port.type === 'input' && e.port.state === 'connected') bind(e.port); };
    }).catch(() => {});
  }
  onMIDI([st, note, vel]) {
    if ((st & 0xf0) === 0x90 && vel > 0) {
      this.bell(this.now, note, 0.1 + vel / 127 * 0.25, this.sfx, 1.6);
      this.arp(this.now, note, vel / 127 * 0.4);
      for (const fn of this.listeners.midi) fn(note, vel);
    }
  }
}

export const audio = new AudioEngine();
export { PENTA, mtof };
