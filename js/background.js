'use strict';
// Scenery, after A3's "Snowy Day" preset and its siblings in biomes.js: a sky, three parallax ridges
// (generated like the terrain, rougher) that scroll slower than the camera, treelines along the
// ridges, and ambient particles blown by the wind (snow, autumn leaves or sand). The near ridge
// carries the same kind of things as the battlefield, in silhouette: a radio tower or two and a power
// line; and on maps with `rail`, an elevated railway (Melbourne's skyrail) that a silver suburban
// train in Metro's blue and yellow trim rocks along every so often.

const BG_STATIC = 1, BG_LIVE = 2; // the two passes over a ridge: into its cached strip, and each frame

class Background {
  constructor(biome = BIOMES.snow) {
    this.biome = biome;
    const avg = 0.6 * WORLD_BOTTOM;
    // A3 Environment generates each ridge like the terrain but rougher; the palest one sits
    // highest and hides the dark ones except where their roughness pokes through
    this.layers = biome.layers.map((l) => ({ ...l, height: generateHeights(avg - l.lift, l.rough), trees: biome.ridgeTrees ? this.plantTrees() : [] }));
    for (const l of this.layers) if (l.blocks) this.buildBlocks(l); // skylines: stilt-rows, halls, ruins
    this.flakes = [];
    for (let i = 0; i < biome.particles.n; i++) this.flakes.push(this.newFlake(true));
    this.t = 0;
    // (all cosmetic: Math.random, so the match's seeded RNG is untouched)
    const near = this.layers[this.layers.length - 1];
    near.props = { towers: [], poles: [] };
    if (biome.props === 'roots') near.props.towers.length = 0; // (none of that down here: see drawRoots)
    if (biome.props !== 'roots') for (let k = 0, n = 1 + (Math.random() < 0.5 ? 1 : 0); k < n; k++) near.props.towers.push({ x: Math.round(200 + Math.random() * (WORLD_W - 400)), h: 140 + Math.random() * 70 });
    const p0 = 150 + Math.random() * (WORLD_W - 1300);
    if (biome.props !== 'roots') for (let k = 0; k < 7; k++) near.props.poles.push(Math.round(p0 + k * 150));
    near.props.spots = []; // the map's own furniture along the near ridge (drawSpots)
    for (let x = 120 + Math.random() * 200; x < WORLD_W - 100; x += 260 + Math.random() * 380) near.props.spots.push({ x: Math.round(x), k: Math.floor(Math.random() * 3), s: Math.random() });
    if (biome.rail) { // on the middle ridge, along the skyline above the battlefield's hills
      const mid = this.layers[Math.max(0, this.layers.length - 2)];
      let top = Infinity;
      for (let x = 0; x < WORLD_W; x++) top = Math.min(top, mid.height[x]);
      mid.rail = { y: Math.round(top - 36), train: null, next: 4 + Math.random() * 6 };
    }
  }

  // turn a ridge into a skyline: runs of flat-topped blocks standing on it (each the ridge's
  // highest point under it, plus a storey count), remembered so windows and lights can be drawn
  buildBlocks(l) {
    const [w0, w1] = l.blocks;
    l.bldg = [];
    for (let x = 0; x < WORLD_W;) {
      const w = Math.round(w0 + Math.random() * (w1 - w0));
      let top = Infinity;
      for (let i = x; i < Math.min(WORLD_W, x + w); i++) top = Math.min(top, l.height[i]);
      const h = Math.round(top - (l.ruins ? 30 + Math.random() * 160 : 40 + Math.random() * 120));
      const gap = l.ruins && Math.random() < 0.3 ? Math.round(w * 0.6) : 0; // ruins: broken, with gaps
      for (let i = x; i < Math.min(WORLD_W, x + w - gap); i++) l.height[i] = h;
      l.bldg.push({ x, w: w - gap, top: h, seed: Math.random() * 1000 });
      x += w + (Math.random() < 0.25 ? Math.round(Math.random() * 30) : 0);
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
    const p = this.particleOverride || this.biome.particles;
    const sand = p.kind === 'sand';
    const rising = p.kind === 'steam' || p.kind === 'motes'; // the deck's steam and the roots' warm motes go up
    return {
      x: Math.random() * W, y: anywhere ? Math.random() * H : sand ? Math.random() * H : rising ? H + 8 : -8,
      s: sand ? 2 : p.kind === 'leaves' ? 3 + Math.floor(Math.random() * 2) : p.kind === 'steam' ? 4 + Math.floor(Math.random() * 2) * 2 : p.kind === 'motes' ? 2 : 2 + Math.floor(Math.random() * 3) * 2,
      v: sand ? 4 + Math.random() * 8 : p.kind === 'leaves' ? 12 + Math.random() * 14 : rising ? -(8 + Math.random() * 16) : 10 + Math.random() * 25,
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
    const kind = (this.particleOverride || this.biome.particles).kind;
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
      if (f.y > H + 8 || f.y < -12 || f.x < -10 || f.x > W + 10) {
        const vx = f.vx;
        Object.assign(f, this.newFlake(false));
        f.vx = vx;
        // in a wind most flakes come in from the upwind edge
        if (Math.random() < 0.15 + 0.8 * Math.abs(n)) { f.x = n > 0 ? -5 : W + 5; f.y = Math.random() * H; }
      }
    }
  }

  // sky in screen space
  // the Warm Meadows' AHU is gone: the snow comes in as the old particles blow away (cover.js)
  letItSnow() {
    this.particleOverride = BIOMES.snow.particles;
    for (let i = this.flakes.length; i < BIOMES.snow.particles.n; i++) this.flakes.push(this.newFlake(true));
  }

  drawSky(ctx, cam) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const cold = this.cold || 0, cs = [[176, 186, 210], [214, 220, 234]]; // the sky goes grey-blue as the warmth leaves
    g.addColorStop(0, rgb(this.biome.sky[0].map((v, i) => lerp(v, cs[0][i], cold))));
    g.addColorStop(1, rgb(this.biome.sky[1].map((v, i) => lerp(v, cs[1][i], cold))));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const art = this.biome.skyArt;
    if (art) this.drawSkyArt(ctx, art, cam ? cam.x * 0.02 : 0);
  }

  // The exo-surface ring as seen from the ground, far off: a long, shallow arc, mostly grey and
  // fogged by distance. Its band is built of blocks that jut in and out, top and bottom, and it runs
  // in sections, each for its own equipment: city (about half of it: lights packed in, with dark
  // closed windows between), radio (a thicket of masts up and down, beacons on their tips),
  // connectors (little but truss between two rails) and industrial (tanks and blocks on top, towers
  // hanging below). Pre-rendered once into an offscreen canvas; only the beacons blink live.
  drawRing(ctx, ox, opt) {
    const k = ctx.getTransform().a || 1;
    const PAD = 160, RW = W + PAD * 2, RH = Math.round(H * 0.7);
    const R = H * 7, apex = H * 0.17, cx = RW * 0.55, cy = apex + R;
    const yAt = (x) => cy - Math.sqrt(Math.max(0, R * R - (x - cx) * (x - cx))); // the band's centre line
    const key = `${W}|${H}|${k}`;
    if (!this.ringCache || this.ringKey !== key) {
      this.ringKey = key;
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(RW * k); cv.height = Math.ceil(RH * k);
      const c = cv.getContext('2d');
      c.scale(k, k);
      const tone = Array.isArray(opt) ? opt : [150, 154, 170];
      const sky = this.biome.sky[0];
      const grey = (f, a = 0.9) => `rgba(${tone.map((v, i) => Math.round(lerp(clamp(v * f, 0, 255), sky[i], 0.42))).join(',')},${a})`; // fogged toward the sky
      const lights = [];
      const box = (x, y, w, h, f) => { c.fillStyle = grey(f); c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
      // a stepped tower (dir -1 up, +1 down) from the band's edge at (x, y)
      const tower = (x, y, h, w, dir, f) => {
        let ww = w, yy = y;
        for (let seg = 0; seg < 4 && h > 2; seg++) {
          const sh = Math.max(2, Math.round(h * 0.35));
          box(x - ww / 2, dir < 0 ? yy - sh : yy, ww, sh, f);
          yy += dir * sh; h -= sh; ww = Math.max(1, Math.round(ww * 0.62));
        }
        box(x - 0.5, dir < 0 ? yy - 6 : yy, 1, 6, f * 0.9); // its mast
        lights.push({ x, y: dir < 0 ? yy - 7 : yy + 6, ph: hash2(Math.round(x), 61) * 6.28, red: hash2(Math.round(x), 62) > 0.35 });
      };
      // the far side of the ring behind it: one darker silhouette, no texture, just big blocks and
      // towers jutting in and out, sitting a little higher so it shows round the near side
      const back = (f) => `rgba(${tone.map((v, i) => Math.round(lerp(v * f, sky[i], 0.3))).join(',')},0.95)`;
      c.fillStyle = back(0.62);
      for (let bx = 0; bx < RW;) {
        const bw = 8 + Math.round(hash2(bx, 131) * 26);
        const up = Math.round((hash2(bx, 132) - 0.3) * 30), dn = Math.round((hash2(bx, 133) - 0.5) * 16);
        for (let xx = bx; xx < Math.min(RW, bx + bw); xx += 3) {
          const y = yAt(xx) - 14;
          c.fillRect(xx, Math.round(y - 22 - up), 3, Math.round(44 + up + dn));
        }
        if (hash2(bx, 134) > 0.72) { // a tower block on its back
          const th = 12 + Math.round(hash2(bx, 135) * 34), tw = Math.max(4, Math.round(bw * 0.4));
          c.fillRect(Math.round(bx + bw / 2 - tw / 2), Math.round(yAt(bx) - 36 - up - th), tw, th + 2);
          c.fillRect(Math.round(bx + bw / 2 - 1), Math.round(yAt(bx) - 36 - up - th - 8), 2, 8);
        }
        bx += bw;
      }
      const BAND = 30; // nominal thickness
      let x = 0, sec = 0;
      while (x < RW) {
        const r = hash2(sec, 51);
        const kind = r < 0.5 ? 'city' : r < 0.66 ? 'radio' : r < 0.84 ? 'connector' : 'industrial';
        const len = kind === 'connector' ? 60 + Math.round(hash2(sec, 52) * 60) : 110 + Math.round(hash2(sec, 53) * 120);
        const x1 = Math.min(RW, x + len);
        if (kind === 'connector') { // two rails and the truss between them
          for (let xx = x; xx < x1; xx += 2) { const y = yAt(xx); box(xx, y - 10, 2, 3, 0.8); box(xx, y + 8, 2, 3, 0.75); }
          for (let xx = x; xx < x1 - 12; xx += 12) {
            const y = yAt(xx);
            box(xx, y - 8, 1, 17, 0.7);
            for (let f = 0; f <= 1; f += 0.1) { box(xx + f * 12, y - 8 + f * 16, 1, 1, 0.7); box(xx + f * 12, y + 8 - f * 16, 1, 1, 0.7); }
          }
        } else {
          // the band: blocks 6-22 wide, each jutting up or down a little from its neighbours
          let bx = x, m = 0;
          while (bx < x1) {
            const bw = Math.min(x1 - bx, 6 + Math.round(hash2(bx, sec + 3) * 16));
            const up = Math.round((hash2(bx, 71) - 0.5) * 12), dn = Math.round((hash2(bx, 72) - 0.5) * 12);
            const f = 0.82 + 0.22 * hash2(bx, 73);
            for (let xx = bx; xx < bx + bw; xx += 3) {
              const y = yAt(xx), top = y - BAND / 2 - up, bot = y + BAND / 2 + dn;
              box(xx, top, 3, bot - top, f);
              box(xx, top, 3, 1, f * 1.18); // the lit top
              if (kind === 'city') { // a billion lights, some windows dark
                for (let wy = top + 3; wy < bot - 2; wy += 3) {
                  const h = hash2(xx * 7 + m, Math.round(wy));
                  if (h < 0.45) continue;
                  c.fillStyle = h > 0.93 ? 'rgba(255,200,130,0.95)' : h > 0.7 ? 'rgba(236,242,255,0.9)' : 'rgba(255,226,170,0.75)';
                  c.fillRect(Math.round(xx + (h * 10 % 3)), Math.round(wy), 1, 1);
                }
              }
            }
            box(bx + bw - 1, yAt(bx + bw) - BAND / 2 - up, 1, BAND + up + dn, f * 0.7); // the seam to the next block
            bx += bw; m++;
          }
          // what stands on it
          if (kind === 'radio') for (let tx = x + 6; tx < x1 - 4; tx += 8 + Math.round(hash2(tx, 81) * 10)) {
            const y = yAt(tx);
            tower(tx, y - BAND / 2 - 4, 10 + hash2(tx, 82) * 30, 4, -1, 0.8);
            if (hash2(tx, 83) > 0.4) tower(tx + 3, y + BAND / 2 + 4, 8 + hash2(tx, 84) * 22, 4, 1, 0.75);
          }
          if (kind === 'industrial') {
            for (let tx = x + 10; tx < x1 - 16; tx += 22 + Math.round(hash2(tx, 91) * 16)) {
              const y = yAt(tx);
              box(tx, y - BAND / 2 - 12, 14, 12, 0.9); box(tx + 2, y - BAND / 2 - 15, 10, 3, 1); // tanks on top
              if (hash2(tx, 92) > 0.5) tower(tx + 7, y + BAND / 2 + 4, 16 + hash2(tx, 93) * 34, 8, 1, 0.75);
            }
          }
          if (kind === 'city') for (let tx = x + 20; tx < x1 - 20; tx += 40 + Math.round(hash2(tx, 95) * 50)) { // spires over the city, and its roots under it
            const y = yAt(tx);
            tower(tx, y - BAND / 2 - 4, 18 + hash2(tx, 96) * 40, 10, -1, 0.85);
            if (hash2(tx, 97) > 0.5) tower(tx + 8, y + BAND / 2 + 4, 14 + hash2(tx, 98) * 36, 9, 1, 0.75);
          }
        }
        x = x1; sec++;
      }
      this.ringCache = cv;
      this.ringLights = lights;
    }
    ctx.drawImage(this.ringCache, -PAD - ox, 0, RW, RH);
    for (const L of this.ringLights) { // beacons on the towers, each on its own beat
      if (Math.sin(this.t * 2.2 + L.ph) < 0.55) continue;
      ctx.fillStyle = L.red ? 'rgba(255,90,80,0.9)' : 'rgba(235,240,255,0.9)';
      ctx.fillRect(Math.round(L.x - PAD - ox), Math.round(L.y), 2, 2);
    }
  }

  // screen space, behind everything: stars, a dim M-dwarf, the exo-surface ring across the sky,
  // the ring's underside overhead (the roots) or the stilt-cities' undersides (the ground)
  drawSkyArt(ctx, art, ox) {
    if (art.stars) for (let i = 0; i < art.stars; i++) {
      const tw = 0.5 + 0.5 * Math.sin(this.t * (1 + hash2(i, 3) * 2) + i);
      ctx.fillStyle = `rgba(230,230,255,${(0.25 + 0.5 * tw * hash2(i, 4)).toFixed(2)})`;
      ctx.fillRect(Math.round(((hash2(i, 1) * W - ox) % W + W) % W), Math.round(hash2(i, 2) * H * 0.6), hash2(i, 5) > 0.9 ? 2 : 1, hash2(i, 5) > 0.9 ? 2 : 1);
    }
    if (art.sun) { // the M-dwarf the paperwork calls the sun: small, steady, and not warm
      const [fx, fy, r, c] = art.sun, x = fx * W - ox, y = fy * H;
      for (let k = 4; k >= 1; k--) { ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(0.06 * (5 - k)).toFixed(2)})`; sq(ctx, x, y, r * 2 + k * 10); }
      ctx.fillStyle = rgb(c); sq(ctx, x, y, r * 2);
      ctx.fillStyle = 'rgb(255,200,170)'; sq(ctx, x, y, r);
    }
    if (art.ring) this.drawRing(ctx, ox, art.ring);
    if (art.ceiling) { // the ring's underside: trusses, hangers and work lights in the dark above
      ctx.fillStyle = 'rgb(16,14,16)'; ctx.fillRect(0, 0, W, Math.round(H * 0.16));
      ctx.fillStyle = 'rgb(30,26,26)';
      for (let x = -((ox * 20) % 64); x < W; x += 64) { ctx.fillRect(Math.round(x), 0, 6, Math.round(H * 0.2)); }
      ctx.fillRect(0, Math.round(H * 0.16), W, 5);
      for (let x = -((ox * 20) % 128) + 30; x < W; x += 128) { // a hanger and its lamp
        ctx.fillStyle = 'rgb(30,26,26)'; ctx.fillRect(Math.round(x), Math.round(H * 0.16), 2, 30);
        const on = hash2(Math.round(x + ox * 20), 9) > 0.25;
        ctx.fillStyle = on ? 'rgba(255,190,110,0.9)' : 'rgb(50,44,40)'; ctx.fillRect(Math.round(x - 3), Math.round(H * 0.16) + 30, 8, 3);
        if (on) for (let k = 0; k < 6; k++) { // its light: a soft cone, fading as it widens
          ctx.fillStyle = `rgba(255,170,90,${(0.07 - k * 0.01).toFixed(3)})`;
          ctx.fillRect(Math.round(x - 4 - k * 7), Math.round(H * 0.16) + 33 + k * 14, 10 + k * 14, 14);
        }
      }
    }
    if (art.underside) { // the stilt-cities overhead: a dark, ragged mass of decks, lit windows, heat glow
      const g = ctx.createLinearGradient(0, H * 0.12, 0, H * 0.4);
      g.addColorStop(0, 'rgba(255,150,80,0.22)'); g.addColorStop(1, 'rgba(255,150,80,0)');
      ctx.fillStyle = g; ctx.fillRect(0, Math.round(H * 0.12), W, Math.round(H * 0.3));
      // the mass itself, pre-rendered 16 columns to a chunk (screen space, scrolling at 30x ox)
      const sx = ox * 30, CW = 40 * 16;
      for (let n = Math.floor(sx / CW); n * CW - sx < W; n++) ctx.drawImage(this.undersideChunk(n), Math.round(n * CW - sx), 0);
    }
  }

  undersideChunk(n) {
    const m = this.undersideChunks || (this.undersideChunks = new Map());
    let c = m.get(n);
    if (c) return c;
    if (m.size > 24) m.delete(m.keys().next().value); // (the oldest)
    c = document.createElement('canvas');
    c.width = 40 * 16 + 1;
    c.height = Math.ceil(H * 0.16) + 1;
    const g = c.getContext('2d');
    for (let i = 0; i < 16; i++) {
      const k = n * 16 + i, x = i * 40;
      const d = Math.round(H * (0.08 + 0.08 * hash2(k, 21)));
      g.fillStyle = 'rgb(38,36,44)'; g.fillRect(x, 0, 41, d);
      g.fillStyle = 'rgb(56,52,60)'; g.fillRect(x, d - 4, 41, 4);
      for (let wy = 8; wy < d - 8; wy += 9) for (let wx = 4; wx < 36; wx += 8) {
        if (hash2(k * 7 + wx, wy) > 0.3) continue;
        g.fillStyle = hash2(k, wy + wx) > 0.5 ? 'rgb(255,196,120)' : 'rgb(255,160,90)';
        g.fillRect(x + wx, wy, 3, 3);
      }
    }
    m.set(n, c);
    return c;
  }

  // ridges: called with the world transform; each layer follows the camera by `parallax`. Each is
  // pre-rendered once (silhouette, skyline, props, trees: everything that holds still) into a strip
  // the map's width, so a frame is one image per layer plus the few things that move or blink
  drawRidges(ctx, cam) {
    const x0 = cam.x, x1 = cam.x + (cam.w || VIEW_W);
    for (const l of this.layers) {
      const ox = cam.x * (1 - l.parallax);
      const rc = this.ridgeCache(l);
      if (rc) {
        const a = clamp(Math.floor(x0 - ox), 0, rc.c.width), b = clamp(Math.ceil(x1 - ox) + 1, 0, rc.c.width);
        if (b > a) {
          ctx.drawImage(rc.c, a, 0, b - a, rc.c.height, a + ox, rc.top, b - a, rc.c.height);
          // below the strip the ridge is solid (bar where Zero Point cut it)
          ctx.fillStyle = l.color;
          const y = rc.top + rc.c.height, h = WORLD_BOTTOM + 1200 - y;
          let from = a;
          for (const [va, vb] of [...(l.voids || [])].sort((p, q) => p[0] - q[0]).concat([[Infinity, Infinity]])) {
            const to = Math.min(b, va);
            if (to > from) ctx.fillRect(from + ox, y, to - from, h);
            from = Math.max(from, vb + 1);
          }
        }
      } else {
        ctx.fillStyle = l.color;
        fillSteps(ctx, l.height, x0, x1, 8, ox, 0);
      }
      if (l.voids && l.voids.length) this.drawLayerVoids(ctx, l, ox); // cut by 15X's Zero Point
      this.drawLayerBits(ctx, l, ox, cam, rc ? BG_LIVE : BG_STATIC | BG_LIVE);
    }
  }

  dispose() {
    for (const l of this.layers) if (l.cache) { l.cache.c.width = l.cache.c.height = 0; l.cache = null; }
    if (this.undersideChunks) this.undersideChunks.clear();
    if (this.ringCache) { this.ringCache.width = this.ringCache.height = 0; this.ringCache = null; }
  }

  // a layer's cached strip; while Zero Point is cutting it the layer is drawn live, and cached again
  // once the cut has held still a moment
  ridgeCache(l) {
    const key = (l.voids || []).map((v) => v.join('-')).join(',');
    if (l.cache && l.cache.key === key) return l.cache;
    if (l.cacheWant !== key) { l.cacheWant = key; l.cacheWait = 20; l.cache = null; }
    if (key && l.cacheWait-- > 0) return null;
    let top = Infinity, bot = -Infinity;
    for (const h of l.height) if (h < VOID_Y) { top = Math.min(top, h); bot = Math.max(bot, h); }
    if (top > bot) top = bot = 0;
    top = Math.floor(top - 260); // up to the tower tips, masts and the skyrail's wire
    bot = Math.ceil(bot + 240); // down past the lowest windows and rack lights
    const c = document.createElement('canvas');
    c.width = WORLD_W + 16;
    c.height = bot - top;
    const g = c.getContext('2d');
    g.translate(0, -top);
    g.fillStyle = l.color;
    fillSteps(g, l.height, 0, WORLD_W + 16, 8, 0, 0);
    this.drawLayerBits(g, l, 0, { x: -200, y: top, w: WORLD_W + 400 }, BG_STATIC);
    l.cache = { c, top, key };
    return l.cache;
  }

  // what stands on a ridge, in two passes: BG_STATIC (into the cache) and BG_LIVE (each frame)
  drawLayerBits(ctx, l, ox, cam, pass) {
    if (l.bldg || l.stilts) this.drawLayerArt(ctx, l, ox, cam, pass);
    if (l.props || l.rail) this.drawProps(ctx, l, ox, cam, pass);
    if (!(pass & BG_STATIC)) return;
    const broad = this.biome.tree === 'broadleaf';
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

  // what stands on a ridge: lit windows in the stilt-rows, rack lights in the datacentre halls,
  // ruins' broken tops, or (under the stilt-cities) the stilts themselves, up out of sight
  drawLayerArt(ctx, l, ox, cam, pass) {
    const x0 = cam.x - 60, x1 = cam.x + (cam.w || VIEW_W) + 60;
    const c = l.color.match(/\d+/g).map(Number);
    const still = pass & BG_STATIC, live = pass & BG_LIVE;
    if (l.bldg) for (const b of l.bldg) {
      const sx = b.x + ox;
      if (sx + b.w < x0 || sx > x1) continue;
      if (l.windows) { // warm windows; the heat goes where the exchangers send it
        const [r, g2, bl] = l.windows;
        if (still) for (let y = b.top + 8; y < b.top + 200; y += 12) for (let x = 6; x < b.w - 6; x += 10) {
          const h = hash2(b.x + x, y - b.top);
          if (h > 0.42) continue;
          ctx.fillStyle = `rgba(${r},${g2},${bl},${(0.45 + h).toFixed(2)})`;
          ctx.fillRect(Math.round(sx + x), Math.round(y), 4, 5);
        }
        if (b.w > 60 && hash2(b.x, 3) > 0.6) { // a relay mast
          if (still) { ctx.fillStyle = `rgb(${c.map((v) => v - 10).join(',')})`; ctx.fillRect(Math.round(sx + b.w / 2), Math.round(b.top - 24), 2, 24); }
          if (live) { ctx.fillStyle = (this.t * 2 + b.seed | 0) % 2 ? '#ff4a3a' : '#5a2020'; ctx.fillRect(Math.round(sx + b.w / 2 - 1), Math.round(b.top - 27), 4, 4); }
        }
      }
      if (l.racks) { // a datacentre hall: rows of status lights; some halls de-listed and dark, but drawing load
        // most lights hold steady (cached); about one in three blinks, and every light in a dead hall
        const dead = hash2(b.x, 11) > 0.6;
        if (still && !dead) for (let y = b.top + 10; y < b.top + 220; y += 10) for (let x = 4; x < b.w - 4; x += 6) {
          const h = hash2(b.x + x, y - b.top);
          if (h > 0.5 || h < 0.15) continue;
          ctx.fillStyle = h > 0.4 ? 'rgba(255,190,90,0.9)' : 'rgba(110,240,200,0.85)';
          ctx.fillRect(Math.round(sx + x), Math.round(y), 2, 2);
        }
        if (live) {
          if (!b.blink) { // [x, y, h] of each blinking light, found once
            b.blink = [];
            for (let y = b.top + 10; y < b.top + 220; y += 10) for (let x = 4; x < b.w - 4; x += 6) {
              const h = hash2(b.x + x, y - b.top);
              if (h < (dead ? 0.5 : 0.15)) b.blink.push(x, y, h);
            }
          }
          for (let i = 0; i < b.blink.length; i += 3) {
            const h = b.blink[i + 2];
            if (Math.sin(this.t * (2 + h * 6) + h * 50) <= (dead ? 0.85 : -0.2)) continue;
            ctx.fillStyle = dead ? 'rgba(255,90,70,0.8)' : h > 0.4 ? 'rgba(255,190,90,0.9)' : 'rgba(110,240,200,0.85)';
            ctx.fillRect(Math.round(sx + b.blink[i]), Math.round(b.blink[i + 1]), 2, 2);
          }
        }
      }
      if (l.ruins && still) { // older than anyone's records: stepped crowns and a dark doorway
        ctx.fillStyle = `rgb(${c.join(',')})`;
        ctx.fillRect(Math.round(sx + b.w * 0.2), Math.round(b.top - 14), Math.round(b.w * 0.6), 14);
        ctx.fillRect(Math.round(sx + b.w * 0.38), Math.round(b.top - 26), Math.round(b.w * 0.24), 12);
        ctx.fillStyle = `rgb(${c.map((v) => v - 18).join(',')})`;
        ctx.fillRect(Math.round(sx + b.w * 0.4), Math.round(b.top + 30), Math.round(b.w * 0.2), 50);
        if (hash2(b.x, 13) > 0.7) { ctx.fillStyle = 'rgba(120,200,255,0.35)'; ctx.fillRect(Math.round(sx + b.w * 0.47), Math.round(b.top + 12), 4, 4); } // something still lit inside
      }
    }
    if (l.stilts && live) { // the stilt-cities' legs: drilled into bedrock, braced, rising out of sight (live: they reach the top of the view)
      const [s0, s1] = l.stilts;
      const w = l.parallax > 0.7 ? 18 : l.parallax > 0.55 ? 11 : 6;
      const top = cam.y - 40;
      const dark = `rgb(${c.map((v) => Math.round(v * 0.8)).join(',')})`;
      for (let x = 40, k = 0; x < WORLD_W; x += s0 + Math.round(hash2(k, 31) * (s1 - s0)), k++) {
        const sx = x + ox;
        if (sx < x0 - 20 || sx > x1 + 20) continue;
        const g = l.height[clamp(x, 0, WORLD_W - 1)];
        ctx.fillStyle = dark;
        ctx.fillRect(Math.round(sx - w / 2), Math.round(top), w, Math.round(g - top + 4));
        ctx.fillRect(Math.round(sx - w), Math.round(g - 6), w * 2, 8); // its footing
        for (let y = g - 120; y > top; y -= 120) ctx.fillRect(Math.round(sx - w / 2 - 3), Math.round(y), w + 6, 3); // bracing collars
        if (hash2(k, 8) > 0.6) { ctx.fillStyle = 'rgba(255,170,90,0.5)'; ctx.fillRect(Math.round(sx - 1), Math.round(top), 2, Math.round(g - top)); } // a heat riser up its side
      }
    }
  }

  // the near ridge's furniture: radio towers and a power line in silhouette (a shade darker than the
  // ridge), and the skyrail with its train in colour, softened by the distance
  drawProps(ctx, l, ox, cam, pass) {
    const c = l.color.match(/\d+/g).map(Number);
    const dark = `rgb(${c.map((v) => Math.round(v * 0.72)).join(',')})`;
    const x0 = cam.x - 60, x1 = cam.x + (cam.w || VIEW_W) + 60;
    const hAt = (x) => l.height[clamp(Math.round(x), 0, WORLD_W - 1)];
    for (const t of l.props ? l.props.towers : []) {
      const x = t.x + ox;
      if (x < x0 || x > x1) continue;
      const g = hAt(t.x);
      if (pass & BG_STATIC) {
        ctx.fillStyle = dark;
        for (let y = 0; y < t.h; y += 3) { const w = lerp(8, 2, y / t.h); sq(ctx, x - w, g - y, 2); sq(ctx, x + w, g - y, 2); }
        for (let y = 0; y < t.h - 20; y += 20) for (let f = 0; f <= 1; f += 0.2) { const w0 = lerp(8, 2, y / t.h), w1 = lerp(8, 2, (y + 20) / t.h); sq(ctx, lerp(x - w0, x + w1, f), g - y - f * 20, 2); }
        ctx.fillRect(Math.round(x - 1), Math.round(g - t.h - 22), 2, 22);
      }
      if (pass & BG_LIVE) {
        ctx.fillStyle = (this.t * 1.5 | 0) % 2 ? '#ff4a3a' : '#7a2a26';
        sq(ctx, x, g - t.h - 24, 4);
      }
    }
    const poles = l.props ? l.props.poles : [];
    if (pass & BG_STATIC) for (let i = 0; i < poles.length; i++) {
      const x = poles[i] + ox, g = hAt(poles[i]);
      if (x < x0 - 150 || x > x1 + 150) continue;
      ctx.fillStyle = dark;
      ctx.fillRect(Math.round(x - 1), Math.round(g - 40), 3, 40);
      ctx.fillRect(Math.round(x - 7), Math.round(g - 40), 15, 2);
      if (i + 1 < poles.length) { // sagging wire to the next pole
        const xb = poles[i + 1] + ox, gb = hAt(poles[i + 1]);
        for (let f = 0; f <= 1; f += 0.04) sq(ctx, lerp(x, xb, f), lerp(g - 39, gb - 39, f) + 14 * 4 * f * (1 - f), 1);
      }
    }
    if (l.props && l.props.spots && this.biome.props) this.drawSpots(ctx, l, ox, x0, x1, hAt, c, dark, cam, pass);
    if (l.rail) this.drawRail(ctx, l, ox, x0, x1, hAt, c, pass);
  }

  // per map: the deck's radiator fields, exchangers and heat main; the roots' risers, ground mains
  // and AHUs; the range's bunkers and target frames
  drawSpots(ctx, l, ox, x0, x1, hAt, c, dark, cam, pass) {
    const kind = this.biome.props;
    const still = pass & BG_STATIC, live = pass & BG_LIVE;
    if (kind === 'deck' && still) { // the heat main along the ridge, from exchanger to exchanger
      ctx.fillStyle = dark;
      for (let x = Math.max(0, Math.floor((x0 - ox) / 6) * 6); x < Math.min(WORLD_W, x1 - ox); x += 6) ctx.fillRect(Math.round(x + ox), Math.round(hAt(x) - 22), 6, 8);
      ctx.fillStyle = 'rgba(255,150,80,0.35)';
      for (let x = Math.max(0, Math.floor((x0 - ox) / 6) * 6); x < Math.min(WORLD_W, x1 - ox); x += 6) ctx.fillRect(Math.round(x + ox), Math.round(hAt(x) - 22), 6, 1);
    }
    for (const s of l.props.spots) {
      const sx = s.x + ox;
      if (sx < x0 - 120 || sx > x1 + 120) continue;
      const g = hAt(s.x);
      if (kind === 'deck') {
        if (!still) continue;
        if (s.k === 0) { // a radiator field: rows of fins shedding the deck's heat into the sky
          for (let i = 0; i < 9; i++) { ctx.fillStyle = dark; ctx.fillRect(Math.round(sx + i * 9), Math.round(g - 46), 4, 46); ctx.fillStyle = 'rgba(255,140,90,0.25)'; ctx.fillRect(Math.round(sx + i * 9), Math.round(g - 46), 4, 3); }
        } else { // an exchanger: HX-n, a squat drum with its pipes
          ctx.fillStyle = dark; ctx.fillRect(Math.round(sx), Math.round(g - 54), 44, 54); ctx.fillRect(Math.round(sx - 6), Math.round(g - 30), 56, 8);
          ctx.fillStyle = 'rgba(255,170,90,0.7)'; ctx.fillRect(Math.round(sx + 6), Math.round(g - 46), 32, 2);
          ctx.fillStyle = 'rgba(230,226,240,0.8)'; ctx.font = `9px ${HUD_FONT}`; ctx.textAlign = 'left'; ctx.fillText(`HX-${1 + Math.floor(s.s * 12)}`, Math.round(sx + 8), Math.round(g - 34));
        }
      } else if (kind === 'roots') {
        if (s.k === 2) { // a ground main: a fat pipe on saddles, running along the ridge
          if (!still) continue;
          ctx.fillStyle = dark;
          ctx.fillRect(Math.round(sx - 40), Math.round(g - 30), 200, 18);
          for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(sx - 30 + i * 55), Math.round(g - 14), 8, 14);
          ctx.fillStyle = `rgb(${c.map((v) => v + 20).join(',')})`; ctx.fillRect(Math.round(sx - 40), Math.round(g - 30), 200, 3);
          continue;
        }
        if (!live) continue; // (risers reach up out of the strip, and the AHUs breathe: both live)
        if (s.k === 0) { // a riser: a shaft up into the dark, with its cage ladder (rungs only where seen)
          ctx.fillStyle = dark; ctx.fillRect(Math.round(sx), Math.round(g - 2000), 26, 2000);
          ctx.fillStyle = `rgb(${c.map((v) => v + 14).join(',')})`;
          const yTop = Math.max(g - 2000, cam.y - 20), yBot = Math.min(g - 12, cam.y + (cam.h || H) + 20);
          for (let y = g - 12 - Math.max(0, Math.ceil((g - 12 - yBot) / 10)) * 10; y > yTop; y -= 10) ctx.fillRect(Math.round(sx + 4), Math.round(y), 18, 2);
          ctx.fillStyle = (this.t * 1.2 + s.s * 9 | 0) % 2 ? 'rgba(255,200,80,0.9)' : 'rgba(120,90,40,0.9)'; ctx.fillRect(Math.round(sx + 10), Math.round(g - 40), 6, 6);
        } else if (s.k === 1) { // an AHU: a box with a fan grille, warm, and older than the halls
          const glow = 0.18 + 0.08 * Math.sin(this.t * 0.8 + s.s * 6); // it breathes
          ctx.fillStyle = `rgba(255,150,70,${glow.toFixed(2)})`; ctx.fillRect(Math.round(sx - 30), Math.round(g - 80), 110, 90);
          ctx.fillStyle = dark; ctx.fillRect(Math.round(sx), Math.round(g - 44), 50, 44);
          ctx.fillStyle = 'rgba(255,170,90,0.6)';
          for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(sx + 8), Math.round(g - 38 + i * 8), 34, 2);
        }
      } else if (kind === 'range') {
        if (s.k === 0) { // a range bunker with its slit
          if (!still) continue;
          ctx.fillStyle = dark; ctx.fillRect(Math.round(sx), Math.round(g - 20), 60, 22); ctx.fillRect(Math.round(sx + 6), Math.round(g - 26), 48, 6);
          ctx.fillStyle = 'rgba(255,200,120,0.7)'; ctx.fillRect(Math.round(sx + 14), Math.round(g - 14), 32, 3);
        } else if (s.k === 1) { // a target frame, shot through
          if (!still) continue;
          ctx.fillStyle = dark; ctx.fillRect(Math.round(sx), Math.round(g - 50), 4, 50); ctx.fillRect(Math.round(sx + 40), Math.round(g - 50), 4, 50); ctx.fillRect(Math.round(sx), Math.round(g - 50), 44, 4);
          ctx.fillStyle = 'rgba(220,70,50,0.7)'; ctx.fillRect(Math.round(sx + 10), Math.round(g - 40), 24, 24);
          ctx.fillStyle = `rgb(${c.join(',')})`; ctx.fillRect(Math.round(sx + 16), Math.round(g - 34), 5, 5); ctx.fillRect(Math.round(sx + 25), Math.round(g - 26), 4, 4);
        } else { // a fresh test crater, still smoking
          if (still) { ctx.fillStyle = dark; ctx.fillRect(Math.round(sx - 30), Math.round(g - 4), 60, 6); }
          if (live) {
            ctx.fillStyle = `rgba(80,74,70,${(0.3 + 0.2 * Math.sin(this.t + s.s * 5)).toFixed(2)})`;
            for (let i = 0; i < 4; i++) sq(ctx, sx + Math.sin(this.t * 0.5 + i) * 6, g - 14 - i * 16 - ((this.t * 12) % 16), 10 + i * 4);
          }
        }
      }
    }
  }

  drawRail(ctx, l, ox, x0, x1, hAt, c, pass) {
    const r = l.rail, y = r.y;
    const haze = (col, k = 0.3) => { const m = col.match(/\d+/g).map(Number); return `rgb(${m.map((v, i) => Math.round(lerp(v, c[i], k))).join(',')})`; };
    if (pass & BG_STATIC) {
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
    }
    // the train: six cars in Metro's look, stainless silver with a blue band low down, blue doors
    // edged in yellow, dark windows, and a blue cab front with a yellow edge; pantographs up
    const tr = r.train;
    if (!tr || !(pass & BG_LIVE)) return;
    const L = 66, gap = 3;
    const SILVER = haze('rgb(192,198,206)', 0.22), SHADE = haze('rgb(150,156,166)', 0.22), BLUE = haze('rgb(28,78,168)', 0.22), YELLOW = haze('rgb(246,200,40)', 0.22);
    for (let k = 0; k < tr.cars; k++) {
      const cx = tr.x - tr.dir * k * (L + gap) + ox; // its nose end
      const left = tr.dir > 0 ? cx - L : cx;
      if (left > x1 || left + L < x0) continue;
      const rock = Math.round(Math.sin(this.t * 9 + k * 1.7) * 0.8); // it rocks on the track
      const top = y - 20 + rock;
      ctx.fillStyle = SILVER; ctx.fillRect(Math.round(left), top, L, 18); // the stainless body
      ctx.fillStyle = SHADE; ctx.fillRect(Math.round(left), top, L, 1); ctx.fillRect(Math.round(left), top + 17, L, 1); // (roof line and skirt)
      ctx.fillStyle = BLUE; ctx.fillRect(Math.round(left), top + 12, L, 3); // the blue band
      ctx.fillStyle = haze('rgb(36,44,62)', 0.25);
      for (let wx = 6; wx < L - 8; wx += 10) ctx.fillRect(Math.round(left + wx), top + 4, 6, 5); // windows
      for (const f of [0.3, 0.68]) { // doors: blue, framed in yellow
        const dx = Math.round(left + L * f);
        ctx.fillStyle = YELLOW; ctx.fillRect(dx - 1, top + 2, 6, 15);
        ctx.fillStyle = BLUE; ctx.fillRect(dx, top + 3, 4, 13);
      }
      ctx.fillStyle = haze('rgb(40,40,48)', 0.3); ctx.fillRect(Math.round(left + 4), top + 18, L - 8, 2); // bogies
      if (k === 0 || k === tr.cars - 1) { // a driving cab at each end: blue front, yellow edge, windscreen
        const nose = (k === 0) === (tr.dir > 0);
        const end = nose ? left + L - 8 : left;
        ctx.fillStyle = BLUE; ctx.fillRect(Math.round(end), top, 8, 18);
        ctx.fillStyle = YELLOW; ctx.fillRect(Math.round(nose ? end + 7 : end), top, 1, 18); ctx.fillRect(Math.round(end), top + 15, 8, 2);
        ctx.fillStyle = haze('rgb(24,30,46)', 0.22); ctx.fillRect(Math.round(end + 1), top + 3, 6, 5);
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
    const pk = (this.particleOverride || this.biome.particles).kind;
    const sand = pk === 'sand';
    const steam = pk === 'steam';
    if (steam) ctx.globalAlpha = 0.22; // the deck's exhaust: soft wisps
    for (const f of this.flakes) {
      ctx.fillStyle = f.c;
      if (sand) ctx.fillRect(Math.round(f.x), Math.round(f.y), 6, 2); // streaks of blown sand
      else sq(ctx, f.x, f.y, f.s);
    }
    ctx.globalAlpha = 1;
  }
}
