'use strict';
// Tiny WebAudio synth: every sound is generated, no audio files. Starts muted-safe:
// the AudioContext is only created after the first user gesture.

class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuf = null;
    this.chargeOsc = null;
    try { this.muted = localStorage.getItem('a3.muted') === '1'; } catch (e) { /* ignore */ }
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; // wait for a real gesture
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('a3.muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  tone(type, f0, f1, dur, gain, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(filter, f0, f1, dur, gain, q = 1, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }

  shot(w) {
    if (w.kind === 'gun' || w.kind === 'laser') {
      this.tone('sawtooth', 1800, 200, 0.18, 0.25);
      this.noise('highpass', 3000, 800, 0.15, 0.3);
    } else {
      this.tone('sine', 150, 38, 0.28, 0.7);
      this.noise('bandpass', 900, 200, 0.18, 0.5, 0.8);
    }
  }

  explosion(size) {
    const d = 0.35 + size * 0.012;
    this.noise('lowpass', 1600, 90, d, 0.9 + size * 0.01);
    this.tone('sine', 110, 28, d, 0.8);
    if (size > 35) this.tone('sine', 60, 20, d * 1.4, 0.7, 0.04);
  }

  satPrep() { this.tone('sawtooth', 220, 1400, 0.9, 0.16); }
  satFire() {
    this.noise('highpass', 4000, 600, 0.7, 0.55);
    this.tone('sawtooth', 900, 70, 0.7, 0.4);
    this.tone('sine', 70, 25, 0.9, 0.7);
  }
  laser() { this.tone('sawtooth', 1800, 300, 0.25, 0.22); this.noise('highpass', 5000, 1500, 0.2, 0.25); }
  repair() { [440, 554, 659, 880].forEach((f, i) => this.tone('triangle', f, f * 1.01, 0.12, 0.14, i * 0.06)); }
  acid() { this.noise('highpass', 5000, 2500, 0.35, 0.3); }
  thud() { this.tone('sine', 90, 35, 0.16, 0.4); }
  click() { this.tone('square', 900, 700, 0.04, 0.07); }
  buy() { this.tone('triangle', 880, 1320, 0.09, 0.2); this.tone('triangle', 1320, 1760, 0.12, 0.2, 0.08); }
  deny() { this.tone('square', 200, 140, 0.12, 0.12); }
  hit() { this.tone('square', 300, 90, 0.1, 0.18); }
  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.22, 0.2, i * 0.11));
  }

  chargeStart() {
    if (!this.ctx || this.chargeOsc) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = 110;
    g.gain.value = 0.05;
    o.connect(g).connect(this.master);
    o.start();
    this.chargeOsc = { o, g };
  }
  chargeUpdate(power) {
    if (this.chargeOsc) this.chargeOsc.o.frequency.value = 110 + power * 5;
  }
  chargeStop() {
    if (!this.chargeOsc) return;
    try { this.chargeOsc.o.stop(); } catch (e) { /* ignore */ }
    this.chargeOsc = null;
  }
}
