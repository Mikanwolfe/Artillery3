'use strict';
// Lightweight particle system. Every particle is a square (sparks, smoke, debris, fireballs,
// shockwave rings of squares); floating text is the exception and is drawn on the label pass.

class Particles {
  constructor() {
    this.list = [];
  }

  add(p) {
    if (this.list.length > 1800) this.list.shift();
    p.age = 0;
    this.list.push(p);
    return p;
  }

  clear() { this.list.length = 0; }

  explosion(x, y, size, color = [255, 190, 90]) {
    this.add({ type: 'fireball', x, y, life: 0.45, r: size * 1.15, color });
    this.add({ type: 'ring', x, y, life: 0.4, r: size * 1.9 });
    const n = Math.min(70, 14 + size);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = (0.6 + Math.random() * 3.2) * (0.6 + size / 45);
      this.add({
        type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2, g: 0.09,
        life: 0.4 + Math.random() * 0.6, size: 1 + Math.random() * 1.8,
        color: Math.random() < 0.5 ? [255, 220, 130] : [255, 140, 60],
      });
    }
    for (let i = 0; i < n * 0.35; i++) {
      const a = -Math.PI * Math.random();
      const s = 0.8 + Math.random() * 2.6;
      this.add({
        type: 'debris', x, y, vx: Math.cos(a) * s * 1.4, vy: Math.sin(a) * s * 2.2, g: 0.16,
        life: 0.9 + Math.random() * 0.8, size: 1.5 + Math.random() * 2.5,
        color: [90 + Math.random() * 60, 90 + Math.random() * 50, 100 + Math.random() * 50],
      });
    }
    for (let i = 0; i < 6 + size * 0.18; i++) {
      this.add({
        type: 'smoke', x: x + (Math.random() - 0.5) * size, y: y + (Math.random() - 0.5) * size * 0.5,
        vx: (Math.random() - 0.5) * 0.6, vy: -0.25 - Math.random() * 0.5,
        life: 1 + Math.random() * 1.2, r: 5 + Math.random() * size * 0.35,
      });
    }
  }

  muzzle(x, y, ang) {
    for (let i = 0; i < 10; i++) {
      const a = ang + (Math.random() - 0.5) * 0.5;
      const s = 1 + Math.random() * 3;
      this.add({
        type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.02,
        life: 0.15 + Math.random() * 0.2, size: 1.4, color: [255, 230, 160],
      });
    }
    this.add({ type: 'fireball', x, y, life: 0.12, r: 9, color: [255, 220, 150] });
  }

  text(x, y, str, color = '#fff', big = false) {
    this.add({ type: 'text', x, y, vy: -0.5, life: 1.4, str, color, big });
  }

  smoke(x, y, r = 4) {
    this.add({ type: 'smoke', x, y, vx: (Math.random() - 0.5) * 0.3, vy: -0.3, life: 0.9, r });
  }

  trailSpark(x, y, color) {
    this.add({ type: 'spark', x, y, vx: 0, vy: 0, g: 0, life: 0.35, size: 1.4, color });
  }

  dust(x, y, n = 8) {
    for (let i = 0; i < n; i++) {
      this.add({
        type: 'smoke', x: x + (Math.random() - 0.5) * 14, y: y - 2,
        vx: (Math.random() - 0.5) * 1.1, vy: -Math.random() * 0.5, life: 0.6 + Math.random() * 0.4, r: 3 + Math.random() * 4,
        snow: true,
      });
    }
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
      if (p.vx !== undefined) { p.x += p.vx * 60 * dt; p.y += p.vy * 60 * dt; }
      if (p.g) p.vy += p.g * 60 * dt;
      if (p.type === 'text') p.vy *= 0.985;
    }
  }

  // world particles (everything except text)
  draw(ctx) {
    for (const p of this.list) {
      const t = p.age / p.life;
      switch (p.type) {
        case 'fireball': {
          // a jittered cluster of squares rather than one big box
          if (!p.bits) {
            p.bits = [];
            for (let i = 0; i < 7; i++) p.bits.push({ dx: (Math.random() - 0.5) * 1.1, dy: (Math.random() - 0.6) * 0.9, s: 0.45 + Math.random() * 0.5 });
          }
          const r = p.r * (0.4 + 0.6 * Math.sqrt(t));
          ctx.fillStyle = rgb(p.color, 0.85 * (1 - t));
          for (const b of p.bits) sq(ctx, p.x + b.dx * r, p.y + b.dy * r, b.s * r * 1.3);
          ctx.fillStyle = `rgba(255,248,210,${1 - t})`;
          for (let i = 0; i < 3; i++) sq(ctx, p.x + p.bits[i].dx * r * 0.5, p.y + p.bits[i].dy * r * 0.5, p.bits[i].s * r * 0.6 * (1 - t * 0.5));
          break;
        }
        case 'ring': {
          const r = p.r * Math.sqrt(t);
          ctx.fillStyle = `rgba(255,240,210,${0.7 * (1 - t)})`;
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU;
            sq(ctx, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 5 * (1 - t) + 2);
          }
          break;
        }
        case 'spark':
          ctx.fillStyle = rgb(p.color, 1 - t);
          sq(ctx, p.x, p.y, p.size + 1);
          break;
        case 'debris':
          ctx.fillStyle = rgb(p.color, 1 - t * t);
          sq(ctx, p.x, p.y, p.size + 1);
          break;
        case 'smoke': {
          const c = p.snow ? [235, 242, 250] : [70, 72, 80];
          ctx.fillStyle = rgb(c, (p.snow ? 0.6 : 0.45) * (1 - t));
          sq(ctx, p.x, p.y, p.r * 1.6 * (1 + t * 1.2));
          break;
        }
      }
    }
  }

  // floating text, drawn above everything
  drawText(ctx) {
    for (const p of this.list) {
      if (p.type !== 'text') continue;
      const t = p.age / p.life;
      ctx.globalAlpha = clamp(1.6 * (1 - t), 0, 1);
      ctx.font = `bold ${p.big ? 16 : 12}px Verdana, Tahoma, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000';
      ctx.fillText(p.str, Math.round(p.x) + 1, Math.round(p.y) + 1);
      ctx.fillStyle = p.color;
      ctx.fillText(p.str, Math.round(p.x), Math.round(p.y));
      ctx.globalAlpha = 1;
    }
  }
}
