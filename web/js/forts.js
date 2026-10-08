'use strict';
// Forts (events on): small neutral strongholds built from square blocks on flattened ground. Shells
// stop on them, vehicles can't drive through them, and blasts break blocks; blocks with nothing
// under them drop down their column. Good cover until someone shells it apart. Styled per biome
// (stone with snow, a timber palisade, sandstone).

const FORT_CELL = 12;
const FORT_HP = 60; // per block

class Fort {
  constructor(x, terrain, style) {
    this.style = style;
    this.cols = rng.int(5, 8);
    this.rows = rng.int(3, 5);
    const half = (this.cols * FORT_CELL) / 2;
    terrain.flatten(x, half + 6);
    this.x0 = Math.round(x - half);
    this.base = Math.round(terrain.hAt(x)) + 2; // sunk a touch into the ground
    // cells[r][c], r = 0 at the bottom; the top row is crenellated, and one tower stands taller
    this.cells = [];
    const tower = rng.int(0, this.cols - 1);
    for (let r = 0; r <= this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        let hp = FORT_HP;
        if (r === this.rows - 1 && c % 2 === 1 && c !== tower) hp = 0; // battlements
        if (r === this.rows && Math.abs(c - tower) > 0) hp = 0; // tower top
        row.push(hp);
      }
      this.cells.push(row);
    }
    this.cracks = new Map();
  }

  cellX(c) { return this.x0 + c * FORT_CELL; }
  cellY(r) { return this.base - (r + 1) * FORT_CELL; }

  at(x, y) {
    const c = Math.floor((x - this.x0) / FORT_CELL);
    const r = Math.floor((this.base - y) / FORT_CELL);
    return r >= 0 && r < this.cells.length && c >= 0 && c < this.cols && this.cells[r][c] > 0;
  }

  // does a box (vehicle footprint) overlap any standing block?
  blocks(x0, x1, y0, y1) {
    for (let r = 0; r < this.cells.length; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[r][c] <= 0) continue;
        const cx = this.cellX(c), cy = this.cellY(r);
        if (cx < x1 && cx + FORT_CELL > x0 && cy < y1 && cy + FORT_CELL > y0) return true;
      }
    }
    return false;
  }

  // y of the top of the column at x (vehicles can stand on a fort), or Infinity if none there
  topAt(x) {
    const c = Math.floor((x - this.x0) / FORT_CELL);
    if (c < 0 || c >= this.cols) return Infinity;
    for (let r = this.cells.length - 1; r >= 0; r--) if (this.cells[r][c] > 0) return this.cellY(r);
    return Infinity;
  }

  get standing() { return this.cells.some((row) => row.some((h) => h > 0)); }

  // a blast: blocks within r take damage falling off with distance; returns the broken ones' centres
  blast(x, y, r, dmg) {
    const broken = [];
    for (let rr = 0; rr < this.cells.length; rr++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[rr][c] <= 0) continue;
        const cx = this.cellX(c) + FORT_CELL / 2, cy = this.cellY(rr) + FORT_CELL / 2;
        const d = dist(cx, cy, x, y);
        if (d >= r) continue;
        this.cells[rr][c] -= dmg * (1 - d / r);
        if (this.cells[rr][c] <= 0) broken.push({ x: cx, y: cy });
      }
    }
    if (broken.length) this.settle();
    return broken;
  }

  // blocks with nothing beneath them drop down their column
  settle() {
    for (let c = 0; c < this.cols; c++) {
      const col = [];
      for (let r = 0; r < this.cells.length; r++) if (this.cells[r][c] > 0) col.push(this.cells[r][c]);
      for (let r = 0; r < this.cells.length; r++) this.cells[r][c] = col[r] || 0;
    }
  }

  draw(ctx) {
    const s = this.style;
    for (let r = 0; r < this.cells.length; r++) {
      for (let c = 0; c < this.cols; c++) {
        const hp = this.cells[r][c];
        if (hp <= 0) continue;
        const x = this.cellX(c), y = this.cellY(r);
        ctx.fillStyle = (r + c) % 2 ? s.stone : s.light;
        ctx.fillRect(x, y, FORT_CELL, FORT_CELL);
        ctx.fillStyle = s.dark;
        ctx.fillRect(x, y + FORT_CELL - 2, FORT_CELL, 2);
        ctx.fillRect(x + FORT_CELL - 2, y, 2, FORT_CELL);
        if (hp < FORT_HP * 0.6) { // cracks
          ctx.fillRect(x + 3, y + 3, 3, 3);
          if (hp < FORT_HP * 0.3) ctx.fillRect(x + 6, y + 6, 3, 3);
        }
        const above = r + 1 < this.cells.length && this.cells[r + 1][c] > 0;
        if (!above && s.cap) { ctx.fillStyle = s.cap; ctx.fillRect(x, y, FORT_CELL, 3); }
      }
    }
    // a pennant on the tallest standing block
    let best = null;
    for (let c = 0; c < this.cols; c++) for (let r = this.cells.length - 1; r >= 0; r--) if (this.cells[r][c] > 0) { if (!best || r > best.r) best = { r, c }; break; }
    if (best) {
      const x = this.cellX(best.c) + FORT_CELL / 2, y = this.cellY(best.r);
      ctx.fillStyle = '#4a4640';
      ctx.fillRect(x - 1, y - 18, 2, 18);
      ctx.fillStyle = '#b8433a';
      ctx.fillRect(x + 1, y - 18, 8, 5);
    }
  }
}

Object.assign(Game.prototype, {
  placeForts() {
    this.terrain.forts = [];
    const st = this.stage();
    if (!st) return;
    const n = (st >= 5 ? 2 : 1) + (WORLD_W > 3000 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const avoid = this.tanks.map((t) => t.x).concat(this.terrain.forts.map((f) => f.x0 + f.cols * FORT_CELL / 2));
      let x = 0;
      let ok = false;
      for (let k = 0; k < 40 && !ok; k++) {
        x = rng.range(200, WORLD_W - 200);
        ok = avoid.every((a) => Math.abs(a - x) > 220);
      }
      if (ok) this.terrain.forts.push(new Fort(x, this.terrain, this.biome.fort));
    }
  },

  // blasts break fort blocks (stone shrugs off half the damage of a direct blast)
  blastForts(x, y, def) {
    for (const f of this.terrain.forts) {
      const broken = f.blast(x, y, Math.max(24, def.dmgR * 0.6), def.dmg * 0.5 + 40);
      for (const b of broken) {
        for (let i = 0; i < 5; i++) {
          this.particles.add({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4, g: 0.25, drag: 0.98, life: 0.9, size: 3 + Math.random() * 4, color: hexToRgb(f.style.stone) });
        }
      }
    }
  },

  // where a vehicle stands at x: the terrain, a fort's top if one is in the way, or a bridge deck
  // if the vehicle (at fromY) is up on it rather than underneath
  groundAt(x, fromY = -Infinity) {
    let g = this.terrain.hAt(x);
    for (const f of this.terrain.forts) g = Math.min(g, f.topAt(x));
    for (const b of this.terrain.bridges || []) {
      const top = deckTopAt(b, x);
      if (fromY <= top + 6) g = Math.min(g, top);
    }
    return g;
  },

  fortBlocks(x, y) {
    for (const f of this.terrain.forts) if (f.blocks(x - TANK_W / 2, x + TANK_W / 2, y - TANK_H, y - 2)) return true;
    return false;
  },
});
