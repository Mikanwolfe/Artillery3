'use strict';
// Sound: the original A3 samples (web/sounds, transcoded from Resources/sounds) for everything
// the original had a sound for, mapped as in Artillery3R.cs; a tiny WebAudio synth for the rest
// (firing, hits, repairs) and as a fallback until a sample has loaded.
// Nothing plays until the first user gesture (autoplay rules).

// name -> gain. Gains even out the originals (e.g. the combat music is ~19 dB quieter than the shop's).
const SAMPLES = {
  expl1: 0.8, expl2: 0.85, expl3: 0.95, acid: 0.9, laser_satellite: 0.55, satellite_prep: 0.6,
  char_die: 0.5, new_turn: 0.9, win: 0.5, entryboom_combat: 0.6, entryboom_shop: 0.6,
  confirm: 1, hover: 1, menu_confirm: 0.6, mech_turn_on: 0.45, mech_fail: 0.6, mech_confirm: 0.5, mech_move: 0.8,
};
// A3 music: carpark_underground_003 in combat, menuDrones in the menu and shop
const MUSIC = { combat: { file: 'music_combat', vol: 0.9 }, shop: { file: 'music_shop', vol: 0.18 } };
const MAX_EXPLOSIONS = 4; // simultaneous explosion samples (a 16-round salvo would be a wall of noise)

class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicOn = true;
    this.noiseBuf = null;
    this.buf = {}; // decoded samples (Web Audio)
    this.el = {}; // <audio> fallbacks when fetch is blocked (opened from file://)
    this.voices = 0;
    this.lastExpl = 0;
    this.track = null;
    this.musicEl = null;
    try {
      this.muted = localStorage.getItem('a3.muted') === '1';
      this.musicOn = localStorage.getItem('a3.music') !== '0';
    } catch (e) { /* ignore */ }
  }

  loadSamples() {
    for (const name of Object.keys(SAMPLES)) {
      const src = `sounds/${name}.mp3`;
      (location.protocol === 'file:' ? Promise.reject() : fetch(src))
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then((b) => this.ctx.decodeAudioData(b))
        .then((b) => { this.buf[name] = b; })
        .catch(() => {
          const a = new Audio(src);
          a.preload = 'auto';
          this.el[name] = a;
        });
    }
  }

  // play a sample; false if it isn't available (yet), so the caller can synthesise instead
  play(name, gain = 1, rate = 1) {
    if (!this.ctx) return false;
    const g0 = (SAMPLES[name] || 1) * gain;
    const b = this.buf[name];
    if (b) {
      const s = this.ctx.createBufferSource();
      s.buffer = b;
      s.playbackRate.value = rate;
      const g = this.ctx.createGain();
      g.gain.value = g0;
      s.connect(g).connect(this.master);
      s.start();
      return s;
    }
    const el = this.el[name];
    if (!el) return false;
    if (this.muted) return true;
    const a = el.cloneNode();
    a.volume = clamp(g0 * 0.5, 0, 1);
    a.playbackRate = rate;
    a.play().catch(() => {});
    return a;
  }

  // ---------------------------------------------------------------- music
  music(track) {
    this.track = track;
    this.syncMusic();
  }

  setMusic(on) {
    this.musicOn = on;
    try { localStorage.setItem('a3.music', on ? '1' : '0'); } catch (e) { /* ignore */ }
    this.syncMusic();
  }

  syncMusic() {
    const want = this.ctx && this.musicOn && !this.muted ? this.track : null;
    if (this.musicEl && this.musicEl.dataset.track !== want) {
      this.musicEl.pause();
      this.musicEl = null;
    }
    if (!want || this.musicEl) return;
    const m = MUSIC[want];
    const a = new Audio(`sounds/${m.file}.mp3`);
    a.dataset.track = want;
    a.loop = true;
    a.volume = m.vol;
    a.play().catch(() => {});
    this.musicEl = a;
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
    this.loadSamples();
    this.syncMusic();
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('a3.muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
    this.syncMusic();
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

  // A3 Utilities.PlayRandomExplosionSound: one of three samples, louder for bigger blasts
  explosion(size) {
    // (voices are counted by when they will be done, not by 'ended' events: a sample the browser
    // refused to play never ends, and enough of those used to silence every explosion after)
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.explEnds = (this.explEnds || []).filter((e) => e > now);
    if (this.ctx && (this.explEnds.length >= MAX_EXPLOSIONS || now - this.lastExpl < 0.05)) return;
    const s = this.play(`expl${1 + Math.floor(Math.random() * 3)}`, clamp(0.45 + size / 70, 0.45, 1.1));
    if (s) {
      this.lastExpl = now;
      this.explEnds.push(now + Math.min(1.5, (s.buffer && s.buffer.duration) || 1.5));
      return;
    }
    const d = 0.35 + size * 0.012;
    this.noise('lowpass', 1600, 90, d, 0.9 + size * 0.01);
    this.tone('sine', 110, 28, d, 0.8);
    if (size > 35) this.tone('sine', 60, 20, d * 1.4, 0.7, 0.04);
  }

  satPrep() { if (!this.play('satellite_prep')) this.tone('sawtooth', 220, 1400, 0.9, 0.16); }
  satFire() {
    if (this.play('laser_satellite', 1.3)) return;
    this.noise('highpass', 4000, 600, 0.7, 0.55);
    this.tone('sawtooth', 900, 70, 0.7, 0.4);
    this.tone('sine', 70, 25, 0.9, 0.7);
  }
  laser() { if (this.play('laser_satellite')) return; this.tone('sawtooth', 1800, 300, 0.25, 0.22); this.noise('highpass', 5000, 1500, 0.2, 0.25); }
  repair() { [440, 554, 659, 880].forEach((f, i) => this.tone('triangle', f, f * 1.01, 0.12, 0.14, i * 0.06)); }
  acid() { if (this.play('acid')) return; this.noise('highpass', 5000, 2500, 0.35, 0.3); }
  thud() { this.tone('sine', 90, 35, 0.16, 0.4); }
  click() { if (!this.play('mech_move')) this.tone('square', 900, 700, 0.04, 0.07); }
  hover() { this.play('hover'); }
  // thunder: a low rumble under a sharp crack
  thunder() {
    this.noise('highpass', 6000, 1200, 0.12, 0.5);
    this.noise('lowpass', 500, 60, 1.4, 0.7, 0.8, 0.05);
  }
  confirm() { this.play('confirm'); }
  newTurn() { this.play('new_turn'); }
  roundStart() { this.play('entryboom_combat'); this.music('combat'); }
  shopOpen() { this.play('entryboom_shop'); this.music('shop'); }
  die() { this.play('char_die'); }
  // A3 shop: confirm + mechanical turn-on for a weapon, turn-on for upgrades, menuConfirm to equip/sell
  buyWeapon() { if (this.play('mech_turn_on')) this.play('confirm'); else this.buy(); }
  sell() { if (!this.play('menu_confirm')) this.buy(); }
  buy() { if (this.play('mech_turn_on')) return; this.tone('triangle', 880, 1320, 0.09, 0.2); this.tone('triangle', 1320, 1760, 0.12, 0.2, 0.08); }
  deny() { if (this.play('mech_fail')) return; this.tone('square', 200, 140, 0.12, 0.12); }
  hit() { this.tone('square', 300, 90, 0.1, 0.18); }
  win() {
    if (this.play('win')) return;
    [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.22, 0.2, i * 0.11));
  }
}
