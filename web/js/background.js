'use strict';
// Scenery, after A3's "Snowy Day" preset and its siblings in biomes.js: a sky, three parallax ridges
// (generated like the terrain, rougher) that scroll slower than the camera, treelines along the
// ridges, and ambient particles blown by the wind (snow, autumn leaves or sand). The near ridge
// carries the same kind of things as the battlefield, in silhouette: a radio tower or two and a power
// line; and on maps with `rail`, an elevated railway (Melbourne's skyrail) that a blue and yellow
// suburban train rocks along every so often.

class Background {
  constructor(biome = BIOMES.snow) {
    this.biome = biome;
    const avg = 0.6 * WORLD_BOTTOM;
    // A3 Environment generates each ridge like the terrain but rougher; the palest one sits
    // highest and hides the dark ones except where their roughness pokes through
    this.layers = biome.layers.map((l) => ({ ...l, height: generateHeights(avg - l.lift, l.rough), trees: biome.ridgeTrees ? this.plantTrees() : [] }));
    this.flakes = [];
    for (let i = 0; i < biome.particles.n; i++) this.flakes.push(this.newFlake(true));
    this.t = 0;
    // (all cosmetic: Math.random, so the match's seeded RNG is untouched)
    const near = this.layers[this.layers.length - 1];
    near.props = { towers: [], poles: [] };
    for (let k = 0, n = 1 + (Math.random() < 0.5 ? 1 : 0); k < n; k++) near.props.towers.push({ x: Math.round(200 + Math.random() * (WORLD_W - 400)), h: 140 + Math.random() * 70 });
    const p0 = 150 + Math.random() * (WORLD_W - 1300);
    for (let k = 0; k < 7; k++) near.props.poles.push(Math.round(p0 + k * 150));
    if (biome.rail) { // on the middle ridge, along the skyline above the battlefield's hills
      const mid = this.layers[Math.max(0, this.layers.length - 2)];
      let top = Infinity;
      for (let x = 0; x < WORLD_W; x++) top = Math.min(top, mid.height[x]);
      mid.rail = { y: Math.round(top - 36), train: null, next: 4 + Math.random() * 6 };
    }
  }

  // stands of box trees along a ridge (the original's dark ridges read as treelines)
  plantTrees() {
    const trees = [];
    for (let x = rng.range(0, 200); x < WORLD_W; x += rng.range(40, 260)) {
      const stand = rng.int(1, 4);
      for (let k = 0; k < stand; k++) trees.push({ x: Math.round(x + k * rng.range(10, 18)), h: rng.int(3, 5) });
    }
    return trees;
  }

  newFlake(anywhere) {
    const p = this.biome.particles;
    const sand = p.kind === 'sand';
    return {
      x: Math.random() * W, y: anywhere ? Math.random() * H : sand ? Math.random() * H : -8,
      s: sand ? 2 : p.kind === 'leaves' ? 3 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3) * 2,
      v: sand ? 4 + Math.random() * 8 : p.kind === 'leaves' ? 12 + Math.random() * 14 : 10 + Math.random() * 25,
      ph: Math.random() * TAU, c: rgb(p.colors[Math.floor(Math.random() * p.colors.length)]),
      k: 0.7 + Math.random() * 0.6, vx: 0, // weight: how fully it takes the wind's speed
    };
  }

  update(dt, wind, cam) {
    // the particles live in the world: when the camera pans, they stay put (scrolling past at the
    // terrain's speed) and wrap around the screen edges so the field stays full
    if (cam && this.lastCam) {
      const dx = (cam.x - this.lastCam.x) * VIEW_SCALE, dy = (cam.y - this.lastCam.y) * VIEW_SCALE;
      if (dx || dy) for (const f of this.flakes) {
        f.x -= dx;
        f.y -= dy;
        if (f.x < -10) f.x += W + 20; else if (f.x > W + 10) f.x -= W + 20;
        if (f.y < -10) f.y += H + 20; else if (f.y > H + 10) f.y -= H + 20;
      }
    }
    if (cam) this.lastCam = { x: cam.x, y: cam.y };
    this.t += dt;
    const rail = (this.layers.find((l) => l.rail) || {}).rail;
    if (rail) { // a train every so often, end to end along the skyrail
      if (!rail.train && (rail.next -= dt) <= 0) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        rail.train = { x: dir > 0 ? -500 : WORLD_W + 500, dir, v: 150 + Math.random() * 50, cars: 6 };
      }
      const tr = rail.train;
      if (tr) {
        tr.x += tr.dir * tr.v * dt;
        if (tr.dir > 0 ? tr.x > WORLD_W + 500 : tr.x < -500) { rail.train = null; rail.next = 18 + Math.random() * 35; }
      }
    }
    const kind = this.biome.particles.kind;
    // ambient particles ride the wind: n is -1..1 (full wind left .. right), each flake has its own
    // weight (f.k) and eases toward the wind speed, and gusts come and go, so a strong wind drives
    // snow nearly sideways and calm air lets it fall
    const n = clamp(wind.x / WIND_FULL, -1, 1);
    const gust = 1 + 0.35 * Math.sin(this.t * 0.7) + 0.15 * Math.sin(this.t * 2.3);
    const top = (kind === 'sand' ? 340 : kind === 'leaves' ? 260 : 200) * gust;
    for (const f of this.flakes) {
      const want = n * top * f.k + Math.sin(this.t * (kind === 'leaves' ? 2 : 1) + f.ph) * (kind === 'leaves' ? 18 : 6);
      f.vx += (want - f.vx) * Math.min(1, dt * 2.5);
      f.y += f.v * (1 - 0.35 * Math.abs(n)) * dt; // a hard wind keeps them aloft longer
      f.x += f.vx * dt;
      if (f.y > H + 8 || f.x < -10 || f.x > W + 10) {
        const vx = f.vx;
        Object.assign(f, this.newFlake(false));
        f.vx = vx;
        // in a wind most flakes come in from the upwind edge
        if (Math.random() < 0.15 + 0.8 * Math.abs(n)) { f.x = n > 0 ? -5 : W + 5; f.y = Math.random() * H; }
      }
    }
  }

  // sky in screen space
  drawSky(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(this.biome.sky[0]));
    g.addColorStop(1, rgb(this.biome.sky[1]));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ridges: called with the world transform; each layer follows the camera by `parallax`
  drawRidges(ctx, cam) {
    const broad = this.biome.tree === 'broadleaf';
    for (const l of this.layers) {
      ctx.fillStyle = l.color;
      const ox = cam.x * (1 - l.parallax);
      fillSteps(ctx, l.height, cam.x, cam.x + (cam.w || VIEW_W), 8, ox, 0);
      if (l.voids && l.voids.length) this.drawLayerVoids(ctx, l, ox); // cut by 15X's Zero Point
      if (l.props || l.rail) this.drawProps(ctx, l, ox, cam);
      ctx.fillStyle = l.color;
      for (const t of l.trees) {
        const tx = t.x + ox;
        if (tx < cam.x - 40 || tx > cam.x + (cam.w || VIEW_W) + 40) continue;
        const base = Math.round(l.height[Math.min(WORLD_W - 1, t.x)]) + 2;
        ctx.fillRect(tx - 2, base - 6, 4, 6);
        if (broad) {
          const w = 10 + t.h * 3;
          ctx.fillRect(tx - w / 2, base - 8 - t.h * 7, w, t.h * 7);
          ctx.fillRect(tx - w / 2 + 3, base - 12 - t.h * 7, w - 6, 4);
          continue;
        }
        for (let i = 0; i < t.h; i++) {
          const w = (t.h - i) * 5 + 2;
          ctx.fillRect(tx - w / 2, base - 6 - (i + 1) * 7, w, 7);
        }
      }
    }
  }

  // the near ridge's furniture: radio towers and a power line in silhouette (a shade darker than the
  // ridge), and the skyrail with its train in colour, softened by the distance
  drawProps(ctx, l, ox, cam) {
    const c = l.color.match(/\d+/g).map(Number);
    const dark = `rgb(${c.map((v) => Math.round(v * 0.72)).join(',')})`;
    const x0 = cam.x - 60, x1 = cam.x + (cam.w || VIEW_W) + 60;
    const hAt = (x) => l.height[clamp(Math.round(x), 0, WORLD_W - 1)];
    ctx.fillStyle = dark;
    for (const t of l.props ? l.props.towers : []) {
      const x = t.x + ox;
      if (x < x0 || x > x1) continue;
      const g = hAt(t.x);
      for (let y = 0; y < t.h; y += 3) { const w = lerp(8, 2, y / t.h); sq(ctx, x - w, g - y, 2); sq(ctx, x + w, g - y, 2); }
      for (let y = 0; y < t.h - 20; y += 20) for (let f = 0; f <= 1; f += 0.2) { const w0 = lerp(8, 2, y / t.h), w1 = lerp(8, 2, (y + 20) / t.h); sq(ctx, lerp(x - w0, x + w1, f), g - y - f * 20, 2); }
      ctx.fillRect(Math.round(x - 1), Math.round(g - t.h - 22), 2, 22);
      ctx.fillStyle = (this.t * 1.5 | 0) % 2 ? '#ff4a3a' : '#7a2a26';
      sq(ctx, x, g - t.h - 24, 4);
      ctx.fillStyle = dark;
    }
    const poles = l.props ? l.props.poles : [];
    for (let i = 0; i < poles.length; i++) {
      const x = poles[i] + ox, g = hAt(poles[i]);
      if (x < x0 - 150 || x > x1 + 150) continue;
      ctx.fillRect(Math.round(x - 1), Math.round(g - 40), 3, 40);
      ctx.fillRect(Math.round(x - 7), Math.round(g - 40), 15, 2);
      if (i + 1 < poles.length) { // sagging wire to the next pole
        const xb = poles[i + 1] + ox, gb = hAt(poles[i + 1]);
        for (let f = 0; f <= 1; f += 0.04) sq(ctx, lerp(x, xb, f), lerp(g - 39, gb - 39, f) + 14 * 4 * f * (1 - f), 1);
      }
    }
    if (l.rail) this.drawRail(ctx, l, ox, x0, x1, hAt, c);
  }

  drawRail(ctx, l, ox, x0, x1, hAt, c) {
    const r = l.rail, y = r.y;
    const haze = (col, k = 0.3) => { const m = col.match(/\d+/g).map(Number); return `rgb(${m.map((v, i) => Math.round(lerp(v, c[i], k))).join(',')})`; };
    // piers down to the ridge, the deck, catenary masts and the wire
    ctx.fillStyle = haze('rgb(176,170,178)', 0.4);
    for (let x = 60; x < WORLD_W; x += 140) {
      const sx = x + ox;
      if (sx < x0 || sx > x1) continue;
      ctx.fillRect(Math.round(sx - 5), y + 8, 10, Math.round(hAt(x) - y - 6));
      ctx.fillRect(Math.round(sx - 9), y + 8, 18, 4); // pier head
    }
    ctx.fillStyle = haze('rgb(200,196,204)', 0.3);
    ctx.fillRect(Math.round(Math.max(x0, ox)), y, Math.round(Math.min(x1, WORLD_W + ox) - Math.max(x0, ox)), 9); // the deck
    ctx.fillStyle = haze('rgb(120,116,126)', 0.3);
    ctx.fillRect(Math.round(Math.max(x0, ox)), y + 6, Math.round(Math.min(x1, WORLD_W + ox) - Math.max(x0, ox)), 3);
    for (let x = 130; x < WORLD_W; x += 140) { // masts and their arms
      const sx = x + ox;
      if (sx < x0 || sx > x1) continue;
      ctx.fillRect(Math.round(sx), y - 30, 2, 30);
      ctx.fillRect(Math.round(sx - 10), y - 30, 12, 2);
    }
    ctx.fillRect(Math.round(Math.max(x0, ox)), y - 27, Math.round(Math.min(x1, WORLD_W + ox) - Math.max(x0, ox)), 1); // the wire
    // the train: six cars, blue with a yellow band and a yellow nose, windows, doors, pantographs up
    const tr = r.train;
    if (!tr) return;
    const L = 66, gap = 3;
    for (let k = 0; k < tr.cars; k++) {
      const cx = tr.x - tr.dir * k * (L + gap) + ox; // its nose end
      const left = tr.dir > 0 ? cx - L : cx;
      if (left > x1 || left + L < x0) continue;
      const rock = Math.round(Math.sin(this.t * 9 + k * 1.7) * 0.8); // it rocks on the track
      const top = y - 20 + rock;
      ctx.fillStyle = haze('rgb(34,84,176)', 0.22); ctx.fillRect(Math.round(left), top, L, 18); // body
      ctx.fillStyle = haze('rgb(242,196,58)', 0.22); ctx.fillRect(Math.round(left), top + 12, L, 4); // the yellow band
      ctx.fillStyle = haze('rgb(214,230,246)', 0.25);
      for (let wx = 6; wx < L - 8; wx += 10) ctx.fillRect(Math.round(left + wx), top + 4, 6, 5); // windows
      ctx.fillStyle = haze('rgb(20,40,90)', 0.22);
      ctx.fillRect(Math.round(left + L * 0.3), top + 2, 2, 14); ctx.fillRect(Math.round(left + L * 0.68), top + 2, 2, 14); // doors
      ctx.fillStyle = haze('rgb(40,40,48)', 0.3); ctx.fillRect(Math.round(left + 4), top + 18, L - 8, 2); // bogies
      if (k === 0 || k === tr.cars - 1) { // a driving cab at each end: the yellow nose and its windscreen
        const end = (k === 0) === (tr.dir > 0) ? left + L - 8 : left;
        ctx.fillStyle = haze('rgb(242,196,58)', 0.22); ctx.fillRect(Math.round(end), top, 8, 18);
        ctx.fillStyle = haze('rgb(30,40,60)', 0.22); ctx.fillRect(Math.round(end + 1), top + 3, 6, 5);
      }
      if (k === 1 || k === 4) { // pantographs to the wire
        ctx.fillStyle = haze('rgb(60,60,68)', 0.3);
        for (let f = 0; f <= 1; f += 0.2) sq(ctx, left + L / 2 - 6 + f * 6, top - f * 6, 1);
        ctx.fillRect(Math.round(left + L / 2 - 6), y - 27, 12, 1);
      }
    }
  }

  // where a ridge was cut through (the Naito MAIA's strike): the same darkness as in the ground's
  // void, welling up from below the lips, and black cut faces either side
  drawLayerVoids(ctx, l, ox) {
    for (const [a, b] of l.voids) {
      const la = l.height[Math.max(0, a - 1)], lb = l.height[Math.min(WORLD_W - 1, b + 1)];
      const top = Math.min(la < WORLD_BOTTOM ? la : WORLD_BOTTOM, lb < WORLD_BOTTOM ? lb : WORLD_BOTTOM);
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = `rgba(6,4,10,${Math.min(1, 0.3 + i * 0.05)})`;
        ctx.fillRect(a + ox, Math.round(top + 40 + i * 15), b - a + 1, i === 15 ? VOID_Y : 15);
      }
      for (const [x, y, dir] of [[a, la, -1], [b, lb, 1]]) {
        if (y >= WORLD_BOTTOM) continue;
        drawMoltenFace(ctx, x + ox, y, dir, 30, 0.6); // dimmer, further off
      }
    }
  }

  // ambient particles (screen pixels)
  drawSnow(ctx) {
    const sand = this.biome.particles.kind === 'sand';
    for (const f of this.flakes) {
      ctx.fillStyle = f.c;
      if (sand) ctx.fillRect(Math.round(f.x), Math.round(f.y), 6, 2); // streaks of blown sand
      else sq(ctx, f.x, f.y, f.s);
    }
  }
}
