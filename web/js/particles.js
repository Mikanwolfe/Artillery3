'use strict';
// Lightweight particle system: sparks, smoke, debris, shockwave rings, fireballs and
// floating text (the original had TextParticles for damage numbers too).

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

  draw(ctx) {
    for (const p of this.list) {
      const t = p.age / p.life;
      switch (p.type) {
        case 'fireball': {
          const r = p.r * (0.35 + 0.65 * Math.sqrt(t));
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          g.addColorStop(0, `rgba(255,250,220,${1 - t})`);
          g.addColorStop(0.4, rgb(p.color, 0.85 * (1 - t)));
          g.addColorStop(1, rgb(p.color, 0));
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = g;
          ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
        case 'ring':
          ctx.strokeStyle = `rgba(255,240,210,${0.5 * (1 - t)})`;
          ctx.lineWidth = 2 * (1 - t) + 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * Math.sqrt(t), 0, TAU);
          ctx.stroke();
          break;
        case 'spark':
          ctx.fillStyle = rgb(p.color, 1 - t);
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
          break;
        case 'debris':
          ctx.fillStyle = rgb(p.color, 1 - t * t);
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
          break;
        case 'smoke': {
          const r = p.r * (1 + t * 1.2);
          const c = p.snow ? [235, 242, 250] : [60, 62, 72];
          ctx.fillStyle = rgb(c, (p.snow ? 0.5 : 0.35) * (1 - t));
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, TAU);
          ctx.fill();
          break;
        }
        case 'text':
          ctx.globalAlpha = clamp(1.6 * (1 - t), 0, 1);
          ctx.font = `bold ${p.big ? 17 : 12}px ui-monospace, Menlo, Consolas, monospace`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(8,12,24,0.85)';
          ctx.strokeText(p.str, p.x, p.y);
          ctx.fillStyle = p.color;
          ctx.fillText(p.str, p.x, p.y);
          ctx.globalAlpha = 1;
          break;
      }
    }
  }
}
