'use strict';
// Final weapons (w.sig: one per girl, only in her own shop) and their set pieces:
//   Ikaros' Apollon        a laser; where it lands the camera climbs to an asteroid belt, marks a rock
//                          and flings it down: a vast crater melted to lava for good (AsteroidStrike)
//   November's Verdict     a target dot; an NXi battlecruiser fleet drops in overhead, the camera
//                          rolls to show it in formation, and the flagship's spinal lance fires down
//   Innocentia's Array     a dot; MAIA's eye opens, the sky fills with MAIAs and a vast one behind
//                          them, and the mark takes wave after wave of fire, then the vast one's beam (MaiaArray)
//   G.W. Tiger's Ragnarök  a marker shell; the camera whips off the map to her platoon of G.W.
//                          SPGs and a Karl-Gerät, which rain shells on the area (BatteryStrike)
//   Object 15X's Zero Point a railgun probe; the Naito MAIA fires from the Great Red Spot and the
//                          ground round the probe is deleted outright (NaitoStrike)
//   Alban's Morrighan      a flare; the sky over it tears open like a wound and black rockets rain out
//                          of the tears on long dark trails (SkyTear)

// ---------------------------------------------------------------------------------- asteroid
// Ikaros' Apollon. Where her beam lands the sky answers: the camera climbs, the light streaking
// past, the sky darkens to space, it passes the NXi fleet on station and comes out among an
// asteroid belt. It settles on one rock; a yellow outline forms around it and pulses, in silence;
// then the rock is flung down, faster than the climb, and lands: a vast crater, the ground melted
// to lava that stains it for good (Terrain.melt) and burns anyone who stands in it.
const ROCK = { CLIMB: 130, MARK: 142, PULSE: 226, DROP: 276, END: 366 };
const ROCK_ALT = 15000; // the belt, above the mark
const ROCK_CELL = 10; // the rocks' box size
// a lumpy rock as boxes: cells inside a noisy radius, shaded light on the upper left
function rockCells(R, seed) {
  const out = [], n = Math.ceil(R / ROCK_CELL);
  const bump = (a) => 0.78 + 0.12 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 7 + seed * 2.3) + 0.05 * Math.sin(a * 13 + seed * 5.1);
  for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
    const x = i * ROCK_CELL, y = j * ROCK_CELL, r = Math.hypot(x, y);
    if (r > R * bump(Math.atan2(y, x))) continue;
    const lit = (-x - y) / (R * 1.4), pit = hash2(i * 13 + seed * 7, j * 17) < 0.08;
    const v = pit ? 0.55 : 0.75 + 0.3 * lit + 0.08 * hash2(i, j + seed);
    out.push([x, y, `rgb(${Math.round(120 * v)},${Math.round(108 * v)},${Math.round(98 * v)})`]);
  }
  return out;
}
class AsteroidStrike {
  constructor(game, owner, at, cfg) {
    this.game = game;
    this.owner = owner;
    this.cfg = cfg;
    this.tx = at.x;
    this.ground = Math.min(game.terrain.hAt(at.x), at.y);
    this.belt = this.ground - ROCK_ALT;
    this.t = 0;
    this.zoom0 = game.cam.zoom;
    this.focus = { x: this.tx, y: this.ground - 200 };
    this.rock = { x: this.tx, y: this.belt, cells: rockCells(cfg.size, 3) };
    this.mark = 0; // the yellow outline, forming then pulsing
    // the belt: rocks of every size drifting across the dark
    this.belt_ = [];
    for (let i = 0; i < 46; i++) {
      const R = 16 + hash2(i, 5) * 90, side = i % 2 ? 1 : -1;
      this.belt_.push({ x: this.tx + side * (240 + hash2(i, 9) * 2400), y: this.belt + (hash2(i, 2) - 0.5) * 1100, vx: (hash2(i, 4) - 0.5) * 1.2, R, cells: rockCells(R, i), far: hash2(i, 8) < 0.5 });
    }
    // the outline: cells just outside the rock
    const inside = new Set(this.rock.cells.map(([x, y]) => x + ',' + y));
    this.edge = [];
    for (const [x, y] of this.rock.cells) {
      for (const [dx, dy] of [[ROCK_CELL, 0], [-ROCK_CELL, 0], [0, ROCK_CELL], [0, -ROCK_CELL]]) {
        const k = (x + dx) + ',' + (y + dy);
        if (!inside.has(k)) { inside.add(k); this.edge.push([x + dx, y + dy]); }
      }
    }
    game.cam.ceil = this.belt - 2500;
    game.cam.follow(this.focus);
    game.ui.notice('The sky answers.');
  }

  update() {
    const g = this.game, cam = g.cam, t = ++this.t, f = this.focus, r = this.rock;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    for (const b of this.belt_) b.x += b.vx;
    if (t <= ROCK.CLIMB) { // the climb, gathering speed then easing into the belt
      // eased, and slowing right down as it passes the fleet (at ORB_ALT / ROCK_ALT of the way)
      const k = 0.85, mid = ORB_ALT / ROCK_ALT - 0.08, p = (q) => q - (k / TAU) * Math.sin(TAU * (q - mid));
      const u = (p(ease(t / ROCK.CLIMB)) - p(0)) / (p(1) - p(0));
      f.x = this.tx; f.y = lerp(this.ground - 200, this.belt + 40, u);
      cam.setZoom(lerp(this.zoom0, 0.8, u));
      g.ascent = Math.sin(Math.PI * Math.min(1, t / ROCK.CLIMB)); g.ascentDir = 1;
    }
    if (t > ROCK.CLIMB && t <= ROCK.DROP) { g.ascent = 0; f.y = this.belt + 40; }
    if (t > ROCK.CLIMB && t <= ROCK.MARK) this.mark = (t - ROCK.CLIMB) / (ROCK.MARK - ROCK.CLIMB);
    if (t > ROCK.MARK && t <= ROCK.PULSE) this.mark = 0.6 + 0.4 * Math.abs(Math.sin((t - ROCK.MARK) * 0.11));
    if (t > ROCK.PULSE && t <= ROCK.DROP) { // and down: faster than the climb, harder all the way
      this.mark = Math.max(0, 1 - (t - ROCK.PULSE) / 10);
      const u = Math.pow((t - ROCK.PULSE) / (ROCK.DROP - ROCK.PULSE), 2.2);
      r.y = lerp(this.belt, this.ground, u);
      f.y = r.y - 120 * (1 - u) - 60;
      cam.setZoom(lerp(0.8, 0.5, u));
      g.ascent = Math.min(1, u * 4) * (1 - u * 0.3); g.ascentDir = -1;
      for (let i = 0; i < 4; i++) {
        g.particles.add({ x: r.x + (Math.random() - 0.5) * this.cfg.size * 1.4, y: r.y - this.cfg.size * 0.6 - Math.random() * 40, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 3, g: -0.02, drag: 0.95, life: 0.5 + Math.random() * 0.5, size: 14 + Math.random() * 20, color: i ? [255, 150 + Math.random() * 80, 40] : [110, 96, 90] });
      }
      if (t === ROCK.PULSE + 1) g.sfx.laser();
    }
    if (t === ROCK.DROP) {
      g.ascent = 0;
      const c = this.cfg, y = g.terrain.hAt(this.tx);
      g.explode(this.tx, y, { dmg: c.dmg, dmgR: c.r, explR: c.explR, visR: 620, from: { x: 0, y: -1 } }, this.owner, 'shell');
      g.terrain.melt(this.tx, c.lava);
      for (let i = 0; i < 90; i++) { // molten rock thrown out of the crater
        const a = -Math.PI * (0.08 + 0.84 * rng.next()), sp = 3 + rng.next() * 12;
        g.drops.push(new AcidDrop(g, this.owner, this.tx + (rng.next() - 0.5) * 200, g.terrain.hAt(this.tx) - 6, Math.cos(a) * sp, Math.sin(a) * sp, c.splash, true));
      }
      g.shake = Math.max(g.shake, 44);
      g.screenFlash = Math.max(g.screenFlash || 0, 1);
      g.sfx.explosion(80);
      g.events.push('The ground melts.');
    }
    cam.follow(f);
    if (t <= ROCK.DROP) cam.snap();
    if (t > ROCK.DROP + 30 && t <= ROCK.DROP + 70) cam.setZoom(lerp(0.5, this.zoom0, ease((t - ROCK.DROP - 30) / 40)));
    if (t >= ROCK.END) { cam.ceil = -1000; g.ascent = 0; g.ascentDir = 1; return false; }
    return true;
  }

  draw(ctx) {
    const t = this.t, time = this.game.time, r = this.rock;
    // the NXi fleet on station, passed on the way up
    const fy = this.ground - ORB_ALT;
    drawScaled(ctx, this.tx - 900, fy - 260, 0.6, 0.6, () => drawBattlecruiser(ctx, 0, 0, 1, time + 3));
    drawBattlecruiser(ctx, Math.round(this.tx + 520), Math.round(fy), -1, time);
    drawBattlecruiser(ctx, Math.round(this.tx - 380), Math.round(fy + 330), -1, time + 1);
    drawFrigate(ctx, Math.round(this.tx + 120), Math.round(fy - 200), time, false);
    drawFrigate(ctx, Math.round(this.tx - 640), Math.round(fy + 120), time + 2, false);
    // the belt
    const rockAt = (cells, x, y, a = 1) => {
      ctx.globalAlpha = a;
      for (const [cx, cy, col] of cells) { ctx.fillStyle = col; ctx.fillRect(Math.round(x + cx - ROCK_CELL / 2), Math.round(y + cy - ROCK_CELL / 2), ROCK_CELL, ROCK_CELL); }
      ctx.globalAlpha = 1;
    };
    for (const b of this.belt_) rockAt(b.cells, b.x, b.y, b.far ? 0.45 : 1);
    if (t >= ROCK.DROP) return;
    // the chosen rock, glowing underneath as it comes down, and its yellow outline
    rockAt(r.cells, r.x, r.y);
    if (t > ROCK.PULSE) {
      const heat = clamp((t - ROCK.PULSE) / 30, 0, 1);
      ctx.fillStyle = `rgba(255,140,40,${0.6 * heat})`;
      for (const [cx, cy] of r.cells) if (cy > this.cfg.size * 0.35) ctx.fillRect(Math.round(r.x + cx - ROCK_CELL / 2), Math.round(r.y + cy - ROCK_CELL / 2), ROCK_CELL, ROCK_CELL);
    }
    if (this.mark > 0) {
      ctx.fillStyle = `rgba(255,214,60,${this.mark})`;
      const grow = 1 + (1 - Math.min(1, this.mark * 1.5)) * 0.3;
      for (const [cx, cy] of this.edge) ctx.fillRect(Math.round(r.x + cx * grow - ROCK_CELL / 2), Math.round(r.y + cy * grow - ROCK_CELL / 2), ROCK_CELL, ROCK_CELL);
    }
  }
}

// --------------------------------------------------------------------- the NXi battlecruiser
// The November Division flagship as built in Avorion, pixelised from the side shot (its red accents
// recoloured to the NXi's navy): a long arrowhead hull in grey splinter camo, its bow drawn out flat and sharp, a row of turrets on the
// raised deck, the bridge mast aft of them, navy light strips down the flanks and swept navy fins at
// the stern. The lance is spinal: it leaves from under the fore end of the plate amidships (BC_EMIT)
// and fires forward along the ship's axis. Drawn in profile (bow toward facing d) or turned nose-down.
const BC_SPRITE = [
  '..........................................................................................................................................NNP...................................................................................................................................................................................',
  '.....................................................................................................................................BBM......................MGM...............................................................................................................................................................',
  '.....................................................................................................................................CCF......................NK................................................................................................................................................................',
  '....................................................................................................................................FCBF......................NGBH..............................................................................................................................................................',
  '....................................................................................................................................HLF........................MD...............................................................................................................................................................',
  '....................................................................................................................................KKF.........................N...............................................................................................................................................................',
  '...............................................................................................................................N...DBBAAAAAAAAAAAAAAABBB........................................................................................................................................................................',
  '.C.................................................................................................................................F..F...............................NMDKLDKMN....FCFFFFFFFDFF.G.........NHDKKDKM......................................K.......................................................................',
  '..................................................................................................................................MO..................................HHFKKFHFHF...FDFDFFFFDCCCBADKKHHDFDFHFFFFFFFD....................................KKK......................................................................',
  '.................................................................................................................................FH...................................NN.....KH......NGFFFKDDDFKFDK......NM.....NFHK................................FFFFFFF........................F............................................',
  '................................................................................................................................MDO..............UUUUUUUUUUUUUUUYYYYSNNNNNOOOOKMObbbbcWKHHKLKKFFFFMbZZWWOMNOLMLLOLFMaX.............................JFFFFFFJ............FFK......................................................',
  '.......................................................................................................................DD.......DF........OYbOHUUUUUUUYYYYYUUUUUPPUMGGFGGGGGFFFDFMSSWNGHHHGGGFFFFFGMSWSHFFGGHGFFFFFFGOODBFFHONGFFFLLDBCEEJCCEEJJJJJJJJJJJJJJJJJJJJJJJJJFFFFKKLLLN...............................................',
  '........................................................................................................AAABBBAAAAAAAAAAAAABBAAAACCBABAAABCDHFFcYUYVVPMUPPPNMMMHHHMMNPMHMMHMMMMNPMHMPNMUPPSWSOOSWWWVTWSTVWXXTTTTTTTTONLNLKKHKKKFFFFFEFEEEEEEEEEEECEEEEEEEEEEEJJJJJJJJJJJJJJJJLLLLLOOOOSSTTWWWZZZZZZZ............................',
  '.................................................FFGGFFDDDDDDDDBBCBB.......................BBBBBBBBBBBBBBCCBBCCBBDDDDCDFFFFFFDFDFFFFDDDDDBBBBBBDHOONMGFHHMMMMMMMMMNNNUPPNPPPNPVWVWUVVWSVSSSTTSWWWTWTTXSSTTTSSSSSSSSSSONKFFFFFFFFFFFFECCCCCCCCCCCCCCCCCCAACCCCCCCCCCCCCCCEEEEJJJLOOOOORSSTTWWWWZZZZZZZZZZZZWWWW..................',
  '..............................................VSOOOOOLLLLLLLJJJJJJJQLJJJJJJJJQJJJJJJJJJJJJJJEIJJJJJJJJJJQQQRRRRRRTXTTXXcaXXXTOSTTOOROOOTRFFFFFDDDDDFFFFFFDGHHHGGGGGGMMHHMHHHGHMHHHHHHMHHHHGGGHGGGDGGGGGGGGGGGGGGGGGGGGGGFFDBBBAABBBBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACCCEEJKLOORSSSTWWWZZZabbbbbaaaZZZWWXXWTTRRRR........',
  '......................ccccddccdddddcccXXTRRRRLQQQQQQQQQQQQQQJJQJJJJJJJJJJJJJJIIIIIIIIIIIIIIIIIIIIIIIIIIIIIJJJJJJJQQQQQLRRRRRROKLLLMKKFFDFFDDDDDCBBBDBBABBBDGDDDDGMMHMMHHMHHHGGHGGGGGGDDDDDDDDDDDDDDDDDDDDDDDDDDFDDDGDDDDGGDDFDDBBBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACCCCCCCCCCCCCEJJLLLKKMMHHHGHHMHGGGDGHGGGGGGGGGFBAAAAAAAAAAAAF',
  'ffffffffeffeeeedeeeddddddddddddQJJJJJJIIIIIJJJJJJJJJJJJJJJJJJJJJJJJJJJIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIJLLLLOLLLLOOKKFFFFFHHHKMGFFFFFFHMMHHFHKMNPPNNNNPNNNNNNNMMMMMMMHHGGMHHHHHHHGHHGHGGGGHMHHHHHHHHHHGGGHHGGHGHHHHHHGDCCCCCCCCCCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACCCFHGHHHGGGGHHGDDDGDGGDDGDDDDDDBAAAAAAAAABDDK.',
  'ffffffffffffeeedXXTTRRRRQQQQQQQJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIJJJJJJJJJKKKLLLLLDCCCCEEFFFDDCCCCFFFFDFFFFKNSPPPPNNPPUUVZbZZZZYZYZSDFJEIIIIIIIIIIIIIIIIIIIIIIIIJJJJJJJJOOONNMMMLKHFFCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABDFGGGGGGHHHGDDGHGGGDGGDDDDDDBAAABCCFLRc....',
  'ffQIJIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIICCEDDCBBAAABDDDDCBCCDDDCDDMNNPPPPUUVVYZZbcbccbbaaXaRIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIRONNLLMMLKHHFCBCCCCCCCCCCCCCECCEEECCCEEECCCCCCECCCECCECCCCEEEEFKMKHHGGGGGFDGGDGHHHHGDDDDDGGFFFOTXc........',
  'ffRRRRRTRTRQQQQQQQQQQQQQQJQQQQQQQQQRRRRLLLLLRRORRRRRRRRTRRRRRRRRRROOOOLLLOOORQQRRRRRRRRTTTTTTTXTLLLKLOLRORXTTTRRRRROOLLKFECCCCBCBBBBBABBBBBBBBBABBBBBBBBABBBDGDGGGGGGGGGGGGGGGGGGGGGGGGHGGGGGMHGGGGGGGGGHHHGGGGHHKHKKOLLOONNNMMKKKKFFDFFFFFEEECCEEEECCEEEEEECCCCCCCCCCCCEEEEEEEEFJFEFKHGFFGFGDGDCDDDDDDDGGHHHMPSWXcaX...........',
  'ffffffffffffffffedddZYYUPYYZbbZdddddcdZPYYYYbbdddbcdWUUWVSOONNNNMMMLLLKLLLLKLLJJFEEEEFFFFFFKKKFFFFFFKKKKFFEEDCCCDDBBBDBAAAABBBBBBBBCBBBBBBBBBBAABDDCBCBDDDDBGGGGGGGGGGGHGGGGDDGGGGGGGGGGDDDGHGGGGGGGGGGHHHGGHHGGHHHHKLLKOOMMMMMKLKLKFDEEEEECCCCCECEEECCCEECCCCCCCCCCCEEEECEEEEEECCACCCFGGGHGDDGFFFDDDDGHPSWZZZWWW...............',
  'ffffeeeeeeeeeeaMMMMMKMMMMMMMNNNOOOPSSSOMNMKKKKHFFHFDDDDDDDDDDDDCCDCDEEECCCCCCCAAACCCCCCACACCCCCBCCBAAAAAAAAAAAAAAAAAAAAABBBBBBBBBBBBAABBBBBAAAABBCKKHHFFDDFFHHHHMHGMMMHMMHMMGGHHHHMMMHMMHGGGMNMNPPPSSSSSNNNOSRRROOSONONNNNMMMMMMMLLKDCCCCCCCCCCBCCCCCCAACCCCCCCCABCCCECCCCCCECCCCAAACACFGKMGGGDGHHHMPZccbZWWVV..................',
  'fffffffeeeeeefOKKKKKKKKKKHHKMMMNMNNMKHHHFDDDDDDDFFDDDDDFFFDFFDDEEECEEFECCCEEECCCCEEEJEEEEEEEEFEEDDDCCCCCDDDBBDDDBBBDBBBBBBBBBAAAAAAAAAAAAAAAAAAAACFFHFFFFDDFHHHHMMHMHHGHHGHGGHMHGHMGGHHHGHGGGHMGHMMNNPONMNNNNOOSOOSNMONNMMNMMMMKMMMKFDCCCCEECCCCBCCCCCCBAABCCCCCCCCCCEEEEEECCCCCAAAAAAABDHGDDGGHOVZbaZZWWW......................',
  'fffffffeeeeeeeNKLKLKKKKKKMMNNONOSSSWXZNMNNOSVZacaXacXcdXccacdcdeeecccccccXTRRRRRRRRRRRRRLOLLLLLLLLLLLOOONNOLLLLLLLOLDDBBBBBBBAAAAAAAAAAAAAAAAABAACFDFFFFFDFHNNMMMMHMHHHMHGHGGGMHHHMGGGGHGGHHGGGGHGHHHMMMNNOONNMNNOSNMNNNMMMNMMMKKMKKKKFECBCCCCCABCCCBACCAACBCCCCCCEEEEEEEECABBCAAAAAAAAAACDGMSWaZWWWWWX.........................',
  'ffffffeeeeeeeeLKKKKKKKKKKKKMMNNOSSPUWXMHMMMNOOPOOONONNOMNNMMNNMNMMMKLLLKKKKFJJJJJJJJJJJJJJJJLEACCLEEEJRLLLRFCCCCCCDDFHHHGGGGHHMKHHKHHFHGGHHHHHHFFFKFFFFFFFFHSVPPSPNMMGHMHGGGGMMGGGMGGGGMHHGGGHMHMHGGGGGMMMNNNOMNNOONMNONMMMNNMMKKKKKKKKLFDCCCCCBCCCCBBCCCCCCCCCCEEFFFFFECCBAABBAAAAAAAAACKOWXWWWWWW.............................',
  'fffffffffeffeeONNNNMNMMMNOONNMNNOOOSSVMHMMMMMMMMMMHMHHMHHHHHHHHGHHHKFKKFJJJJJJJJJJJJJJQQJJJJLJJJJLJLQLORRTXFCCEDCCDDDFNOOSSSSTMHHMMMHHHMMMMKKHFFFFFFFFFFFDFMONNMMOHFHNMMMMNMMMMMMHMMMHMMMMHHMMMMMMMMMMMMMMMNNONNNNNNNNNNMMMMMNMLLKLKKLKKKLFCCECCCDECCCCEEEECDEEEFFKFKFECEECABCCAAAACEFLTaWRSVWW.................................',
  'ffffefcLRXWWSSSSSSOOOONNGGGGMHHGHHHKKMHGGGGGHHHHDFMNNOOSOSSSSSRRRRRRRRQQQQQQQQQQQQQQQQQQJJJJQJJJJJLLLLLORRTFEFFEDDFFDFKWNNOOOSSHHMMNMMLLLKFKFFFFFDDFNNNNNGHWSHNGFGHMSddcbZZZZYUYYYPPPPNPPPPPPPPPPPPPPPPPPPNNNNNNNMMMMNNNONLLLJJJJJJEJJFFFDDBBCCCCDDECCDEFFFFFFFFKLKKFFECCCBABBAAAEKRTTROOSSS....................................',
  'fffeefdRTaXXXXWWZXRRWSPPDABBGMHHHHKHKMBDHHHHHHHKKKMNOOOSSSTTTTTTTTTRRRRRQQQQQQQQQQJJJJJJJJJJQJJJJLLJKKKKLLRFCCEEDFDBFAHBMOOOOOSNOONNLKKFKFFFFFFFFDCCDDFFFKONNPSVadeedddbZZZZYYYUPPPPPPPPPPPPPPPPPPPPMMMMMMMHHHHHHHMNXXTTTTRTJIIIIIIIICJKFFDCCFROOLLLLKKKFFFFFFFFFFFKFFFFFFJFKLLOTXROOOOOS.......................................',
  'fffffeeffefeeedbXWVSONMMNNNPMKMMNNNOSSMMMNNNPPNOOOOTRTROXTOTcXcXXXXXTTRRQQQQQQIIIIIIIIIEJJJJJJJJJJJFFFFFFLLECEFFDFFBMBMBMNOOOONLLKFFFFFFFFFFFDDCCDDCCCCCCDHMMHDBBBTedecbZYVUPPUUPPPPPPPPPPPPNMMHGHMGGHHHMMHMHHHHMOcdcXXXTTTXJIIIIIIIIIJROODKRKDFKKKKFFFFFFFFFFFFFFFFFFFFFFLOSSSOOOOOO...........................................',
  'fffffeeeeeeeedONNNNNNNNNMMNNNOSSSVVWXZSNMMMMMNONNNNROROLRRLRXXTXcccXXTTRQQQJQQCIICIIIIJJJJJJJJJJJJLJKKKKKLRECEKORSSRNOKLKMLLKHHFFFFFFFFFFDDDDDDDFFFEEEEFFFNSTTLLKKXcdebYZbZYYYUPYZYZZZZZZbUMMMNHHHMMMMMMMMMMMMMPZccXXXXXTTTXOQQJJJJJJJORNKFFFFDFFKFFFFFFFFFFFFFFFFFFFFFKNRSSOOOSSS..............................................',
  'fffffeeeeeeeeeSOOOONNNNNMMMNNNOSSSTVXaOONNKHHMMMNNNRLLRJLOJLXTTTTRTRRRRQQQJJIIIIIIIIIIIIJJJJQJJJJJJQLLQQRRRECCFFFFFDDDDDDFFFDDDDDDDDFDFDDCCDDEDFFFFFFFFECERXccddddbacZVUYYYYYUPPBBBBBBBBBBBBBBBGPNPPPPPPPUPPPPUVUVWSSTSSTSTTWWWTSTSNRTRTHFKDCFBDFFFFFFFFFFFFFFFFFFFFKNSTSSSSSS..................................................',
  'effffeeeeeeeeeXONNONNNNNMMNNNOOOOSSSVXNNNNNKMMMNNOZLEJRCJLEJTRRTRRRRRRQQQQQQQIIIIIIIIIJJJJJQQICCCJCCCEJIEJREBCCECCEDDDDDDDDDDDDDDDDDDCCCDDDFFFFKKLLJICCCIXXXccccaWZdcZZYYUYYZUMYAABBBBBBBBBBBBABPMPPPPUUUUUUUPPVVVVSSSSSTTTTTTTTcXTRRRRSOONLKFFFFKKKKFFFFFFFFKFFFKNSTTTSSSS.....................................................',
  'eeffffeeeeeeeecSOPOOOOOOOOOSSSSWWXXXXcPMNNNOORRRTXdLCJRCJREJcXXTTTRRRRQQQQQQJICCIIIIIIIIIJJJQICCCJICCIQEJQTEBCCCCCCCCCDCCCCCDDDDDCCCCCCCDDDDFHHKMMJICCCJSNOSSSSPPUVVYbZYUYZZYUMUABDBDDDDDDDDDBABPNPPPPUUUUUUSSSVSSVSSTTSWWTXROORFRXRRRSSSSONLHFFFKFKKKKKKFFFFKKKOSSSSSS.........................................................',
  'eeefffffffeeeeedcZZVSPPNNMNNNNNNPSPPUUOMNNOOORRRTTXRLOTLLRLLXTTTTTTRRRQQQQQQIICIIAIIIIIIIIQQQQQQJJFECCBCCCCCCCECCCCCCCDDDDDDDDFFDDDFFGGGGGHHMMMNOLOORRTRRSSWWSVVZcZWZdbVVZbZYUNYABDBDDDDDDDDDBABPMPPPPUUVVUUVVSSVWWSXOKHcXacOLKTDKXSSSRSSONLKFFFFKFFFFKFKFFFKNSSSSSS............................................................',
  'eefffffffffeeeeeeeeeddcbYPPPPPUPUPPPUVSNNOOOOORRRRTTdccTTRTRRRRRRRRRRRQQQQQJIICIICIIIICIIIIQQQQQRRRQLFCBAAAACCCCCEDDDFFGGGGGGGHGHHMMMMMMMMLORRTTRRRRRRTTTXXXWWWacZWYYZYVZZZZYUNYAABBBBBBBBBBBBABUMPPPUUUVVUUUUSVWUSSXWWXXXXXXOSXcXTTSSTTSONLKKFFKKKFFFFFFFKOSSSS................................................................',
  'eefffffffffffeeeeeeeeedeeedddddddddccccSOOOONMNMMLNMOSWNLNLLOOOOLLLLLLQQQQQJIICIICIIIICIAIIIQQQQQRRRRXTRQJEEJJJJLLOOOOOOOMMKKHHKKKKLLLLLLLLLLLRRQQROORSXXXWXWWWacaZaZZYYZZZYYUPPGBBBBBBBBBBBBBBGPPPUUPVVVSVSUSVVWWTSTVTTTXXXXXXTSSTSSSSSSOOLKLKFKKFFKKFKMSVVS...................................................................',
  'fffffffffffffffffffeeeeededdddddeddeeeedccXXTTTTRRRRTccXRRTTTTTTTRRRRRQQQQQJIICIICIIIICICIICIAQQQRRRRQQQQQQQQRQTTRTXXcdccZaXSSSXRRRRORRRRRRRRRRRRRRRRRRRRTTRTRTTTTTTTTTcccccZYPPYYYYYYWXRRRRRSSNNOSRRRTRRRRRRRRRRRRRRRRRTTTTXXXWWSSOOOOOONLKHKKKKKFFKLOWW.......................................................................',
  '.WefffffffffeeeeeeeedXXTTXTTTXXTTTTTXXXXcccdcccccccccccccccccccccXXLJJJJJEEEIIIIIAIICACIIIIIJCQQQRRRQQCACACACACAARRRTTXXVUBBGGCCVXTXXXXTTRRRRRRRRRRRRRRRRRRRRRTTTTTXcXcdddcbYYUPPPPPOOOONNNNNNNLLNRRRRRRRRRRRRRRRRRRRTTSSSVWWWWXWWWVSSSOOMKFFFFFFFFLS...........................................................................',
  '.........fefRJJJJIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIJIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIQQQQQQQQRQIAAAAAAAAAAAQQRRRRRRSBBGGAAOTTXXXaacccXXXXTRTRRRRRRRRRRRTTTTXXcXcccbXZYVSSPRRRRRRRROOOOOOOOOOSTTTTTTTTTRTTSSVVUUVVUUUVWWWWWWWWWWWWWWWSSONLKKN..............................................................................',
  '.................eedcccXXTRRRRRRRLLLLLLLLLLLLLLJJJLJJJJJJJJJJQJJJJJJJJJJIIIIIIIIIIIIIIIIIIIIIIIIIIJQQQQQQJJJJJQQQQQLLOOLLLHHHKKKLLLLLOOOOOOOLLLRLLLLLLLLLOLOLOLLLLROOOOOOOOOOOSPSPPPPPPPPUUPUUUYYUUUYUUYYUUUUUUUUUUYVVUUUUWWWWWWWWWWWWZZXWZZabb.................................................................................',
  '........................................................................JJJJJJJIIIIIIIIIIIIIIIIIIIIIJ...........................................................................................................................................................................................................................',
];
const BC_PAL = { A: '#69b0f4', B: '#a3a3a2', C: '#436fb5', D: '#7a7570', E: '#345596', F: '#6b5953', G: '#515d55', H: '#4d5049', I: '#233ac2', J: '#213878', K: '#504740', L: '#4c3b33', M: '#39423b', N: '#323731', O: '#31322b', P: '#22312b', Q: '#111f5e', R: '#2e241f', S: '#242b25', T: '#24211c', U: '#1d2c25', V: '#1d2721', W: '#1d241f', X: '#1c1e19', Y: '#162621', Z: '#151f1b', a: '#151d18', b: '#131c17', c: '#121714', d: '#0c1411', e: '#050a08', f: '#010403' };
const BC_P = 1.6; // world units per sprite pixel
const BC_EMIT = [226, 20]; // where the lance leaves: under the fore end of the plate amidships, on the ship's axis
// the hull as runs of one colour, precomputed
const _bcRuns = (() => {
  const out = [];
  BC_SPRITE.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const k = row[x];
      if (k === '.') { x++; continue; }
      let e = x + 1;
      while (e < row.length && row[e] === k) e++;
      out.push([BC_PAL[k], x, y, e - x]);
      x = e;
    }
  });
  return out;
})();
// where the lance leaves the ship, in the world. down: the ship turned nose-down (bow toward +y),
// so the spinal lance fires straight down; otherwise in profile, bow toward facing d.
function bcEmitter(x, y, d, down = false) {
  const W = BC_SPRITE[0].length, H = BC_SPRITE.length;
  const ox = (BC_EMIT[0] - W / 2) * BC_P, oy = (BC_EMIT[1] - H / 2) * BC_P;
  return down ? { x: x - oy, y: y + ox } : { x: x + d * ox, y: y + oy };
}
function drawBattlecruiser(ctx, x, y, d, time, down = false, charge = 0) {
  const W = BC_SPRITE[0].length, H = BC_SPRITE.length, P = BC_P;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (down) ctx.rotate(Math.PI / 2);
  else if (d < 0) ctx.scale(-1, 1);
  const x0 = -(W / 2) * P, y0 = -(H / 2) * P;
  for (const [c, rx, ry, n] of _bcRuns) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x0 + rx * P), Math.round(y0 + ry * P), Math.ceil(n * P), Math.ceil(P));
  }
  // charging: light gathers under the fore end of the plate and runs out along the axis to the bow
  if (charge > 0) {
    const ex = x0 + BC_EMIT[0] * P, ey = y0 + BC_EMIT[1] * P;
    ctx.fillStyle = `rgba(90,130,255,${0.25 + 0.5 * charge})`;
    ctx.fillRect(Math.round(ex), Math.round(ey - 3), Math.round((W - BC_EMIT[0]) * P * Math.min(1, charge * 1.5)), 6);
    ctx.fillStyle = `rgba(200,220,255,${charge})`;
    const g = 6 + 16 * charge + Math.sin(time * 30) * 2;
    ctx.fillRect(Math.round(ex - g / 2), Math.round(ey - g / 2), Math.round(g), Math.round(g));
  }
  // red running lights at the bow
  if ((time * 2 | 0) % 2) { ctx.fillStyle = '#ff3a3a'; ctx.fillRect(Math.round(x0 + (W - 2) * P), Math.round(y0 + 16 * P), 3, 3); }
  ctx.restore();
}

// the frigates and the fleet's palette (greys, red lights, violet thrusters)
const NXI_HULL = { W: '#c4c0bc', S: '#a29e9a', T: '#7c7874', D: '#2a2828', R: '#4a4746', G: '#5e5a58', g: '#d8d4d0', K: '#363434', r: '#ff3a3a' };
// a supporting frigate: a short wedge hull round a small gun, nose-down or in profile
const FRIGATE = [
  [-60, -6, 130, 12, 'G'], [-60, -6, 130, 2, 'g'],
  [-70, -14, 24, 28, 'R'], [-46, -16, 70, 10, 'W'], [-46, 6, 70, 10, 'S'], [24, -12, 24, 8, 'W'], [24, 4, 24, 8, 'S'],
  [-30, -26, 18, 10, 'W'], [-26, -34, 2, 8, 'T'], [60, -8, 10, 16, 'R'],
];
function drawFrigate(ctx, x, y, time, down = true) {
  for (const [px, py, pw, ph, c] of FRIGATE) {
    ctx.fillStyle = NXI_HULL[c];
    if (down) ctx.fillRect(Math.round(x - py - ph), Math.round(y + px), ph, pw);
    else ctx.fillRect(Math.round(x + px), Math.round(y + py), pw, ph);
  }
  ctx.fillStyle = `rgba(180,140,255,${0.6 + 0.4 * Math.sin(time * 30)})`;
  if (down) ctx.fillRect(Math.round(x - 4), Math.round(y - 78), 8, 8); else ctx.fillRect(Math.round(x - 78), Math.round(y - 4), 8, 8);
}

// ------------------------------------------------------------------------- orbital strike
// A fleet shot. The November Division holds station far above the battlefield (ORB_ALT up). Frames:
// 0-80 the climb: the camera rushes up from the mark through streaks of light, the sky giving way
// to space, rolling a quarter turn on the way, so the fleet (hanging nose-down over the battlefield)
// comes in side-on, in formation: escorts and frigates round the flagship, smaller, darker
// battlecruisers in layers behind; 80-140 the camera closes on the flagship as light gathers under
// the plate amidships; 140 the spinal lance fires (to the right, on screen: straight down, in the
// world); 140-205 the camera rolls back level and rides the beam down to the mark, which it hits
// with a blast far bigger than its damage radius; then the rest of the fleet opens up, a rain of
// laser fire across the area round it.
const ORB_ALT = 9000;
const ORB = { CLIMB: 80, FIRE: 140, HIT: 205, VOLLEY: 214, VOLLEY_LEN: 70, END: 330 };
// [dx, dy] from the flagship's centre as the formation appears on screen with the camera rolled a
// quarter turn (the ships themselves hang nose-down over the battlefield: fleetAt turns it into the world)
const fleetAt = (sx, sy) => [-sy, sx];
const FLEET = {
  escorts: [[-700, 170, 1], [660, -150, 1]],
  frigates: [[-300, 300, 1], [320, 230, 1], [-860, -60, 1], [900, 120, 1]],
  mid: [[-560, -330], [-80, -380], [420, -320], [-1000, -220], [980, -260]],
  far: [[-820, -520], [-420, -560], [0, -600], [380, -540], [760, -500], [-1150, -430], [1150, -420]],
};
function drawScaled(ctx, x, y, sc, alpha, fn) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  fn();
  ctx.restore();
}
// space, in screen pixels: the dark, and stars that twinkle
const SPACE_STARS = Array.from({ length: 140 }, (_, i) => [(i * 7919) % 1000 / 1000, (i * 104729) % 1000 / 1000, 1 + (i % 3), i]);
function drawSpace(ctx, a, time) {
  ctx.fillStyle = `rgba(6,8,24,${a})`;
  ctx.fillRect(0, 0, W, H);
  for (const [u, v, s, i] of SPACE_STARS) {
    ctx.fillStyle = `rgba(${i % 5 ? '220,228,255' : '200,170,255'},${a * (0.5 + 0.5 * Math.sin(time * 2 + i))})`;
    ctx.fillRect(Math.round(u * W), Math.round(v * H), s, s);
  }
}

// the climb: streaks of light rushing up the screen (screen pixels), thick in the middle of the climb
const ASCENT_STREAKS = Array.from({ length: 90 }, (_, i) => [((i * 7919) % 997) / 997, ((i * 104729) % 991) / 991, 0.6 + ((i * 31) % 7) / 7]);
function drawAscent(ctx, a, time, dir = 1) {
  for (const [u, v, sp] of ASCENT_STREAKS) {
    const y = (((v - dir * time * 2.2 * sp) % 1) + 1) % 1; // moving up (climbing) or down (falling)
    const len = 30 + 90 * a * sp;
    ctx.fillStyle = `rgba(${sp > 1.2 ? '200,225,255' : '255,255,255'},${0.15 + 0.55 * a})`;
    ctx.fillRect(Math.round(u * W), Math.round(y * H), 2 + Math.round(sp), Math.round(len));
  }
}

class OrbitalStrike {
  constructor(game, owner, at, cfg) {
    this.game = game;
    this.owner = owner;
    this.cfg = cfg;
    this.tx = at.x;
    this.ground = Math.min(game.terrain.hAt(at.x), at.y);
    this.y = this.ground - ORB_ALT; // the flagship's centre on station
    this.x = this.tx - bcEmitter(0, 0, 1, true).x; // nose-down, placed so its lance is right over the mark
    this.t = 0;
    this.charge = 0;
    this.beam = 0;
    this.zoom0 = game.cam.zoom;
    this.focus = { x: at.x, y: this.ground - 200 };
    // the fleet's volley: every shot's mark and which ship fires it (seeded)
    const v = cfg.volley, ships = [...FLEET.escorts, ...FLEET.frigates];
    this.volley = [];
    for (let i = 0; i < v.n; i++) {
      const s = ships[i % ships.length];
      this.volley.push({ x: clamp(this.tx + (rng.next() * 2 - 1) * v.spread, 4, WORLD_W - 4), at: ORB.VOLLEY + Math.round(rng.next() * ORB.VOLLEY_LEN), sx: this.x + fleetAt(s[0], s[1])[0] });
    }
    game.cam.ceil = this.y - 2500;
    game.cam.follow(this.focus);
    game.ui.notice('NXi November Division fleet on station.');
  }

  get emit() { return bcEmitter(this.x, this.y, 1, true); }

  update() {
    const g = this.game, cam = g.cam, t = ++this.t;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    const f = this.focus, e = this.emit;
    if (t <= ORB.CLIMB) { // the climb, rolling a quarter turn and pulling out: the fleet comes in side-on
      const u = ease(t / ORB.CLIMB);
      f.x = this.tx;
      f.y = lerp(this.ground - 200, this.y, u);
      const r = ease((t - ORB.CLIMB * 0.35) / (ORB.CLIMB * 0.65));
      cam.rot = -Math.PI / 2 * r;
      cam.setZoom(lerp(this.zoom0, 0.5, r));
      g.ascent = Math.sin(Math.PI * Math.min(1, t / ORB.CLIMB)); g.ascentDir = 1; // streaks swell, then clear for the reveal
    } else g.ascent = 0;
    if (t > ORB.CLIMB && t <= ORB.FIRE) { // in on the flagship as it charges
      this.charge = (t - ORB.CLIMB) / (ORB.FIRE - ORB.CLIMB);
      const u = ease((t - ORB.CLIMB) / 30);
      cam.setZoom(lerp(0.5, 1.4, u));
      f.x = lerp(this.tx, this.x, u); f.y = this.y + 60 * u; // a little toward the bow
    }
    if (t === ORB.FIRE) {
      this.hit = beamTrace(g.terrain, g.targets(), null, e.x, e.y + 4, e.x, WORLD_BOTTOM);
      this.hitY = this.hit.y;
      this.beam = 1;
      g.screenFlash = Math.max(g.screenFlash || 0, 0.4);
      g.sfx.satFire();
    }
    if (t > ORB.FIRE && t <= ORB.HIT) { // roll back level and ride the beam down
      const u = ease((t - ORB.FIRE) / (ORB.HIT - ORB.FIRE));
      cam.rot = -Math.PI / 2 * (1 - Math.min(1, u * 1.6));
      cam.setZoom(lerp(1.4, Math.min(this.zoom0, 0.6), Math.min(1, u * 2)));
      f.x = lerp(this.x, e.x, Math.min(1, u * 3));
      f.y = lerp(e.y, this.hitY - 220, u);
    }
    if (t === ORB.HIT) {
      cam.rot = 0;
      g.explode(e.x, this.hitY, { dmg: this.cfg.dmg, dmgR: this.cfg.r, explR: 60, visR: 520, from: { x: 0, y: -1 } }, this.owner, 'laser');
      for (let i = 0; i < 90; i++) { // the shockwave, running out along the ground and up
        const a = -Math.PI * Math.random(), sp = 6 + Math.random() * 10;
        g.particles.add({ x: e.x, y: this.hitY - 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, g: 0.02, drag: 0.93, life: 0.9 + Math.random() * 0.6, size: 8 + Math.random() * 14, color: i % 3 ? [200, 220, 255] : [255, 255, 255] });
      }
      g.shake = Math.max(g.shake, 34);
      g.screenFlash = Math.max(g.screenFlash || 0, 0.9);
      g.sfx.explosion(70);
    }
    if (t === ORB.VOLLEY) g.ui.notice('The fleet opens fire.');
    // the rest of the fleet: shots coming down from far overhead, in from where each ship is
    const v = this.cfg.volley;
    for (const s of this.volley) {
      if (s.at !== t) continue;
      const y = g.terrain.hAt(s.x), top = cam.y - 200;
      const sx = s.x + (s.sx - this.tx) * ((y - top) / ORB_ALT); // angled toward the ship that fired it
      g.lasers.push(new Laser(sx, top, s.x, y, (t & 1) ? '#5a8aff' : '#d0e0ff', 16, 26));
      g.explode(s.x, y, { dmg: v.dmg, dmgR: v.r, explR: 8, from: { x: sx - s.x, y: top - y } }, this.owner, 'laser');
      if (t % 3 === 0) g.sfx.laser();
      g.shake = Math.max(g.shake, 7);
    }
    cam.follow(f);
    if (t < ORB.HIT) cam.snap(); // the set piece drives the camera itself
    if (t > ORB.HIT && t <= ORB.HIT + 30) cam.setZoom(lerp(Math.min(this.zoom0, 0.6), Math.min(this.zoom0, 0.7), (t - ORB.HIT) / 30));
    if (t > ORB.VOLLEY + ORB.VOLLEY_LEN && t <= ORB.VOLLEY + ORB.VOLLEY_LEN + 30) cam.setZoom(lerp(Math.min(this.zoom0, 0.7), this.zoom0, (t - ORB.VOLLEY - ORB.VOLLEY_LEN) / 30));
    if (t > ORB.HIT + 10) { this.beam = Math.max(0, this.beam - 1 / 40); this.charge = Math.min(this.charge, this.beam); }
    if (t >= ORB.END) { cam.rot = 0; cam.ceil = -1000; g.ascent = 0; return false; }
    return true;
  }

  draw(ctx) {
    const time = this.game.time, x = this.x, y = this.y;
    const at = (p) => fleetAt(p[0], p[1]);
    for (const p of FLEET.far) { const [dx, dy] = at(p); drawScaled(ctx, x + dx, y + dy, 0.3, 0.35, () => drawBattlecruiser(ctx, 0, 0, 1, time + dx, true)); }
    for (const p of FLEET.mid) { const [dx, dy] = at(p); drawScaled(ctx, x + dx, y + dy, 0.55, 0.6, () => drawBattlecruiser(ctx, 0, 0, 1, time + dx, true)); }
    for (const p of FLEET.frigates) { const [dx, dy] = at(p); drawFrigate(ctx, Math.round(x + dx), Math.round(y + dy), time + dx, true); }
    for (const p of FLEET.escorts) { const [dx, dy] = at(p); drawBattlecruiser(ctx, x + dx, y + dy, 1, time + dx, true, 0); }
    drawBattlecruiser(ctx, x, y, 1, time, true, this.charge);
    if (this.beam > 0) {
      const e = this.emit, w = 26 * this.beam + 6;
      ctx.fillStyle = `rgba(80,130,255,${0.5 * this.beam})`;
      ctx.fillRect(Math.round(e.x - w), Math.round(e.y), Math.round(w * 2), Math.round(this.hitY - e.y));
      ctx.fillStyle = `rgba(235,242,255,${this.beam})`;
      ctx.fillRect(Math.round(e.x - w * 0.35), Math.round(e.y), Math.round(w * 0.7), Math.round(this.hitY - e.y));
    }
  }
}

// ------------------------------------------------------------------------- MAIA array
// Innocentia's Constellation. The dot lands and nothing happens. The camera drifts up to MAIA and
// the eye at her core opens; in flashes the whole sky fills with MAIAs, a vast one behind them all.
// They unfold and charge, the camera comes down to the mark, and it is hit by wave after wave of
// MAIA fire across a wide area; on the last, the vast MAIA charges and a massive beam comes down.
const ARRAY = { PAN: 30, AT: 70, EYE: 108, FILL: 182, CHARGE: 214, DOWN: 238, WAVES: 244, WAVE_GAP: 30, WAVE_SHOTS: 40, WAVE_LEN: 22, BIG_CHARGE: 404, BIG_FIRE: 446, END: 580 };
const ARRAY_BURSTS = [114, 130, 146, 162]; // the sky fills in four flashes
class MaiaArray {
  constructor(game, owner, at, cfg) {
    this.game = game;
    this.owner = owner;
    this.cfg = cfg;
    this.tx = at.x;
    this.ground = Math.min(game.terrain.hAt(at.x), at.y);
    this.t = 0;
    this.eye = 0; // 0..1, the eye at MAIA's core opening
    this.big = 0; // the vast MAIA's charge
    this.opensMaia = false; // MAIA herself unfolds for the barrage (Game.step)
    this.zoom0 = game.cam.zoom;
    this.focus = { x: this.tx, y: this.ground - 200 };
    const sky = this.ground - 1500;
    // the array: foreground MAIAs (full art, scaled down) and far ones (silhouettes), each appearing
    // in one of the bursts; positions from the seeded rng so a replay matches
    this.fore = [];
    for (let i = 0; i < cfg.fore; i++) {
      const m = new Satellite();
      m.tier = 1 + Math.floor(hash2(i, 77) * 3); m.t = i * 37; m.v = makeMaiaVariant(i + 1); // no two quite alike
      this.fore.push({ m, x: this.tx + (rng.next() * 2 - 1) * 1400, y: sky + 250 + rng.next() * 750, sc: 0.55 + rng.next() * 0.35, at: ARRAY_BURSTS[i % 4] });
    }
    this.far = []; // further off, behind the hills, hazed
    for (let i = 0; i < cfg.far; i++) {
      const m = new Satellite();
      m.tier = 1 + Math.floor(hash2(i, 91) * 3); m.t = i * 53; m.v = makeMaiaVariant(100 + i);
      this.far.push({ m, x: this.tx + (rng.next() * 2 - 1) * 1900, y: sky - 100 + rng.next() * 900, sc: 0.2 + rng.next() * 0.16, at: ARRAY_BURSTS[i % 4] + 4 });
    }
    // the vast one: its body as big as a mountain, hanging low over the mark behind the hills
    this.giant = new Satellite();
    this.giant.tier = 3;
    this.giantAt = { x: this.tx, y: this.ground - 1150, sc: 8 };
    this.bigEye = 0;
    game.cam.ceil = sky - 1600; // the camera may climb to see it all
    // (it pulls back to the whole width of the map, never past its edges: CAM_FULL)
    // the barrage: every shot's mark, from the seeded rng
    this.shots = [];
    for (let w = 0; w < cfg.waves; w++) {
      for (let i = 0; i < ARRAY.WAVE_SHOTS; i++) {
        const x = clamp(this.tx + (rng.next() * 2 - 1) * cfg.spread * (0.4 + 0.6 * rng.next()), 4, WORLD_W - 4);
        this.shots.push({ x, at: ARRAY.WAVES + w * ARRAY.WAVE_GAP + Math.round(rng.next() * ARRAY.WAVE_LEN), src: Math.floor(rng.next() * 1e6) });
      }
    }
    game.cam.follow(this.focus);
  }

  // a foreground MAIA's emitter, in the world
  lensOf(f) { const l = f.m.lens(); return { x: f.x + l.x * f.sc, y: f.y + l.y * f.sc }; }

  update() {
    const g = this.game, cam = g.cam, t = ++this.t, sat = g.satellite;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    const f = this.focus, sc = sat.center();
    if (t > ARRAY.PAN && t <= ARRAY.AT) { // up to MAIA
      const u = ease((t - ARRAY.PAN) / (ARRAY.AT - ARRAY.PAN));
      f.x = lerp(this.tx, sc.x, u); f.y = lerp(this.ground - 200, sc.y + 120, u);
      cam.setZoom(lerp(this.zoom0, 1.15, u));
    }
    if (t > ARRAY.AT && t <= ARRAY.EYE) { this.eye = ease((t - ARRAY.AT) / (ARRAY.EYE - ARRAY.AT)); f.x = sc.x; f.y = sc.y + 120; }
    if (t === ARRAY.AT + 10) g.ui.notice('MAIA opens her eye.');
    if (t > ARRAY.EYE && t <= ARRAY.FILL) { // pulling back as the sky fills
      const u = ease((t - ARRAY.EYE) / (ARRAY.FILL - ARRAY.EYE));
      f.x = lerp(sc.x, this.tx, u); f.y = lerp(sc.y + 120, this.ground - 1100, u);
      cam.zmin = CAM_FULL;
      cam.setZoom(lerp(1.15, CAM_FULL, u));
    }
    if (ARRAY_BURSTS.includes(t)) { g.screenFlash = Math.max(g.screenFlash || 0, 0.55); g.sfx.satPrep(); }
    if (t === ARRAY.FILL) g.ui.notice('Constellation online.');
    if (t >= ARRAY.FILL) this.opensMaia = true;
    for (const q of this.fore) {
      q.m.barrage = t >= ARRAY.FILL;
      q.m.update();
      q.m.lookAt({ x: (this.tx - q.x) / q.sc, y: (this.ground - q.y) / q.sc });
      q.m.charge = t >= ARRAY.FILL ? clamp((t - ARRAY.FILL) / (ARRAY.CHARGE - ARRAY.FILL), 0, 1) : 0;
    }
    for (const q of this.far) { q.m.barrage = t >= ARRAY.FILL; q.m.update(); q.m.lookAt({ x: (this.tx - q.x) / q.sc, y: (this.ground - q.y) / q.sc }); q.m.charge = q.m.barrage ? 0.6 : 0; }
    this.giant.update();
    if (t > ARRAY.BIG_CHARGE - 50) this.bigEye = ease((t - ARRAY.BIG_CHARGE + 50) / 50); // its eye opens before it charges
    this.giant.lookAt({ x: (this.tx - this.giantAt.x) / this.giantAt.sc, y: (this.ground - this.giantAt.y) / this.giantAt.sc });
    if (t > ARRAY.CHARGE && t <= ARRAY.WAVES) { // down to the mark, the array still overhead
      const u = ease((t - ARRAY.CHARGE) / (ARRAY.WAVES - ARRAY.CHARGE));
      f.x = this.tx; f.y = lerp(this.ground - 1100, this.ground - 650, u);
      cam.setZoom(lerp(CAM_FULL, 0.48, u));
    }
    // the barrage
    for (const s of this.shots) {
      if (s.at !== t) continue;
      const src = this.fore.length && s.src % 3 ? this.lensOf(this.fore[s.src % this.fore.length]) : (() => { const q = this.far[s.src % this.far.length]; return { x: q.x, y: q.y }; })();
      const y = g.terrain.hAt(s.x);
      g.lasers.push(new Laser(src.x, src.y, s.x, y, s.src % 2 ? '#bfe8ff' : '#ffc0e8', 10, 26));
      g.explode(s.x, y, { maia: true, dmg: this.cfg.dmg, dmgR: this.cfg.r, explR: 8, from: { x: src.x - s.x, y: src.y - y } }, this.owner, 'laser');
      if (t % 4 === 0) g.sfx.satFire();
      g.shake = Math.max(g.shake, 8);
    }
    // the last wave: the vast MAIA
    if (t > ARRAY.BIG_CHARGE && t <= ARRAY.BIG_FIRE) {
      this.big = (t - ARRAY.BIG_CHARGE) / (ARRAY.BIG_FIRE - ARRAY.BIG_CHARGE);
      this.giant.charge = this.big;
      cam.setZoom(lerp(0.48, CAM_FULL, ease(this.big)));
      f.y = lerp(this.ground - 650, this.ground - 950, ease(this.big));
      if (t === ARRAY.BIG_CHARGE + 1) g.sfx.satPrep();
    }
    if (t === ARRAY.BIG_FIRE) {
      const l = this.giant.lens(), G = this.giantAt;
      this.beam = { x: G.x + l.x * G.sc, y: G.y + l.y * G.sc };
      const y = g.terrain.hAt(this.tx);
      g.lasers.push(new Laser(this.beam.x, this.beam.y, this.tx, y, '#ffe8f6', 280, 100));
      const B = this.cfg.final;
      g.explode(this.tx, y, { maia: true, dmg: B.dmg, dmgR: B.r, explR: B.explR, visR: 460, from: { x: this.beam.x - this.tx, y: this.beam.y - y } }, this.owner, 'laser');
      g.shake = Math.max(g.shake, 34);
      g.screenFlash = Math.max(g.screenFlash || 0, 0.85);
      g.sfx.satFire(); g.sfx.explosion(70);
      this.giant.charge = 0;
    }
    if (t > ARRAY.BIG_FIRE + 40 && t <= ARRAY.BIG_FIRE + 80) cam.setZoom(lerp(CAM_FULL, this.zoom0, ease((t - ARRAY.BIG_FIRE - 40) / 40)));
    cam.follow(f);
    if (t <= ARRAY.BIG_FIRE + 40) cam.snap();
    if (t >= ARRAY.END) { this.opensMaia = false; cam.zmin = 0; cam.ceil = -1000; cam.wide = 0; return false; }
    return true;
  }

  // the array fades out at the end, everything in the order it arrived
  fade() { return 1 - clamp((this.t - ARRAY.BIG_FIRE - 50) / 80, 0, 1); }

  // behind the hills: the vast MAIA, its eye, and the far array
  drawBack(ctx) {
    const t = this.t, time = this.game.time, fade = this.fade();
    if (t >= ARRAY_BURSTS[3]) {
      const G = this.giantAt, a = Math.min(1, (t - ARRAY_BURSTS[3]) / 30) * fade;
      drawScaled(ctx, G.x, G.y, G.sc, 0.7 * a, () => { this.giant.x = 0; this.giant.y = 0; this.giant.draw(ctx); });
      if (this.bigEye > 0) { ctx.globalAlpha = 0.9 * a; drawMaiaEye(ctx, G.x, G.y, this.bigEye, G.sc * 0.9); ctx.globalAlpha = 1; }
      if (this.big > 0 && t < ARRAY.BIG_FIRE) { // gathering light at its emitter
        const l = this.giant.lens();
        ctx.fillStyle = `rgba(255,220,240,${0.3 + 0.6 * this.big})`;
        sq(ctx, G.x + l.x * G.sc, G.y + l.y * G.sc, 80 + 300 * this.big + Math.sin(time * 30) * 16);
      }
    }
    for (const q of this.far) {
      if (t < q.at) continue;
      const a = Math.min(1, (t - q.at) / 6) * fade;
      drawScaled(ctx, q.x, q.y, q.sc, 0.55 * a, () => { q.m.x = 0; q.m.y = 0; q.m.draw(ctx); });
      if (t - q.at < 6) { ctx.fillStyle = `rgba(255,255,255,${1 - (t - q.at) / 6})`; sq(ctx, q.x, q.y, 200 * q.sc); }
    }
  }

  draw(ctx) {
    const t = this.t, fade = this.fade();
    // the foreground array
    for (const q of this.fore) {
      if (t < q.at) continue;
      const a = Math.min(1, (t - q.at) / 5) * fade;
      drawScaled(ctx, q.x, q.y, q.sc, a, () => { q.m.x = 0; q.m.y = 0; q.m.draw(ctx); });
      if (t - q.at < 8) { ctx.fillStyle = `rgba(255,255,255,${1 - (t - q.at) / 8})`; sq(ctx, q.x, q.y, 260 * q.sc); }
    }
    // the eye at MAIA's core
    if (this.eye > 0 && fade > 0) {
      const c = this.game.satellite.center();
      ctx.globalAlpha = fade;
      drawMaiaEye(ctx, c.x, c.y, this.eye, 1);
      ctx.globalAlpha = 1;
    }
  }
}

// an eye at a MAIA's core, open by o (0..1), k times MAIA's own size: lids parting on a white eye,
// a magenta iris and a slit pupil
function drawMaiaEye(ctx, cx, cy, o, k) {
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(cx + x * k), Math.round(cy + y * k), Math.ceil(w * k), Math.ceil(h * k)); };
  R(-30, -1, 60, 2, '#17172f'); // the closed lid line
  for (let y = -16; y < 16; y += 2) {
    const v = (y + 1) / 16, half = 28 * Math.sqrt(Math.max(0, 1 - v * v));
    if (Math.abs(y + 1) > 16 * o) continue;
    R(-half, y, half * 2, 2, '#fff6fb');
  }
  const ir = 11 * Math.min(1, o * 1.4);
  for (let y = -ir; y < ir; y += 2) {
    if (Math.abs(y + 1) > 16 * o) continue;
    const w = Math.sqrt(Math.max(0, ir * ir - (y + 1) * (y + 1)));
    R(-w, y, w * 2, 2, Math.abs(y) < ir * 0.5 ? '#e0409a' : '#a01e6a');
  }
  R(-1.5, -Math.min(9, 16 * o), 3, Math.min(18, 32 * o), '#12020c'); // slit pupil
  R(3, -6 * o, 3, 3, '#ffffff');
  R(-30, -16 * o - 2, 60, 3, '#17172f'); // lashes on the lids as they part
  R(-26, 16 * o - 1, 52, 2, '#17172f');
}

// ------------------------------------------------------------------------ the Naito MAIA
// Object 15X's Zero Point. The slug is a probe. The camera goes to MAIA and rushes up past the NXi
// fleet and the asteroid belt into the dark; the scene fades to Jupiter, vast on the left, and
// something stirs in the Great Red Spot. The view climbs and bleeds to red: the Naito MAIA
// Containment Satellite (Hatsuyuki's own MAIA is their attempt at one) slides down from above,
// a battery of barrels pointing down. "Annihilation orders received." It charges; cut to Jupiter
// further off, a beam leaving the spot; the camera plunges back to the whole map, and the ground
// around the probe is simply deleted: no explosion, sheer black cliffs, molten lips, the beam
// thinning to mist. Anything that falls in is gone (Terrain.erase, Game.landed).
// Screen-space scenes (Jupiter, the satellite) are drawn over everything by drawScreen.
const NAITO = { TO_MAIA: 20, UP: 50, SPACE: 150, FADE: 168, JUP: 172, STIR: 205, RISE: 262, RED: 290, SAT: 300, ORDERS: 352, CHARGE: 372, CUT: 432, DIVE: 476, HIT: 512, ERASE: 14, END: 650 };
const NAITO_SKY = 9000; // how far the climb goes before the fade
let _jupiter = null;
// Jupiter, painted once into a small offscreen canvas of chunky pixels: banded, limb-darkened,
// the Great Red Spot below the equator
function jupiterCanvas() {
  if (_jupiter) return _jupiter;
  const N = 220, c = document.createElement('canvas');
  c.width = c.height = N;
  const x = c.getContext('2d');
  const bands = [[232, 214, 186], [196, 150, 110], [238, 226, 204], [170, 118, 84], [226, 200, 160], [150, 104, 78], [236, 220, 190], [204, 160, 120], [180, 132, 96], [228, 210, 178]];
  const r = N / 2;
  for (let py = 0; py < N; py += 2) {
    for (let px = 0; px < N; px += 2) {
      const dx = (px - r + 1) / r, dy = (py - r + 1) / r, d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      const lat = dy + 0.04 * Math.sin(dx * 9 + dy * 4) + 0.02 * Math.sin(dx * 23);
      const b = bands[clamp(Math.floor(((lat + 1) / 2) * bands.length * 1.6), 0, 1e3) % bands.length];
      let col = b;
      const sx = (dx - 0.32) / 0.2, sy = (dy - 0.36) / 0.11, s2 = sx * sx + sy * sy; // the spot
      if (s2 < 1) col = s2 < 0.25 ? [196, 70, 48] : s2 < 0.6 ? [214, 104, 70] : [230, 150, 110];
      const lim = 0.35 + 0.65 * Math.sqrt(1 - d2);
      x.fillStyle = `rgb(${Math.round(col[0] * lim)},${Math.round(col[1] * lim)},${Math.round(col[2] * lim)})`;
      x.fillRect(px, py, 2, 2);
    }
  }
  return (_jupiter = c);
}
// where the spot sits on that canvas, as a fraction of its size
const JUP_SPOT = [0.5 + 0.32 / 2, 0.5 + 0.36 / 2];

// the Naito MAIA: a satellite built around one gun. A bus at the top (radiators, solar wings off both
// sides, dishes, an antenna mast) sits on the breech of an enormous barrel pointing straight down,
// sheathed in accelerator rings, with a heavy muzzle at the bottom. Screen units, centred on the
// breech; `charge` lights the rings toward the muzzle and fills the bore.
function drawNaito(ctx, cx, cy, charge, time) {
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(cx + x), Math.round(cy + y), Math.round(w), Math.round(h)); };
  const dark = '#1c1a22', plate = '#3a3644', edge = '#5c5670', light = '#857c98', red = '#ff2f4a';
  // solar wings, off the edges of the screen, on long trusses
  for (const s of [-1, 1]) {
    R(s > 0 ? 160 : -1300, -330, 1140, 14, plate); // truss
    for (let i = 0; i < 12; i++) {
      const x = s * (220 + i * 92);
      R(s > 0 ? x : x - 84, -470, 84, 120, i % 2 ? '#1e2846' : '#24305a'); // cells, above the truss
      R(s > 0 ? x : x - 84, -310, 84, 120, i % 2 ? '#24305a' : '#1e2846'); // and below
      R(s > 0 ? x : x - 84, -470, 84, 3, edge); R(s > 0 ? x : x - 84, -193, 84, 3, edge);
    }
  }
  // the bus: a stack of armoured blocks, radiator fins, dishes, the mast
  R(-170, -520, 340, 260, plate); R(-170, -520, 340, 6, light); R(-170, -266, 340, 6, dark);
  for (let i = 0; i < 7; i++) R(-150 + i * 46, -490, 30, 200, i % 2 ? dark : '#2c2934'); // panel seams
  R(-120, -620, 240, 100, plate); R(-120, -620, 240, 5, light);
  for (let i = 0; i < 9; i++) R(-110 + i * 26, -700, 14, 80, edge); // radiator fins
  R(-8, -900, 16, 200, dark); R(-50, -820, 100, 8, edge); R(-80, -760, 160, 8, edge); // antenna mast
  if ((time * 2 | 0) % 2) R(-6, -916, 12, 12, red);
  for (const s of [-1, 1]) { // dishes
    R(s * 210 - 40, -610, 80, 14, light); R(s * 210 - 26, -624, 52, 14, edge); R(s * 210 - 4, -596, 8, 40, dark);
  }
  // the breech: the gun's heavy end, wider than the bus, gripped by clamps
  R(-300, -260, 600, 180, dark); R(-300, -260, 600, 8, edge);
  for (let i = 0; i < 6; i++) R(-280 + i * 96, -240, 56, 140, plate);
  for (const s of [-1, 1]) { R(s * 310 - 34, -280, 68, 240, plate); R(s * 310 - 34, -280, 68, 6, light); }
  // the barrel: long, banded with accelerator rings that light in turn as it charges
  const L = 1250, bw = 320;
  R(-bw / 2, -80, bw, L, '#2a2632'); R(-bw / 2, -80, 30, L, edge); R(bw / 2 - 26, -80, 26, L, dark); R(-bw / 2 + 60, -80, 8, L, '#34303e');
  const n = 9;
  for (let k = 0; k < n; k++) {
    const y = -40 + k * (L - 140) / (n - 1), lit = charge * n > k;
    R(-bw / 2 - 26, y, bw + 52, 38, lit ? '#ff3a6a' : plate);
    R(-bw / 2 - 26, y, bw + 52, 5, lit ? '#ffd0dc' : light);
    if (lit) R(-bw / 2 - 40, y + 10, bw + 80, 18, 'rgba(255,60,110,0.35)');
  }
  // the muzzle, and the bore filling with light
  R(-bw / 2 - 50, L - 120, bw + 100, 70, plate); R(-bw / 2 - 50, L - 120, bw + 100, 6, light);
  R(-120, L - 50, 240, 20, dark);
  if (charge > 0) {
    const g = charge * (0.7 + 0.3 * Math.sin(time * 24));
    R(-110, L - 52, 220, 30 + 120 * g, `rgba(255,70,130,${g})`);
    R(-50, L - 48, 100, 40 + 160 * g, `rgba(255,235,245,${g})`);
  }
  // warning lights down the barrel
  for (let i = 0; i < 10; i++) if (((time * 3 | 0) + i) % 3 === 0) R(-bw / 2 - 8, i * 140, 8, 8, red);
}

class NaitoStrike {
  constructor(game, owner, at, cfg) {
    this.game = game;
    this.owner = owner;
    this.cfg = cfg;
    this.tx = at.x;
    this.ground = Math.min(game.terrain.hAt(at.x), at.y);
    this.t = 0;
    this.zoom0 = game.cam.zoom;
    const sc = game.satellite.center();
    this.sat = { x: sc.x, y: sc.y };
    this.focus = { x: this.tx, y: this.ground - 200 };
    this.cut = 0; // the half-width deleted so far
    this.beam = 0;
    this.mist = [];
    game.cam.ceil = this.sat.y - NAITO_SKY - 2000;
    game.cam.follow(this.focus);
  }

  update() {
    const g = this.game, cam = g.cam, t = ++this.t, f = this.focus, N = NAITO;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    if (t > N.TO_MAIA && t <= N.UP) { // over to MAIA
      const u = ease((t - N.TO_MAIA) / (N.UP - N.TO_MAIA));
      f.x = lerp(this.tx, this.sat.x, u); f.y = lerp(this.ground - 200, this.sat.y + 60, u);
    }
    if (t > N.UP && t <= N.FADE) { // and straight up, past the fleet and the belt, into the dark
      const u = Math.pow((t - N.UP) / (N.FADE - N.UP), 1.6);
      f.x = this.sat.x; f.y = lerp(this.sat.y + 60, this.sat.y - NAITO_SKY, u);
      g.ascent = Math.min(1, (t - N.UP) / 20); g.ascentDir = 1;
    }
    if (t === N.FADE) g.ascent = 0;
    if (t === N.JUP) g.ui.notice('A signal from the Great Red Spot.');
    if (t === N.SAT) g.ui.notice('Naito MAIA Containment Satellite.');
    if (t === N.ORDERS) { g.ui.notice('Annihilation orders received.'); g.events.push('Annihilation orders received.'); g.sfx.satPrep(); }
    if (t === N.CUT) g.sfx.satFire();
    if (t === N.DIVE) { // back down to the battlefield, the whole of it
      cam.zmin = CAM_FULL;
      cam.setZoom(CAM_FULL);
      f.x = WORLD_W / 2; f.y = this.ground - 4000;
    }
    if (t > N.DIVE && t <= N.HIT) {
      const u = ease((t - N.DIVE) / (N.HIT - N.DIVE));
      f.x = WORLD_W / 2; f.y = lerp(this.ground - 4000, WORLD_BOTTOM * 0.45, u);
      g.ascent = 1 - u; g.ascentDir = -1;
    }
    if (t === N.HIT) { g.ascent = 0; this.beam = 1; g.screenFlash = Math.max(g.screenFlash || 0, 0.5); g.terrain.voidOwner = this.owner; }
    // the deletion: no blast, just gone, the cut widening over a few frames
    if (t > N.HIT && t <= N.HIT + N.ERASE) {
      const r = this.cfg.r * ((t - N.HIT) / N.ERASE);
      g.terrain.erase(this.tx - r, this.tx + r);
      for (const l of g.bg.layers || []) for (let x = Math.max(0, Math.floor(this.tx - r)); x <= Math.min(WORLD_W - 1, this.tx + r); x++) l.height[x] = VOID_Y; // the background too
      this.cut = r;
      for (const c of g.crates) if (c.alive && Math.abs(c.x - this.tx) < r) c.alive = false;
      g.shake = Math.max(g.shake, 6);
    }
    if (t === N.HIT + N.ERASE) {
      g.events.push('The ground is gone.');
      for (let i = 0; i < 40; i++) { // molten flecks off the lips
        const side = i % 2 ? 1 : -1, x = this.tx + side * (this.cut + 4);
        const a = -Math.PI / 2 + side * (0.2 + rng.next() * 0.6), sp = 1 + rng.next() * 4;
        g.drops.push(new AcidDrop(g, this.owner, x, g.terrain.hAt(x) - 4, Math.cos(a) * sp, Math.sin(a) * sp, 6, true));
      }
    }
    if (t > N.HIT + N.ERASE) {
      this.beam = Math.max(0, this.beam - 1 / 90);
      if (t % 2 === 0 && this.beam > 0) { // thinning to mist
        g.particles.add({ x: this.tx + (Math.random() * 2 - 1) * this.cut, y: lerp(cam.y, this.ground, Math.random()), vx: (Math.random() - 0.5) * 0.6, vy: -0.2 - Math.random() * 0.4, g: 0, drag: 0.99, life: 1.5 + Math.random(), size: 30 + Math.random() * 50, color: Math.random() < 0.5 ? [230, 220, 255] : [255, 200, 230] });
      }
    }
    if (t > N.HIT + 90 && t <= N.HIT + 130) cam.setZoom(lerp(CAM_FULL, this.zoom0, ease((t - N.HIT - 90) / 40)));
    if (t === N.HIT + 90) f.x = this.tx, f.y = this.ground - 200;
    cam.follow(f);
    if (t <= N.HIT + 90) cam.snap();
    if (t >= N.END) { cam.zmin = 0; cam.wide = 0; cam.ceil = -1000; g.ascent = 0; g.ascentDir = 1; return false; }
    return true;
  }

  // in the world: the fleet and the belt passed on the way up, and the beam over the cut
  draw(ctx) {
    const time = this.game.time, x = this.sat.x;
    const fy = this.sat.y - NAITO_SKY * 0.45, by = this.sat.y - NAITO_SKY * 0.8;
    drawBattlecruiser(ctx, Math.round(x + 480), Math.round(fy), -1, time);
    drawBattlecruiser(ctx, Math.round(x - 420), Math.round(fy + 300), 1, time + 1);
    drawFrigate(ctx, Math.round(x + 60), Math.round(fy - 220), time, false);
    for (let i = 0; i < 14; i++) {
      const R = 20 + hash2(i, 3) * 70;
      ctx.fillStyle = i % 3 ? '#5a5048' : '#6e645a';
      const rx = x + (hash2(i, 7) - 0.5) * 2200, ry = by + (hash2(i, 9) - 0.5) * 900;
      for (let y = -R; y < R; y += 10) { const w = 2 * Math.sqrt(R * R - (y + 5) * (y + 5)) * (0.8 + 0.2 * hash2(i, y)); ctx.fillRect(Math.round(rx - w / 2), Math.round(ry + y), Math.round(w), 10); }
    }
    if (this.beam > 0) {
      const cam = this.game.cam, w = Math.max(this.cut, this.cfg.r * 0.2) * (0.6 + 0.4 * this.beam);
      ctx.fillStyle = `rgba(255,120,190,${0.25 * this.beam})`; ctx.fillRect(Math.round(this.tx - w * 1.15), cam.y - 100, Math.round(w * 2.3), this.ground - cam.y + 300);
      ctx.fillStyle = `rgba(255,236,250,${0.55 * this.beam})`; ctx.fillRect(Math.round(this.tx - w * 0.7), cam.y - 100, Math.round(w * 1.4), this.ground - cam.y + 300);
    }
  }

  // over everything, in screen units (W x H): the scenes out past the belt
  drawScreen(ctx) {
    const t = this.t, N = NAITO, time = this.game.time;
    if (t < N.SPACE || t > N.DIVE + 10) return;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    const black = (a) => { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); };
    if (t < N.JUP) { black(clamp((t - N.SPACE) / (N.FADE - N.SPACE), 0, 1)); return; }
    const stars = (tint) => { for (let i = 0; i < 90; i++) { ctx.fillStyle = tint; ctx.fillRect(Math.round(hash2(i, 1) * W), Math.round(hash2(i, 2) * H), 2, 2); } };
    ctx.imageSmoothingEnabled = false;
    if (t < N.SAT) {
      // Jupiter, bigger than the screen, the view drifting up off it and bleeding to red
      const rise = ease((t - N.RISE) / (N.RED - N.RISE)) * 500;
      ctx.fillStyle = '#04030a'; ctx.fillRect(0, 0, W, H);
      stars('rgba(255,255,255,0.7)');
      const S = 900, jx = -380, jy = -120 + rise;
      ctx.drawImage(jupiterCanvas(), jx, jy, S, S);
      const spx = jx + JUP_SPOT[0] * S, spy = jy + JUP_SPOT[1] * S;
      if (t > N.STIR) { // something coming up out of the spot
        const u = ease((t - N.STIR) / (N.RISE - N.STIR));
        ctx.fillStyle = `rgba(20,8,16,${u})`; ctx.fillRect(Math.round(spx - 4 - 8 * u), Math.round(spy - 30 * u - 4), Math.round(8 + 16 * u), Math.round(8 + 10 * u));
        ctx.fillStyle = `rgba(255,60,90,${u * (0.5 + 0.5 * Math.sin(time * 8))})`; ctx.fillRect(Math.round(spx - 2), Math.round(spy - 30 * u - 2), 4, 4);
      }
      if (t < N.JUP + 16) black(1 - (t - N.JUP) / 16);
      if (t > N.RISE) { ctx.fillStyle = `rgba(120,0,16,${ease((t - N.RISE) / (N.RED - N.RISE))})`; ctx.fillRect(0, 0, W, H); }
      return;
    }
    if (t < N.CUT) {
      // the red: the Naito MAIA sliding down from above, then charging
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#2a0008'); g.addColorStop(1, '#6a0014');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      stars('rgba(255,140,150,0.5)');
      const u = ease((t - N.SAT) / (N.ORDERS - N.SAT));
      const charge = clamp((t - N.CHARGE) / (N.CUT - N.CHARGE - 8), 0, 1);
      const shake = charge > 0.6 ? (Math.random() - 0.5) * 8 * charge : 0;
      ctx.save();
      ctx.translate(W / 2 + shake, 0);
      ctx.scale(0.3, 0.3);
      drawNaito(ctx, 0, lerp(-1500, 620, u), charge, time); // sliding down from above, the whole length of it in view
      ctx.restore();
      ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left';
      if (t > N.SAT + 20) { ctx.textAlign = 'center'; ctx.fillStyle = `rgba(255,200,205,${clamp((t - N.SAT - 20) / 20, 0, 1)})`; ctx.fillText('NAITO MAIA  //  CONTAINMENT SATELLITE', W / 2, Math.round(H * 0.17)); }
      if (t > N.ORDERS) {
        ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = (time * 4 | 0) % 2 ? '#ff4060' : '#ffd0d8';
        ctx.fillText('ANNIHILATION ORDERS RECEIVED', W / 2, H / 2 + 200 * 0 + 20);
      }
      if (t < N.SAT + 10) { ctx.fillStyle = `rgba(120,0,16,${1 - (t - N.SAT) / 10})`; ctx.fillRect(0, 0, W, H); }
      if (charge > 0.95) { ctx.fillStyle = 'rgba(255,230,240,0.8)'; ctx.fillRect(0, 0, W, H); }
      return;
    }
    // cut: Jupiter from further off, the beam leaving the spot
    ctx.fillStyle = '#04030a'; ctx.fillRect(0, 0, W, H);
    stars('rgba(255,255,255,0.7)');
    const S = 360, jx = 70, jy = 110;
    ctx.drawImage(jupiterCanvas(), jx, jy, S, S);
    const spx = jx + JUP_SPOT[0] * S, spy = jy + JUP_SPOT[1] * S;
    const u = ease((t - N.CUT) / 24);
    for (let i = 0; i < 40; i++) { // a beam toward us, widening as it comes
      const k = i / 40 * u, bx = lerp(spx, W + 200, k), by = lerp(spy, H + 120, k), w = 4 + 120 * k * k;
      ctx.fillStyle = `rgba(255,90,170,${0.6})`; ctx.fillRect(Math.round(bx - w), Math.round(by - w), Math.round(w * 2), Math.round(w * 2));
      ctx.fillStyle = 'rgba(255,240,250,0.8)'; ctx.fillRect(Math.round(bx - w * 0.4), Math.round(by - w * 0.4), Math.round(w * 0.8), Math.round(w * 0.8));
    }
    if (t > N.DIVE - 14) black(clamp((t - N.DIVE + 14) / 14, 0, 1)); // and out, to the dive
    if (t > N.DIVE) { ctx.fillStyle = `rgba(0,0,0,${1 - (t - N.DIVE) / 10})`; ctx.fillRect(0, 0, W, H); }
  }
}

// ------------------------------------------------------------------------- G.W. battery
// G.W. Tiger's Ragnarök: the shell is a marker. The camera whips sideways a long way off the edge
// of the map to her platoon, dug in far behind the line: four G.W. Tiger SPGs (the Artillery II
// sprite) and a Karl-Gerät 60cm siege mortar on its rail siding. They raise their guns and ripple-
// fire, two rounds a gun, with batteries all along the ridge behind; the camera whips back as the
// rounds come screaming in at an angle across the area, and the Karl's lands last: an enormous
// blast and an earthquake.
const BATTERY = { OUT: 46, RAISE: 26, FIRE: 78, KARL: 140, BACK: 156, BACK_END: 190, LAND: 198, KARL_LAND: 284, END: 360 };
const BATTERY_OFF = 2600; // how far past the edge of the map the guns sit
const BATTERY_KM = 22; // what the caption calls that
const GW_P = 1.9; // world units per pixel of the G.W. sprite (tanks are a lot bigger than the girls)
const KARL_S = 1.9; // and per unit of the Karl's box art
const BATTERY_GUNS = [-1240, -1000, -760, -520]; // the G.W.s, from the Karl outward (x, before facing)
const BATTERY_MID = 640; // the middle of the platoon, from the Karl
// more batteries dug in along the background ridge (layer index, scale, count): the whole line is
// firing. Each of their rounds lands too, at half a G.W. round's damage.
const BATTERY_BACK = [[2, 0.5, 7], [2, 0.32, 9]];

// G.W. Tiger as Artillery II drew her (GW_Main.png, scaled down to pixel art): a tall casemate aft
// with a sloped front, a low glacis, interleaved road wheels and the folded recoil spade at the tail.
// Facing right; the bottom row stands on the ground point, centred.
const GW_SPRITE = [
  '..............oorro.....................................................................................',
  '............ooreeo......................................................................................',
  '...........oerdco.......................................................................................',
  '..........oddbbo........oooooooooooooooooooooooooo......................................................',
  '........ooccbao......ooorrrdeeeeeeeedddddddcccbbbboooooooo..............................................',
  '.......obcbaaao.....oerrreeedddeedddddddddddddeeeeeeeeeeeeo.............................................',
  '......obbbaaaoo....orrredddddddddddddddddddddddddeeeeeeeeeeo............................................',
  '.....ocbbaaaoaao..orredddddddddddddddddddddddddddddddddddeedo...........................................',
  '....ocbbaaaabco..oreedddddddddddddddddddddddddddddddddddddddco..........................................',
  '...odcbaaaaaco..oeeddddddddddddddddddddddddddddddddddddddddddo..........................................',
  '..orecaaaaaoo..oeeddddddddddddddddddddddddddddddddddddddddddddo.........................................',
  'o.ordooaaooro.oeeddddddddddddddddddddddddddddddddddddddddddddedo........................................',
  'rordo..oodroooeedddddddddddddddddddddddddddddddddddddddddddddeeco.......................................',
  'oroo....oeroeeedddddddddddddddddddddddddddddddddddddddddddddddddo.......................................',
  '.odooooo.orodddddddddddddddddddddddddddddddddddddddddddddddddddddo......................................',
  '..odcaaaoodddddddddddddddddddddddddddddddddddddddddddddddddddddddco.....................................',
  '...ooooo.oddddddddddddddddddddddddddddddddddddddddddddddddddddddddo.....................................',
  '........oedddddddddddddddddddddddddddddddddddddddddddddddddddddddddooooooooooooooooooo..................',
  '......ooddccccccccccccccccccccccccccccccccccdddddddddddddddddddccccccccccccccccddddccbooooooo...........',
  '.....oaoodcccccccccccccccccccccccccbbbbcbbbbbbbbbbbbbbbbccccbbbbbbbbbcccccccccccccccddddddccbooo........',
  '......ocedccccccccccccccccbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbcccccbccccccccddddddco.......',
  '.......oddccccccccccccccbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbccccccccccccccboooo...',
  '........odccccccccccccccccccbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbaaaaaaoo.',
  '........odcccbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaao',
  '.........oobbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaao',
  '..........oabaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbcbaaaaa',
  '...........oaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbccaaaoo',
  '............oaaaaaaaaaabccbbbbbbbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabcccbaaaabbcdcbaaao',
  '.............oaaaaaaaabdddcbabbbbcbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbaabbbaaabbbcdddcbaaabbbccaaaao',
  '..............oooaaaaacdddcaaabcdcccbaaabcdcbabccbbcddbabccbbcddcbbcdbbcdcbbcddbbcdddddddbbbbbbbbaaaaao.',
  '.................oaaaaccccbaaabddcccbaaacdddbbbccccdddcbbcccccdddccccccdddcccddcccdddccddbbbbbaoaaaaao..',
  '..................oooabccbaaoobddcccbaabcdccbabbccddddcaacccccccdccccccdddcccccbccddcbbccbbaoooooaaao...',
  '.....................oaabaao.obdcccbbaobcdccaabcccdcdcbaabccccccdcbbbccddccbbbbbcccccbbbbbaoooaaaaoo....',
  '......................oaaaooooocccbaaoobcdccaabcccccccbaabccbcccccbbccccccbbbbbbbbbbbbaaaaaaaaaooo......',
  '.......................oooaaaaoabbaao..obccbaabcbbbccbaaabcbabbbbabbcbbcbbaabbbbabbbbaoaaaaaooo.........',
  '..........................oooooaaaaaaooooaaaaoaaaaaaaaaoaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaoooo............',
  '...............................ooooooaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaoooooooooooooooooooo................'
];
const GW_PAL = { o: '#18181c', a: '#222228', b: '#383a40', c: '#4e5056', d: '#64666c', e: '#808288', f: '#a6a6ac', r: '#b0927c' };
const GW_PIVOT = [61, 9]; // sprite pixel the barrel leaves the casemate at
const GW_BARREL = 60; // its length, in sprite pixels
const _gwRuns = (() => {
  const out = [];
  GW_SPRITE.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const k = row[x];
      if (k === '.') { x++; continue; }
      let e = x + 1;
      while (e < row.length && row[e] === k) e++;
      out.push([k, x, y, e - x]);
      x = e;
    }
  });
  return out;
})();
// one G.W.: hull from the sprite (in its own greys, or toned for the background), then the barrel at
// elevation `elev`, recoiling, with a muzzle flash
function drawGWSPG(ctx, gx, gy, P, face, gun, tone) {
  const W = GW_SPRITE[0].length, H = GW_SPRITE.length;
  const x0 = gx - (W / 2) * P, y0 = gy - H * P;
  // the barrel first, so the casemate front covers its root
  const px = face > 0 ? x0 + GW_PIVOT[0] * P : x0 + (W - GW_PIVOT[0]) * P, py = y0 + GW_PIVOT[1] * P;
  const v = { x: Math.cos(gun.elev) * face, y: -Math.sin(gun.elev) };
  ctx.fillStyle = tone ? tone.c : '#3a3c42';
  for (let d = 0; d <= GW_BARREL; d += 1.2) {
    const s = d < 8 ? 4.4 : d > GW_BARREL - 5 ? 4.6 : 3; // collar, tube, the bulb of the muzzle brake
    const k = d - gun.recoil * 6;
    sq(ctx, px + v.x * k * P, py + v.y * k * P, s * P);
  }
  for (const [k, x, y, n] of _gwRuns) {
    ctx.fillStyle = tone ? (k === 'o' || k === 'a' ? tone.a : k === 'f' || k === 'r' || k === 'e' ? tone.e : tone.c) : GW_PAL[k];
    const lx = face > 0 ? x : W - x - n;
    ctx.fillRect(Math.round(x0 + lx * P), Math.round(y0 + y * P), Math.ceil(n * P), Math.ceil(P));
  }
  if (gun.flash > 0) {
    const m = { x: px + v.x * (GW_BARREL + 6) * P, y: py + v.y * (GW_BARREL + 6) * P };
    ctx.fillStyle = `rgba(255,236,170,${gun.flash})`; sq(ctx, m.x, m.y, 26 * P * gun.flash);
    ctx.fillStyle = `rgba(255,160,60,${gun.flash * 0.8})`; sq(ctx, m.x + v.x * 10 * P, m.y + v.y * 10 * P, 16 * P * gun.flash);
  }
}
function gwMuzzle(gx, gy, P, face, gun) {
  const W = GW_SPRITE[0].length, H = GW_SPRITE.length;
  const x0 = gx - (W / 2) * P, y0 = gy - H * P;
  const px = face > 0 ? x0 + GW_PIVOT[0] * P : x0 + (W - GW_PIVOT[0]) * P, py = y0 + GW_PIVOT[1] * P;
  return { x: px + Math.cos(gun.elev) * face * GW_BARREL * P, y: py - Math.sin(gun.elev) * GW_BARREL * P };
}

// the Karl-Gerät on its siding: a long tracked carriage on two rails with sleepers, a buffer stop
// behind it, eleven road wheels and return rollers, a low hull with the driver's cab forward and
// the engine deck aft, and amidships the cradle: two great side plates on a trunnion holding the
// stubby 60cm mortar, its breech block, recoil cylinders and banded muzzle. Units: local, facing
// right, ground at 0; S per unit.
const KARL_PIVOT = [-10, -84];
function drawKarl(ctx, gx, gy, S, face, gun, pal) {
  const R = (lx, ty, w, h, c) => {
    ctx.fillStyle = c;
    const left = face > 0 ? gx + lx * S : gx - (lx + w) * S;
    ctx.fillRect(Math.round(left), Math.round(gy + ty * S), Math.ceil(w * S), Math.ceil(h * S));
  };
  // the siding: sleepers, two rails seen as one, a buffer stop with its striped beam at the end
  for (let x = -230; x <= 230; x += 16) R(x, 2, 10, 5, '#5a4632');
  R(-236, -2, 472, 4, '#8a8c94'); R(-236, -2, 472, 1, '#c4c6ce');
  R(-246, -24, 8, 22, '#4a4038'); R(-238, -24, 4, 22, '#3a322c');
  for (let i = 0; i < 4; i++) R(-252, -30 + 0, 20, 6, i % 2 ? '#e8e2d8' : '#c8322a');
  R(-252, -30, 5, 6, '#c8322a'); R(-247, -30, 5, 6, '#e8e2d8'); R(-242, -30, 5, 6, '#c8322a'); R(-237, -30, 5, 6, '#e8e2d8');
  R(-232, -26, 6, 4, '#2a2a2e'); R(-232, -18, 6, 4, '#2a2a2e'); // buffers
  // tracks, wheels and rollers
  R(-130, -28, 260, 24, pal.track); R(-134, -22, 268, 14, pal.track);
  for (let i = 0; i < 11; i++) { const x = -122 + i * 23.4; R(x, -22, 14, 14, pal.wheel); R(x + 4, -18, 6, 6, pal.deep); }
  for (let i = 0; i < 5; i++) R(-100 + i * 50, -30, 8, 4, pal.wheel);
  R(118, -24, 18, 18, pal.dark); R(123, -19, 8, 8, pal.wheel); // drive sprocket
  // hull
  R(-128, -52, 250, 22, pal.hull); R(-128, -52, 250, 3, pal.light);
  R(122, -48, 6, 16, pal.hull); R(128, -42, 4, 8, pal.dark);
  R(64, -66, 56, 14, pal.hull); R(64, -66, 56, 2, pal.light); // driver's cab
  for (let i = 0; i < 3; i++) R(72 + i * 14, -61, 8, 3, pal.deep);
  R(-128, -60, 58, 8, pal.dark); R(-122, -64, 10, 4, pal.deep); R(-104, -64, 10, 4, pal.deep); // engine deck, exhausts
  for (let i = 0; i < 6; i++) R(-60 + i * 22, -40, 12, 6, pal.dark); // stowage along the side
  // the cradle: side plates, the trunnion
  R(-52, -100, 70, 48, pal.dark); R(-52, -100, 70, 3, pal.light); R(-46, -94, 58, 4, pal.deep);
  R(-20, -92, 20, 20, pal.deep); R(-14, -86, 8, 8, pal.light);
  // the mortar, raised: breech block, recoil cylinders, the fat tube with bands, the muzzle
  const e = gun.elev, ux = Math.cos(e), uy = -Math.sin(e);
  const at = (d, side) => ({ x: KARL_PIVOT[0] + ux * d - uy * side, y: KARL_PIVOT[1] + uy * d + ux * side });
  const seg = (d0, d1, half, c) => {
    for (let d = d0; d <= d1; d += 3) for (let s = -half; s <= half; s += 3) { const p = at(d - gun.recoil * 10, s); R(p.x - 2, p.y - 2, 4, 4, c); }
  };
  seg(-30, -6, 20, pal.dark); // breech block
  seg(-26, 30, 22, pal.deep); // recoil cylinders either side
  seg(-6, 70, 15, pal.hull); // the tube
  seg(-6, 70, 4, pal.light);
  for (const d of [12, 36]) seg(d, d + 3, 17, pal.dark); // bands
  seg(68, 76, 19, pal.dark); // the muzzle
  if (gun.flash > 0) {
    const m = at(90, 0);
    const wx = face > 0 ? gx + m.x * S : gx - m.x * S, wy = gy + m.y * S;
    ctx.fillStyle = `rgba(255,236,170,${gun.flash})`; sq(ctx, wx, wy, 90 * S * gun.flash);
    ctx.fillStyle = `rgba(255,150,60,${gun.flash * 0.8})`; sq(ctx, wx + ux * face * 30 * S, wy + uy * 30 * S, 60 * S * gun.flash);
  }
}
function karlMuzzle(gx, gy, S, face, gun) {
  const e = gun.elev, d = 80;
  return { x: gx + face * (KARL_PIVOT[0] + Math.cos(e) * d) * S, y: gy + (KARL_PIVOT[1] - Math.sin(e) * d) * S };
}

class BatteryStrike {
  constructor(game, owner, at, cfg) {
    this.game = game;
    this.owner = owner;
    this.cfg = cfg;
    this.tx = at.x;
    this.ground = Math.min(game.terrain.hAt(at.x), at.y);
    // the guns sit far off the edge behind her (the side she fired from), facing the mark
    this.side = owner.x <= at.x ? -1 : 1;
    this.edge = this.side < 0 ? 0 : WORLD_W;
    this.bx = this.edge + this.side * BATTERY_OFF; // the Karl
    this.by = game.terrain.hAt(clamp(this.edge, 2, WORLD_W - 2)); // ground level out there
    this.face = -this.side;
    this.t = 0;
    this.zoom0 = game.cam.zoom;
    this.focus = { x: this.tx, y: this.ground - 160 };
    this.whip = 0; // pan speed, for the speed lines
    this.view = { x: this.bx + this.face * BATTERY_MID, y: this.by - 300 };
    const LOW = 0.06; // barrels lie low until the camera arrives
    this.guns = BATTERY_GUNS.map((dx) => ({ x: this.bx - this.face * dx, recoil: 0, flash: 0, elev: LOW, to: 0.95 }));
    this.karl = { x: this.bx, recoil: 0, flash: 0, elev: 0.3, to: 1.1 };
    // where each round comes down (deterministic: rng)
    this.rounds = [];
    const land = (dmg, r, spread) => this.rounds.push({
      x: clamp(this.tx + (rng.next() * 2 - 1) * spread, 4, WORLD_W - 4), at: BATTERY.LAND + Math.round(rng.next() * (BATTERY.KARL_LAND - BATTERY.LAND - 20)), dmg, r, done: false });
    for (let i = 0; i < BATTERY_GUNS.length * 2; i++) land(cfg.dmg, cfg.r, cfg.spread);
    // the guns along the background ridge, placed (in that layer's own coordinates) to stand
    // either side of the platoon as the camera will see it
    this.back = [];
    const layers = game.bg.layers || [];
    const camX = this.view.x - VIEW_W / 0.6 / 2;
    for (const [li, sc, n] of BATTERY_BACK) {
      const l = layers[li];
      if (!l) continue;
      for (let i = 0; i < n; i++) {
        const fire = BATTERY.FIRE + Math.round(rng.next() * (BATTERY.KARL - BATTERY.FIRE));
        const drawn = this.view.x + ((i + 0.5) / n - 0.5) * 2600 + sc * 300 + (rng.next() - 0.5) * 80;
        this.back.push({ li, sc, x: drawn - camX * (1 - l.parallax), fire: [fire, fire + 24], recoil: 0, flash: 0, elev: LOW, to: 0.95 });
        land(cfg.dmg * 0.5, cfg.r * 0.8, cfg.spread * 1.5);
      }
    }
    game.cam.wide = BATTERY_OFF + 2600;
    game.cam.follow(this.focus);
    game.ui.notice('G.W. battery, fire for effect.');
  }

  update() {
    const g = this.game, cam = g.cam, t = ++this.t;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    const f = this.focus, px = f.x, view = this.view;
    if (t <= BATTERY.OUT) { // the long whip out to the guns
      const u = ease(t / BATTERY.OUT);
      f.x = lerp(this.tx, view.x, u); f.y = lerp(this.ground - 160, view.y, u);
      cam.setZoom(lerp(this.zoom0, 0.6, Math.min(1, u * 1.5)));
    }
    // there: the guns come up to their firing elevation
    const r = ease((t - BATTERY.OUT - 4) / BATTERY.RAISE);
    for (const gun of [...this.guns, this.karl, ...this.back]) gun.elev = lerp(gun.elev0 === undefined ? (gun.elev0 = gun.elev) : gun.elev0, gun.to, r);
    if (t === BATTERY.OUT + 6) g.sfx.click();
    // ripple fire: two rounds a gun, the autoloader's second close behind, then the mortar
    this.guns.forEach((gun, i) => {
      if (t === BATTERY.FIRE + i * 6 || t === BATTERY.FIRE + 30 + i * 6) this.fire(gun, false);
    });
    if (t === BATTERY.KARL) this.fire(this.karl, true);
    for (const b of this.back) if (b.fire.includes(t)) { b.recoil = 1; b.flash = 1; if (t % 3 === 0) g.sfx.explosion(18); }
    if (t > BATTERY.BACK && t <= BATTERY.BACK_END) { // and whip back to the mark
      const u = ease((t - BATTERY.BACK) / (BATTERY.BACK_END - BATTERY.BACK));
      f.x = lerp(view.x, this.tx, u); f.y = lerp(view.y, this.ground - 200, u);
      cam.setZoom(lerp(0.6, Math.min(this.zoom0, 0.6), u));
    }
    for (const rd of this.rounds) {
      if (rd.done || t < rd.at) continue;
      rd.done = true;
      const y = g.terrain.hAt(rd.x);
      g.explode(rd.x, y, { dmg: rd.dmg, dmgR: rd.r, explR: 30, from: { x: -this.face, y: -1.3 } }, this.owner, 'shell');
      g.shake = Math.max(g.shake, 14);
    }
    if (t === BATTERY.KARL_LAND) { // the Karl's round: far the biggest blast of the lot
      const k = this.cfg.karl, y = g.terrain.hAt(this.tx); // the floor of whatever craters are there by now
      g.explode(this.tx, y, { dmg: k.dmg, dmgR: k.r, explR: k.explR, visR: 760, from: { x: -this.face, y: -2 } }, this.owner, 'shell');
      g.quake(this.tx, y, k.quake, this.owner);
      for (let i = 0; i < 120; i++) { // the shockwave, out along the ground and up
        const a = -Math.PI * Math.random(), sp = 7 + Math.random() * 14;
        g.particles.add({ x: this.tx, y: y - 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.45, g: 0.03, drag: 0.93, life: 1 + Math.random() * 0.8, size: 10 + Math.random() * 18, color: i % 3 ? [196, 180, 160] : [255, 220, 170] });
      }
      g.shake = Math.max(g.shake, 60);
      g.screenFlash = Math.max(g.screenFlash || 0, 1);
      g.sfx.explosion(90);
    }
    for (const gun of [...this.guns, this.karl, ...this.back]) { gun.recoil = Math.max(0, gun.recoil - 0.05); gun.flash = Math.max(0, gun.flash - 0.12); }
    if (t > BATTERY.KARL_LAND + 10 && t <= BATTERY.KARL_LAND + 40) cam.setZoom(lerp(Math.min(this.zoom0, 0.6), this.zoom0, (t - BATTERY.KARL_LAND - 10) / 30));
    cam.follow(f);
    if (t <= BATTERY.BACK_END) cam.snap(); // the set piece drives the camera itself
    this.whip = Math.abs(f.x - px);
    if (t >= BATTERY.END) { cam.wide = 0; return false; }
    return true;
  }

  // one gun going off: recoil, a muzzle flash, smoke, dust kicked up off the ground
  fire(gun, karl) {
    const g = this.game, m = karl ? karlMuzzle(gun.x, this.by, KARL_S, this.face, gun) : gwMuzzle(gun.x, this.by, GW_P, this.face, gun);
    gun.recoil = 1; gun.flash = 1;
    for (let i = 0; i < (karl ? 90 : 26); i++) {
      const a = -gun.elev * (this.face > 0 ? 1 : -1) + (this.face > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.4, sp = 2 + Math.random() * (karl ? 12 : 8);
      g.particles.add({ x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: -0.01, drag: 0.9, life: 0.8 + Math.random() * 1, size: (karl ? 18 : 8) + Math.random() * (karl ? 24 : 12), color: i % 4 ? [150, 146, 150] : [255, 200, 120] });
    }
    for (let i = 0; i < (karl ? 30 : 10); i++) g.particles.add({ x: gun.x + (Math.random() - 0.5) * (karl ? 400 : 160), y: this.by - 2, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 1.5, g: 0.02, drag: 0.93, life: 0.9, size: 6 + Math.random() * 10, color: [170, 160, 150] });
    g.shake = Math.max(g.shake, karl ? 32 : 10);
    if (karl) g.screenFlash = Math.max(g.screenFlash || 0, 0.4);
    g.sfx.explosion(karl ? 60 : 30);
  }

  draw(ctx) {
    const g = this.game, t = this.t, face = this.face, time = g.time;
    // the background ridge runs on past the edge of the map, with more batteries along it
    const layers = g.bg.layers || [];
    for (const li of [...new Set(BATTERY_BACK.map((b) => b[0]))]) {
      const l = layers[li];
      if (!l) continue;
      const ox = g.cam.x * (1 - l.parallax), ly = l.height[this.side < 0 ? 0 : WORLD_W - 1];
      const e0 = this.edge + ox; // where that layer's own ridge line ends on screen
      ctx.fillStyle = l.color;
      ctx.fillRect(this.side < 0 ? e0 - 8000 : e0, ly, 8000, WORLD_BOTTOM - ly + 400);
      const [r0, g0, b0] = (l.color.match(/\d+/g) || [60, 60, 60]).map(Number);
      const tn = (k) => `rgb(${Math.round(r0 * k)},${Math.round(g0 * k)},${Math.round(b0 * k)})`;
      const tone = { a: tn(0.55), c: tn(0.78), e: tn(0.95) };
      for (const b of this.back.filter((q) => q.li === li).sort((p, q) => p.sc - q.sc)) drawGWSPG(ctx, b.x + ox, ly + 2, GW_P * b.sc, face, b, tone);
    }
    // the ground out past the edge of the map, where the guns are dug in
    const span = BATTERY_OFF + 3000;
    const x0 = this.side < 0 ? this.edge - span : this.edge, x1 = this.side < 0 ? this.edge : this.edge + span;
    const T = g.terrain;
    ctx.fillStyle = T.color; ctx.fillRect(x0, this.by, x1 - x0, WORLD_BOTTOM - this.by + 400);
    if (T.cap) { ctx.fillStyle = T.cap; ctx.fillRect(x0, this.by, x1 - x0, 8); }
    const pal = {
      hull: '#5c5e58', light: '#7c7e76', dark: '#44463f', deep: '#2e302b', track: '#2b2d33', wheel: '#6b6f78',
    };
    drawKarl(ctx, this.karl.x, this.by, KARL_S, face, this.karl, pal);
    for (const gun of this.guns) drawGWSPG(ctx, gun.x, this.by, GW_P, face, gun, null);
    // rounds coming in: fast, at a slant from the battery's side, each with a long streak
    const dir = { x: face * 0.62, y: 1 }, dl = Math.hypot(dir.x, dir.y);
    dir.x /= dl; dir.y /= dl;
    for (const rd of this.rounds) {
      const k = rd.at - t;
      if (k <= 0 || k > 9) continue;
      const y = g.terrain.hAt(rd.x), sp = 150;
      const sx = rd.x - dir.x * k * sp, sy = y - dir.y * k * sp;
      ctx.fillStyle = 'rgba(255,240,210,0.5)';
      for (let i = 0; i < 16; i++) sq(ctx, sx - dir.x * i * 20, sy - dir.y * i * 20, 6 - i * 0.3);
      ctx.fillStyle = '#26262a'; sq(ctx, sx, sy, 10);
    }
    const kk = BATTERY.KARL_LAND - t;
    if (kk > 0 && kk <= 14) { // the 60cm round: bigger, and just as fast
      const y = g.terrain.hAt(this.tx), sp = 130;
      const sx = this.tx - dir.x * kk * sp, sy = y - dir.y * kk * sp;
      ctx.fillStyle = 'rgba(255,220,160,0.55)';
      for (let i = 0; i < 20; i++) sq(ctx, sx - dir.x * i * 26, sy - dir.y * i * 26, 18 - i * 0.6);
      ctx.fillStyle = '#26262a'; sq(ctx, sx, sy, 34);
      ctx.fillStyle = '#3c3c42'; sq(ctx, sx - dir.x * 8, sy - dir.y * 8, 22);
    }
    // speed lines while the camera whips across
    if (this.whip > 30) {
      const cam = g.cam, a = clamp((this.whip - 30) / 90, 0, 0.75);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      for (let i = 0; i < 30; i++) {
        const u = ((i * 0.618034) % 1), v = ((i * 0.381966 + 0.17) % 1);
        const len = cam.w * (0.2 + 0.3 * v);
        const x = cam.x + ((u * 1.4 + time * 3.1 * (0.6 + v)) % 1.4 - 0.2) * cam.w;
        ctx.fillRect(Math.round(x), Math.round(cam.y + v * cam.h), Math.round(len), Math.max(2, Math.round(3 / cam.zoom)));
      }
    }
  }

  // in screen units: where the battery is, so it reads as far behind the line
  drawScreen(ctx) {
    const t = this.t;
    if (t < BATTERY.OUT - 6 || t > BATTERY.BACK + 6) return;
    const a = Math.min(1, (t - BATTERY.OUT + 6) / 10, (BATTERY.BACK + 6 - t) / 8);
    const y = Math.round(H * 0.17); // clear of the turn banner and the notices
    ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(20,20,26,${0.6 * a})`; ctx.fillRect(W / 2 - 200, y - 22, 400, 46);
    ctx.fillStyle = `rgba(255,230,180,${a})`;
    ctx.fillText(`G.W. BATTERY  ·  ${BATTERY_KM} KM BEHIND THE LINE`, W / 2, y - 2);
    ctx.fillStyle = `rgba(220,220,230,${a})`; ctx.font = '11px monospace';
    ctx.fillText('4 × G.W. TIGER  ·  KARL-GERÄT 040  ·  FIRE FOR EFFECT', W / 2, y + 15);
  }
}

// ------------------------------------------------------------------------------ quake
Object.assign(Game.prototype, {
  // an earthquake from the impact: everyone on the ground within q.r takes up to q.dmg (falling
  // off with distance), trees near the blast come down, dust runs out along the ground
  quake(x, y, q, owner) {
    for (const t of this.tanks) {
      if (!t.alive) continue;
      const d = Math.abs(t.x - x);
      if (d > q.r || Math.abs(t.y - this.groundAt(t.x, t.y)) > 30) continue;
      const amt = Math.round(q.dmg * (1 - d / q.r));
      if (amt < 5) continue;
      this.particles.text(t.x, t.y - 64, 'QUAKE', '#e8c890');
      this.damage(t, amt, owner);
      t.flash = 1;
    }
    this.terrain.fellTrees(x, y - 40, 320);
    for (let i = 0; i < 70; i++) {
      const dir = i % 2 ? 1 : -1, dx = dir * Math.random() * q.r;
      this.particles.add({ x: x + dx, y: this.terrain.hAt(x + dx) - 2, vx: dir * (0.5 + Math.random() * 2), vy: -Math.random() * 1.2, g: 0.03, drag: 0.95, life: 0.8 + Math.random() * 0.8, size: 4 + Math.random() * 7, color: [160, 148, 136] });
    }
    this.shake = Math.max(this.shake, 30);
    this.ui.notice('The ground shakes.');
    this.events.push('An earthquake rolls out from the impact.');
  },
});

// ------------------------------------------------------------------------------ sky tears
// Alban's Morrighan: the flare lands and the sky over it tears. Each tear unzips: a black hairline
// a few pixels wide lengthens up and down from its centre and widens, then more columns of the same
// width split open either side of it, flush, each a little offset and shorter than the last, down
// to slivers at the edges, so the sky reads as split open vertically, like a wound. Black rockets rain out of the tears on long, very dark trails,
// seeking whatever is beneath; then the tears zip shut. The sky darkens while they're open.
const RIFT = { RISE: 30, OPEN: 34, STAGGER: 16, GROW: 56, RAIN: 96, RAIN_LEN: 130, CLOSE: 250, END: 300 };
// one tear's shape: bars all the same thickness, flush, the centre one longest; going out from it
// each is shorter (with a little jitter in length and offset) down to slivers, so the tear thins
// toward its edges by length alone. Drawn upright (dy runs across, len up and down). Seeded, so a replay matches.
const TEAR_BAR = 12; // every bar's height
function makeTear(x, y, len, seed) {
  const h = (k) => hash2(seed * 17 + 5, k * 29 + 3);
  const bars = [{ dy: 0, len: 1, th: TEAR_BAR, jit: 0, delay: 0 }];
  const n = 9 + Math.floor(h(2) * 6); // bars each side
  for (let j = 1; j <= n; j++) {
    for (const s of [-1, 1]) {
      const k = j * 2 + (s > 0 ? 1 : 0);
      const fall = 1 - Math.pow(j / (n + 1), 1.4); // shorter the further out, to a sliver
      bars.push({ dy: s * j * TEAR_BAR, len: Math.max(0.04, fall * (0.75 + 0.35 * h(k + 30))), th: TEAR_BAR,
        jit: (h(k + 40) - 0.5) * len * 0.1 * (1 + j / n), delay: 0.28 + (j / n) * 0.5 + h(k + 50) * 0.06 });
    }
  }
  return { x, y, len, bars, open: 0, close: 0 };
}
class SkyTear {
  constructor(game, owner, at, cfg) {
    this.game = game;
    this.owner = owner;
    this.cfg = cfg;
    this.tx = at.x;
    this.ground = Math.min(game.terrain.hAt(at.x), at.y);
    this.t = 0;
    this.zoom0 = game.cam.zoom;
    this.dark = 0;
    this.tears = [];
    const spots = [[0, 0], [-760, 60], [740, 40], [-380, -80], [390, -60]].slice(0, cfg.tears);
    spots.forEach(([dx, dy], i) => this.tears.push(makeTear(clamp(this.tx + dx, 250, WORLD_W - 250), this.ground - 1050 + dy, 620 + hash2(i, 9) * 380, i + 1)));
    this.rocket = { id: 'morrighan_rocket', name: 'Rift Rocket', kind: 'rocket', dmg: cfg.dmg, dmgR: cfg.r, explR: 10, salvo: 1, clip: 1, disp: 0, acid: 0, sat: false,
      rarity: 7, maxCharge: 10, drift: 0.15, dark: true, guide: { arm: 2, burn: 0, seek: 0, turn: 5, range: cfg.reach, cone: 180, lift: 0, brake: false } };
    this.focus = { x: this.tx, y: this.ground - 200 };
    game.cam.follow(this.focus);
    game.ui.notice('The sky tears open.');
  }

  update() {
    const g = this.game, cam = g.cam, t = ++this.t, f = this.focus;
    const ease = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
    if (t <= RIFT.RISE) { // up and out to take in the sky over the mark
      const u = ease(t / RIFT.RISE);
      f.y = lerp(this.ground - 200, this.ground - 720, u);
      cam.setZoom(lerp(this.zoom0, Math.max(CAM_FULL, 0.5), u));
    }
    this.tears.forEach((tr, i) => {
      const t0 = RIFT.OPEN + i * RIFT.STAGGER;
      tr.open = clamp((t - t0) / RIFT.GROW, 0, 1);
      tr.close = clamp((t - RIFT.CLOSE - i * 6) / 30, 0, 1);
      if (t === t0) g.sfx.thud();
    });
    this.dark = Math.min(1, (t - RIFT.OPEN) / 50) * (1 - clamp((t - RIFT.CLOSE) / 40, 0, 1));
    // the rain: black rockets out of the open tears, one every few frames, each tear in turn
    const k = t - RIFT.RAIN;
    if (k >= 0 && k < RIFT.RAIN_LEN && k % Math.max(1, Math.floor(RIFT.RAIN_LEN / this.cfg.rockets)) === 0) {
      const live = this.tears.filter((tr) => tr.open > 0.7 && tr.close === 0);
      if (live.length) {
        const tr = live[(k * 7) % live.length];
        const x = tr.x + (rng.next() - 0.5) * TEAR_BAR * 8, y = tr.y + (rng.next() - 0.3) * tr.len * 0.6; // out along the split
        const a = Math.PI / 2 + (rng.next() - 0.5) * 0.9, sp = 10 + rng.next() * 6;
        const p = new Projectile(g, this.rocket, this.owner, x, y, Math.cos(a) * sp, Math.sin(a) * sp, false);
        p.age = 2;
        g.projectiles.push(p);
        if (k % 6 === 0) g.sfx.shot(this.rocket);
      }
    }
    if (t > RIFT.RAIN + RIFT.RAIN_LEN + 20 && t <= RIFT.RAIN + RIFT.RAIN_LEN + 60) cam.setZoom(lerp(Math.max(CAM_FULL, 0.5), this.zoom0, ease((t - RIFT.RAIN - RIFT.RAIN_LEN - 20) / 40)));
    cam.follow(f);
    if (t <= RIFT.RISE) cam.snap();
    return t < RIFT.END;
  }

  // the tears themselves, in the sky behind the hills
  drawBack(ctx) {
    const time = this.game.time;
    for (const tr of this.tears) {
      if (tr.open <= 0 || tr.close >= 1) continue;
      // each bar: first a hairline lengthening from the centre, then it widens; the scars after.
      // The glow at the lips goes down first, then the black, so flush bars read as one wound.
      const rects = [];
      for (const b of tr.bars) {
        const u = clamp((tr.open - b.delay) / (1 - b.delay * 0.6), 0, 1);
        if (u <= 0) continue;
        const L = tr.len * b.len * Math.min(1, u * 1.8) * (1 - tr.close);
        const th = b.dy ? b.th : Math.max(1.5, b.th * clamp((u - 0.12) / 0.2, 0, 1)); // the centre starts as a 1-5 px line; the rest open at full width, flush
        const cx = tr.x + b.dy, cy = tr.y + b.jit; // bars stand side by side, each a little offset up or down
        rects.push([cx - th / 2, cy - L / 2, th, L]); // turned upright: the sky splits vertically
      }
      ctx.fillStyle = 'rgba(110,30,140,0.35)';
      for (const [x, y, w, h] of rects) ctx.fillRect(Math.round(x - 3), Math.round(y - 2), Math.round(w + 6), Math.round(h + 4));
      ctx.fillStyle = '#040206';
      for (const [x, y, w, h] of rects) ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)) + (w >= TEAR_BAR - 0.5 ? 1 : 0), Math.round(h)); // full columns overlap a unit: no seams
      // a few motes drifting out of the dark
      if (tr.open > 0.6) {
        ctx.fillStyle = 'rgba(190,120,230,0.6)';
        for (let i = 0; i < 6; i++) sq(ctx, tr.x + (hash2(i, 3) - 0.5) * tr.len * 0.6, tr.y + ((time * 20 + i * 37) % 80), 3);
      }
    }
  }

  draw() {}

  // the sky dims while the tears are open
  drawScreen(ctx) {
    if (this.dark <= 0) return;
    ctx.fillStyle = `rgba(14,4,22,${0.32 * this.dark})`;
    ctx.fillRect(0, 0, W, H);
  }
}
