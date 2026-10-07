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

  muzzle(x, y, v) {
    for (let i = 0; i < 8; i++) {
      const s = 2 + Math.random() * 4;
      this.add({ x, y, vx: v.x * s + (Math.random() - 0.5), vy: v.y * s + (Math.random() - 0.5), g: 0, drag: 0.85, life: 0.25, size: 5, color: [120, 120, 130] });
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

  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.age += dt;
      if (p.age >= p.life) {
        L[i] = L[L.length - 1];
        L.pop();
        continue;
      }
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.g;
      p.x += p.vx;
      p.y += p.vy;
    }
  }

  // world space
  draw(ctx) {
    for (const p of this.list) {
      if (p.type === 'text') continue;
      const t = p.age / p.life;
      ctx.fillStyle = rgb(p.color, 1 - t * t);
      sq(ctx, p.x, p.y, p.size * (1 - t * 0.5));
    }
  }

  // screen space (HUD units); cam converts world -> screen
  drawText(ctx, cam) {
    ctx.textAlign = 'center';
    for (const p of this.list) {
      if (p.type !== 'text') continue;
      const t = p.age / p.life;
      ctx.globalAlpha = clamp(1.6 * (1 - t), 0, 1);
      ctx.font = `${p.big ? 40 : 26}px "Maven Pro", Verdana, sans-serif`;
      const sx = Math.round(p.x - cam.x);
      const sy = Math.round(p.y - cam.y);
      ctx.fillStyle = 'rgba(20,20,40,0.6)';
      ctx.fillText(p.str, sx + 2, sy + 2);
      ctx.fillStyle = p.color;
      ctx.fillText(p.str, sx, sy);
    }
    ctx.globalAlpha = 1;
  }
}
