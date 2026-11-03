'use strict';
// Sound: everything is synthesised with WebAudio (the original was silent apart from the console).
const SFX = {
  ctx: null, on: store.get('ss2.sound', true),
  init() {
    if (this.ctx || !this.on) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.on = false; }
  },
  toggle() { this.on = !this.on; store.set('ss2.sound', this.on); if (this.on) this.init(); return this.on; },
  tone(freq, dur, o = {}) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.06, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  },
  noise(dur, o = {}) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = o.filter || 'lowpass'; f.frequency.value = o.freq || 1800;
    src.buffer = buf;
    g.gain.value = o.vol || 0.12;
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  },
  play(id) {
    switch (id) {
      case 'hit': this.noise(0.09, { freq: 1600 }); this.tone(140, 0.08, { to: 70, vol: 0.05 }); break;
      case 'crit': this.noise(0.15, { freq: 2600, vol: 0.16 }); this.tone(220, 0.15, { to: 60, vol: 0.07 }); break;
      case 'hurt': this.noise(0.12, { freq: 900, vol: 0.14 }); this.tone(90, 0.12, { to: 50, vol: 0.06, type: 'sawtooth' }); break;
      case 'miss': this.noise(0.12, { filter: 'highpass', freq: 3000, vol: 0.05 }); break;
      case 'magic': this.tone(520, 0.18, { to: 1040, type: 'sine', vol: 0.05 }); break;
      case 'heal': [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, { delay: i * 0.06, type: 'triangle', vol: 0.05 })); break;
      case 'buff': [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.1, { delay: i * 0.05, type: 'triangle', vol: 0.04 })); break;
      case 'charge': this.tone(110, 0.5, { to: 330, type: 'sawtooth', vol: 0.04 }); break;
      case 'big': this.noise(0.4, { freq: 600, vol: 0.2 }); this.tone(80, 0.4, { to: 35, vol: 0.08, type: 'sawtooth' }); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, { delay: i * 0.1, type: 'triangle', vol: 0.06 })); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.25, { delay: i * 0.15, type: 'sine', vol: 0.06 })); break;
      case 'buy': this.tone(880, 0.06, { type: 'square', vol: 0.03 }); this.tone(1320, 0.08, { delay: 0.05, type: 'square', vol: 0.03 }); break;
      case 'click': this.tone(660, 0.03, { type: 'square', vol: 0.02 }); break;
      case 'phase': this.tone(70, 0.8, { to: 140, type: 'sawtooth', vol: 0.06 }); this.noise(0.5, { freq: 400, vol: 0.1 }); break;
      case 'nope': this.tone(160, 0.1, { type: 'square', vol: 0.04 }); break;
    }
  },
};
