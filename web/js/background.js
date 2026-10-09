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
    const p = this.biome.particles;
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
  drawSky(ctx, cam) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(this.biome.sky[0]));
    g.addColorStop(1, rgb(this.biome.sky[1]));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const art = this.biome.skyArt;
    if (art) this.drawSkyArt(ctx, art, cam ? cam.x * 0.02 : 0);
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
    if (art.ring) { // the exo-surface ring: a broad banded arc over half the sky
      const cx = W * 0.62 - ox, cy = H * 2.2, R = H * 2.05;
      const da = 3 / R; // a column every 3 px, each 4 wide: a solid band
      for (let a = -1.15; a < 1.15; a += da) {
        const x = cx + Math.sin(a) * R, y = cy - Math.cos(a) * R;
        if (x < -40 || x > W + 40) continue;
        const band = [[150, 150, 176, 0.55], [196, 192, 214, 0.6], [120, 122, 150, 0.5], [210, 206, 226, 0.45]];
        let off = 0;
        for (const [r2, g2, b2, al] of band) {
          ctx.fillStyle = `rgba(${r2},${g2},${b2},${al})`;
          ctx.fillRect(Math.round(x), Math.round(y + off), 4, 12);
          off += 12;
        }
        if (Math.abs(((a + 2) * 18) % 1) < da * 18) { ctx.fillStyle = 'rgba(80,80,104,0.5)'; ctx.fillRect(Math.round(x), Math.round(y), 2, 48); } // segment joints
      }
    }
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
      for (let x = -((ox * 30) % 40) - 40; x < W + 40; x += 40) {
        const k = Math.round((x + ox * 30) / 40);
        const d = Math.round(H * (0.08 + 0.08 * hash2(k, 21)));
        ctx.fillStyle = 'rgb(38,36,44)'; ctx.fillRect(Math.round(x), 0, 41, d);
        ctx.fillStyle = 'rgb(56,52,60)'; ctx.fillRect(Math.round(x), d - 4, 41, 4);
        for (let wy = 8; wy < d - 8; wy += 9) for (let wx = 4; wx < 36; wx += 8) {
          if (hash2(k * 7 + wx, wy) > 0.3) continue;
          ctx.fillStyle = hash2(k, wy + wx) > 0.5 ? 'rgb(255,196,120)' : 'rgb(255,160,90)';
          ctx.fillRect(Math.round(x + wx), wy, 3, 3);
        }
      }
    }
  }

  // ridges: called with the world transform; each layer follows the camera by `parallax`
  drawRidges(ctx, cam) {
    const broad = this.biome.tree === 'broadleaf';
    for (const l of this.layers) {
      ctx.fillStyle = l.color;
      const ox = cam.x * (1 - l.parallax);
      fillSteps(ctx, l.height, cam.x, cam.x + (cam.w || VIEW_W), 8, ox, 0);
      if (l.voids && l.voids.length) this.drawLayerVoids(ctx, l, ox); // cut by 15X's Zero Point
      if (l.bldg || l.stilts) this.drawLayerArt(ctx, l, ox, cam);
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

  // what stands on a ridge: lit windows in the stilt-rows, rack lights in the datacentre halls,
  // ruins' broken tops, or (under the stilt-cities) the stilts themselves, up out of sight
  drawLayerArt(ctx, l, ox, cam) {
    const x0 = cam.x - 60, x1 = cam.x + (cam.w || VIEW_W) + 60;
    const c = l.color.match(/\d+/g).map(Number);
    if (l.bldg) for (const b of l.bldg) {
      const sx = b.x + ox;
      if (sx + b.w < x0 || sx > x1) continue;
      if (l.windows) { // warm windows; the heat goes where the exchangers send it
        const [r, g2, bl] = l.windows;
        for (let y = b.top + 8; y < b.top + 200; y += 12) for (let x = 6; x < b.w - 6; x += 10) {
          const h = hash2(b.x + x, y - b.top);
          if (h > 0.42) continue;
          ctx.fillStyle = `rgba(${r},${g2},${bl},${(0.45 + h).toFixed(2)})`;
          ctx.fillRect(Math.round(sx + x), Math.round(y), 4, 5);
        }
        if (b.w > 60 && hash2(b.x, 3) > 0.6) { ctx.fillStyle = `rgb(${c.map((v) => v - 10).join(',')})`; ctx.fillRect(Math.round(sx + b.w / 2), Math.round(b.top - 24), 2, 24); ctx.fillStyle = (this.t * 2 + b.seed | 0) % 2 ? '#ff4a3a' : '#5a2020'; ctx.fillRect(Math.round(sx + b.w / 2 - 1), Math.round(b.top - 27), 4, 4); } // a relay mast
      }
      if (l.racks) { // a datacentre hall: rows of status lights; some halls de-listed and dark, but drawing load
        const dead = hash2(b.x, 11) > 0.6;
        for (let y = b.top + 10; y < b.top + 220; y += 10) for (let x = 4; x < b.w - 4; x += 6) {
          const h = hash2(b.x + x, y - b.top);
          if (h > 0.5) continue;
          const blink = Math.sin(this.t * (2 + h * 6) + h * 50) > (dead ? 0.85 : -0.2);
          if (!blink) continue;
          ctx.fillStyle = dead ? 'rgba(255,90,70,0.8)' : h > 0.4 ? 'rgba(255,190,90,0.9)' : 'rgba(110,240,200,0.85)';
          ctx.fillRect(Math.round(sx + x), Math.round(y), 2, 2);
        }
      }
      if (l.ruins) { // older than anyone's records: stepped crowns and a dark doorway
        ctx.fillStyle = `rgb(${c.join(',')})`;
        ctx.fillRect(Math.round(sx + b.w * 0.2), Math.round(b.top - 14), Math.round(b.w * 0.6), 14);
        ctx.fillRect(Math.round(sx + b.w * 0.38), Math.round(b.top - 26), Math.round(b.w * 0.24), 12);
        ctx.fillStyle = `rgb(${c.map((v) => v - 18).join(',')})`;
        ctx.fillRect(Math.round(sx + b.w * 0.4), Math.round(b.top + 30), Math.round(b.w * 0.2), 50);
        if (hash2(b.x, 13) > 0.7) { ctx.fillStyle = 'rgba(120,200,255,0.35)'; ctx.fillRect(Math.round(sx + b.w * 0.47), Math.round(b.top + 12), 4, 4); } // something still lit inside
      }
    }
    if (l.stilts) { // the stilt-cities' legs: drilled into bedrock, braced, rising out of sight
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
    if (l.props && l.props.spots && this.biome.props) this.drawSpots(ctx, l, ox, x0, x1, hAt, c, dark);
    if (l.rail) this.drawRail(ctx, l, ox, x0, x1, hAt, c);
  }

  // per map: the deck's radiator fields, exchangers and heat main; the roots' risers, ground mains
  // and AHUs; the range's bunkers and target frames
  drawSpots(ctx, l, ox, x0, x1, hAt, c, dark) {
    const kind = this.biome.props;
    if (kind === 'deck') { // the heat main along the ridge, from exchanger to exchanger
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
        if (s.k === 0) { // a radiator field: rows of fins shedding the deck's heat into the sky
          for (let i = 0; i < 9; i++) { ctx.fillStyle = dark; ctx.fillRect(Math.round(sx + i * 9), Math.round(g - 46), 4, 46); ctx.fillStyle = 'rgba(255,140,90,0.25)'; ctx.fillRect(Math.round(sx + i * 9), Math.round(g - 46), 4, 3); }
        } else { // an exchanger: HX-n, a squat drum with its pipes
          ctx.fillStyle = dark; ctx.fillRect(Math.round(sx), Math.round(g - 54), 44, 54); ctx.fillRect(Math.round(sx - 6), Math.round(g - 30), 56, 8);
          ctx.fillStyle = 'rgba(255,170,90,0.7)'; ctx.fillRect(Math.round(sx + 6), Math.round(g - 46), 32, 2);
          ctx.fillStyle = 'rgba(230,226,240,0.8)'; ctx.font = `9px ${HUD_FONT}`; ctx.textAlign = 'left'; ctx.fillText(`HX-${1 + Math.floor(s.s * 12)}`, Math.round(sx + 8), Math.round(g - 34));
        }
      } else if (kind === 'roots') {
        if (s.k === 0) { // a riser: a shaft up into the dark, with its cage ladder
          ctx.fillStyle = dark; ctx.fillRect(Math.round(sx), Math.round(g - 2000), 26, 2000);
          ctx.fillStyle = `rgb(${c.map((v) => v + 14).join(',')})`;
          for (let y = g - 12; y > g - 2000; y -= 10) ctx.fillRect(Math.round(sx + 4), Math.round(y), 18, 2);
          ctx.fillStyle = (this.t * 1.2 + s.s * 9 | 0) % 2 ? 'rgba(255,200,80,0.9)' : 'rgba(120,90,40,0.9)'; ctx.fillRect(Math.round(sx + 10), Math.round(g - 40), 6, 6);
        } else if (s.k === 1) { // an AHU: a box with a fan grille, warm, and older than the halls
          const glow = 0.18 + 0.08 * Math.sin(this.t * 0.8 + s.s * 6); // it breathes
          ctx.fillStyle = `rgba(255,150,70,${glow.toFixed(2)})`; ctx.fillRect(Math.round(sx - 30), Math.round(g - 80), 110, 90);
          ctx.fillStyle = dark; ctx.fillRect(Math.round(sx), Math.round(g - 44), 50, 44);
          ctx.fillStyle = 'rgba(255,170,90,0.6)';
          for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(sx + 8), Math.round(g - 38 + i * 8), 34, 2);
        } else { // a ground main: a fat pipe on saddles, running along the ridge
          ctx.fillStyle = dark;
          ctx.fillRect(Math.round(sx - 40), Math.round(g - 30), 200, 18);
          for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(sx - 30 + i * 55), Math.round(g - 14), 8, 14);
          ctx.fillStyle = `rgb(${c.map((v) => v + 20).join(',')})`; ctx.fillRect(Math.round(sx - 40), Math.round(g - 30), 200, 3);
        }
      } else if (kind === 'range') {
        if (s.k === 0) { // a range bunker with its slit
          ctx.fillStyle = dark; ctx.fillRect(Math.round(sx), Math.round(g - 20), 60, 22); ctx.fillRect(Math.round(sx + 6), Math.round(g - 26), 48, 6);
          ctx.fillStyle = 'rgba(255,200,120,0.7)'; ctx.fillRect(Math.round(sx + 14), Math.round(g - 14), 32, 3);
        } else if (s.k === 1) { // a target frame, shot through
          ctx.fillStyle = dark; ctx.fillRect(Math.round(sx), Math.round(g - 50), 4, 50); ctx.fillRect(Math.round(sx + 40), Math.round(g - 50), 4, 50); ctx.fillRect(Math.round(sx), Math.round(g - 50), 44, 4);
          ctx.fillStyle = 'rgba(220,70,50,0.7)'; ctx.fillRect(Math.round(sx + 10), Math.round(g - 40), 24, 24);
          ctx.fillStyle = `rgb(${c.join(',')})`; ctx.fillRect(Math.round(sx + 16), Math.round(g - 34), 5, 5); ctx.fillRect(Math.round(sx + 25), Math.round(g - 26), 4, 4);
        } else { // a fresh test crater, still smoking
          ctx.fillStyle = dark; ctx.fillRect(Math.round(sx - 30), Math.round(g - 4), 60, 6);
          ctx.fillStyle = `rgba(80,74,70,${(0.3 + 0.2 * Math.sin(this.t + s.s * 5)).toFixed(2)})`;
          for (let i = 0; i < 4; i++) sq(ctx, sx + Math.sin(this.t * 0.5 + i) * 6, g - 14 - i * 16 - ((this.t * 12) % 16), 10 + i * 4);
        }
      }
    }
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
    const steam = this.biome.particles.kind === 'steam';
    if (steam) ctx.globalAlpha = 0.22; // the deck's exhaust: soft wisps
    for (const f of this.flakes) {
      ctx.fillStyle = f.c;
      if (sand) ctx.fillRect(Math.round(f.x), Math.round(f.y), 6, 2); // streaks of blown sand
      else sq(ctx, f.x, f.y, f.s);
    }
    ctx.globalAlpha = 1;
  }
}
