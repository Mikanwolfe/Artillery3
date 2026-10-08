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
    const sx = Math.round(p.x - cam.x);
    const sy = Math.round(p.y - cam.y);
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
