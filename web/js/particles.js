'use strict';
// Square particles in world units, using A3's explosion palettes. Floating text (damage
// numbers) is drawn separately in screen space so it stays readable.

const PALETTES = {
  shell: [[255, 165, 0], [20, 20, 20], [255, 230, 40]], // CreateFastExplosion: orange, black, yellow
  laser: [[0, 255, 255], [173, 216, 230], [248, 248, 255]], // CreateLaserExplosion
  acid: [[255, 165, 0], [255, 230, 40], [40, 160, 40]], // CreateAcidExplosion
};

class Particles {
  constructor() {
    this.list = [];
  }

  add(p) {
    if (this.list.length > 1500) this.list.shift();
    p.age = 0;
    this.list.push(p);
    return p;
  }

  clear() { this.list.length = 0; }

  explosion(x, y, size, palette = 'shell') {
    const cols = PALETTES[palette];
    if (size >= 140) this.mushroom(x, y, size);
    this.add({ x, y, vx: 0, vy: 0, g: 0, drag: 1, life: 0.12, size: 20 + size * 0.5, color: [255, 252, 235] });
    const n = Math.min(90, 24 + size * 0.35);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = Math.random() * (2 + size * 0.06);
      this.add({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, g: 0.12, drag: 0.94,
        life: 0.4 + Math.random() * 0.8, size: 5 + Math.random() * (6 + size * 0.06), color: cols[i % cols.length],
      });
    }
  }

  // a mushroom cloud for big blasts, sized by the blast (k ~0.9 at the threshold, ~2.5 for the
  // Mass Driver): a stem drawn up into the cloud, and a cap that is a rising vortex ring, which side
  // on is two rolls turning against each other (up the middle, out over the top, down the outside),
  // swelling as it climbs; the biggest also push a ring of dust out along the ground
  mushroom(x, y, size) {
    const k = clamp(size / 160, 0.7, 3.3);
    const n = Math.round(14 * k);
    for (let i = 0; i < n; i++) { // stem: smoke rising and drawn inward
      const ox = (Math.random() - 0.5) * 14 * k;
      this.add({ x: x + ox, y: y - i * 3 * k, vx: -ox * 0.01, vy: -(1.4 + Math.random() * 0.6) * k, g: 0, drag: 0.978,
        life: 1.7 + Math.random() * 0.7 + 0.2 * k, size: (8 + Math.random() * 6) * Math.pow(k, 0.85), color: i % 3 ? [110, 96, 92] : [150, 128, 116] });
    }
    const m = Math.round(44 * k);
    const rise = 80 + 70 * k;
    for (let i = 0; i < m; i++) { // cap: the vortex ring, two fat rolls that meet over the middle
      const side = i % 2 ? 1 : -1;
      const hot = i % 6 === 0;
      this.add({ x, y, vx: 0, vy: 0, g: 0, drag: 1, life: 2.2 + Math.random() * 0.9 + 0.3 * k, size: (12 + Math.random() * 10) * Math.pow(k, 0.85),
        color: hot ? [255, 170, 90] : i % 3 ? [128, 112, 106] : [170, 150, 140],
        vortex: { x0: x, y0: y - 14 * k, side, R0: 6 * k, R1: (22 + Math.random() * 6) * k, r: (8 + Math.random() * 14) * k, th: Math.random() * TAU, w: (0.07 + Math.random() * 0.05) * side, rise } });
    }
    for (let i = 0; i < 10 * k; i++) { // the dome over the middle, riding up with the rolls
      this.add({ x, y, vx: 0, vy: 0, g: 0, drag: 1, life: 2.2 + Math.random() * 0.7 + 0.3 * k, size: (14 + Math.random() * 10) * Math.pow(k, 0.85), color: i % 2 ? [140, 124, 116] : [118, 104, 98],
        vortex: { x0: x, y0: y - 22 * k, side: 0, R0: 0, R1: 0, r: (6 + Math.random() * 14) * k, th: Math.random() * TAU, w: 0.03 * (i % 2 ? 1 : -1), rise } });
    }
    if (k > 1.3) { // base surge
      for (let i = 0; i < 18 * k; i++) {
        const d = i % 2 ? 1 : -1;
        this.add({ x, y: y - 2, vx: d * (1 + Math.random() * 2.5) * k, vy: -Math.random() * 0.3, g: 0, drag: 0.955, life: 1.2 + Math.random() * 0.8, size: (6 + Math.random() * 6) * k * 0.8, color: [150, 136, 126] });
      }
    }
  }

  // a shot leaving the barrel: a flash, a burst of smoke blown forward that billows and drifts, and,
  // for guns with a muzzle brake, gas vented sideways (up and down across the barrel). Scales with
  // the gun (k ~ 0.6 for small guns, up to 2 for the heaviest)
  muzzle(x, y, v, w = null) {
    const k = w ? clamp(0.6 + w.dmg / 500, 0.6, 2) : 1;
    this.add({ x: x + v.x * 4, y: y + v.y * 4, vx: 0, vy: 0, g: 0, drag: 1, life: 0.07, size: 10 + 8 * k, color: [255, 236, 180] });
    const n = Math.round(8 + 8 * k);
    for (let i = 0; i < n; i++) {
      const s = (1.5 + Math.random() * 4.5) * k;
      const spread = (Math.random() - 0.5) * 0.9;
      const dx = v.x - v.y * spread, dy = v.y + v.x * spread;
      this.add({ x, y, vx: dx * s, vy: dy * s - 0.2, g: -0.01, drag: 0.88, life: 0.5 + Math.random() * 0.7, size: (4 + Math.random() * 5) * k,
        color: i % 4 === 0 ? [200, 190, 176] : i % 2 ? [128, 124, 132] : [160, 156, 162] });
    }
    if (w && w.dmgR >= 120) { // muzzle brake: two side jets, perpendicular to the barrel
      for (const side of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          const s = (2 + Math.random() * 3) * k;
          this.add({ x: x - v.x * 3, y: y - v.y * 3, vx: -v.y * side * s + v.x * 0.6, vy: v.x * side * s + v.y * 0.6, g: -0.01, drag: 0.86,
            life: 0.4 + Math.random() * 0.4, size: (4 + Math.random() * 4) * k, color: i % 2 ? [150, 146, 150] : [190, 182, 170] });
        }
      }
    }
  }

  puff(x, y, color = [235, 238, 244]) {
    for (let i = 0; i < 6; i++) {
      this.add({ x: x + (Math.random() - 0.5) * 16, y, vx: (Math.random() - 0.5) * 1.5, vy: -Math.random() * 1.2, g: 0, drag: 0.95, life: 0.6, size: 6 + Math.random() * 6, color });
    }
  }

  text(x, y, str, color = '#ffffff', big = false) {
    this.add({ type: 'text', x, y, vx: (Math.random() - 0.5) * 0.4, vy: -0.8, g: 0, drag: 0.98, life: 1.4, str, color, big });
  }

  // wind: light world particles (smoke, dust, ash; little or no gravity) drift with it, heavy
  // debris barely; popups and text don't
  update(dt, wind = null) {
    const L = this.list;
    const wx = wind ? wind.x * 30 : 0;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.age += dt;
      if (p.age >= p.life) {
        L[i] = L[L.length - 1];
        L.pop();
        continue;
      }
      if (p.vortex) { // a mushroom cap roll (see mushroom): it climbs and swells as it turns
        const v = p.vortex;
        const u = 1 - Math.exp(-p.age * 1.4);
        v.th += v.w;
        v.x0 += wx * 0.4;
        const R = lerp(v.R0, v.R1, u);
        p.x = v.x0 + v.side * R + Math.cos(v.th) * v.r * (0.6 + 0.4 * u);
        p.y = v.y0 - v.rise * u + Math.sin(v.th) * v.r * 0.8;
        continue;
      }
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.g;
      p.x += p.vx;
      p.y += p.vy;
      if (wx && p.type !== 'text' && p.type !== 'hit') p.x += wx * clamp(1 - (p.g || 0) / 0.3, 0.1, 1) * Math.min(1, p.age * 2);
    }
  }

  // world space
  draw(ctx) {
    for (const p of this.list) {
      if (p.type === 'text' || p.type === 'hit') continue;
      const t = p.age / p.life;
      ctx.fillStyle = rgb(p.color, 1 - t * t);
      sq(ctx, p.x, p.y, p.size * (1 - t * 0.5));
    }
  }

  // a hit popup (Game.hitPopup): the number punches in oversized and settles, then the quality
  // tag and the modifier chips appear under it one by one
  drawHit(ctx, cam, p) {
    const t = p.age / p.life;
    const punch = p.age < 0.14 ? 1 + 0.6 * (1 - p.age / 0.14) : 1;
    const sx = Math.round(cam.sx(p.x));
    const sy = Math.round(cam.sy(p.y));
    ctx.globalAlpha = clamp(2 * (1 - t), 0, 1);
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.round(p.size * punch)}px ${HUD_FONT}`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, p.size / 7); // a dark outline so pale numbers read on snow and sky
    ctx.strokeStyle = 'rgba(14,12,22,0.85)';
    ctx.strokeText(p.str, sx, sy);
    ctx.fillStyle = p.color;
    ctx.fillText(p.str, sx, sy);
    let y = sy + 16;
    ctx.font = `700 11px ${HUD_FONT}`;
    const lines = [[p.tag, p.color]].concat(p.chips);
    lines.forEach(([txt, col], i) => {
      if (p.age < 0.1 + i * 0.08) return;
      const w = ctx.measureText(txt).width + 10;
      ctx.fillStyle = 'rgba(14,12,22,0.78)';
      ctx.fillRect(Math.round(sx - w / 2), y - 10, Math.round(w), 14);
      ctx.fillStyle = col;
      ctx.fillText(txt, sx, y);
      y += 15;
    });
    ctx.globalAlpha = 1;
  }

  // screen space (HUD units); cam converts world -> screen
  drawText(ctx, cam) {
    ctx.textAlign = 'center';
    for (const p of this.list) {
      if (p.type === 'hit') { this.drawHit(ctx, cam, p); continue; }
      if (p.type !== 'text') continue;
      const t = p.age / p.life;
      ctx.globalAlpha = clamp(1.6 * (1 - t), 0, 1);
      ctx.font = `700 ${p.big ? 34 : 22}px ${HUD_FONT}`;
      const sx = Math.round(cam.sx(p.x));
      const sy = Math.round(cam.sy(p.y));
      ctx.fillStyle = 'rgba(20,20,40,0.6)';
      ctx.fillText(p.str, sx + 2, sy + 2);
      ctx.fillStyle = p.color;
      ctx.fillText(p.str, sx, sy);
    }
    ctx.globalAlpha = 1;
  }
}
