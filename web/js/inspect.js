'use strict';
// Hover help: the map's name sits in the HUD's top bar, and hovering it gives the map's lore and
// what it does to a match. Hovering a structure on the battlefield with the mouse (trees, giants, the
// AHU, bridges, power lines, radio towers, forts, crates, lava, voids) says what it does and how it
// breaks, with its health where it has some.

const MAP_LORE = {
  snow: 'The far territories of Alstroemeria, out past the stilt-cities. Snow, pine and old stone. All you see of the cooperative from here is the ring across the sky.',
  forest: 'Broadleaf woodland in late autumn. Dense stands of trees and great oaks give cover, and rain and gales come through often.',
  desert: 'Low, smooth dunes with little to hide behind. Sandstorms push shells off course and updrafts carry them.',
  alstroemeria: 'A pocket of Alstroemeria an old-world AHU keeps warm, under the ring. Nobody has ever explained how. A skyrail runs along the near ridge.',
  aesru: 'The top face of the Alstroemeria Exo-Surface Ring, where most people live on the ring\'s own exhaust: stilt-rows with warm windows, the heat main, radiator fields and the patch train. Heat is hierarchy.',
  aesrl: 'The ring\'s underside at bedrock datum: derelict datacentre halls nobody isolated, the ground mains, risers into the dark, AHUs nobody has dated, and ruins far older than any of it.',
  astmg: 'The ground under the stilt-cities: alpine, dry and cold, fractured by recent quakes. The stilts are drilled kilometres into bedrock, the cities\' warm undersides hang overhead, and everything not on stilts is a test range.',
};
const FRONT_NAMES = { force: 'wind', storm: 'storms', blizzard: 'blizzards', updraft: 'updrafts', rain: 'rain', gale: 'gales', sandstorm: 'sandstorms' };
const TREE_NAMES = { pine: 'Pine', broadleaf: 'Tree', cactus: 'Cactus', lily: 'Alstroemeria', vent: 'Steam vent', rack: 'Server rack', marker: 'Range marker' };
const MATERIAL_NAMES = { timber: 'timber', concrete: 'concrete', steel: 'steel' };

Object.assign(Game.prototype, {
  // the structure under world point (x, y), as { title, text, stat }; null if nothing
  inspectAt(x, y, tol) {
    const T = this.terrain, k = this.mapToughness(), tough = k > 1.05 ? ` Map toughness ×${k.toFixed(1)}: it takes ${Math.round(100 / k)}% of each blast.` : '';
    const hp = (a, b) => `${Math.max(0, Math.round(a))} / ${Math.round(b)} HP`;
    for (const c of this.crates) {
      if (c.alive && Math.abs(c.x - x) < 14 + tol && y > c.y - 22 - tol && y < c.y + tol) {
        return c.golden
          ? { title: 'Golden crate', text: 'Dropped by the spy plane. Drive into it, or catch it in a blast, to claim it: a big repair, cash every round, or a MAIA uplink for several turns.' }
          : { title: 'Supply crate', text: 'Drive into it, or catch it in a blast, to claim it. It holds a repair, cash, armour or a MAIA uplink; you see which when you claim it.' };
      }
    }
    const A = T.ahu;
    if (A) {
      const g = T.hAt(A.x);
      if (Math.abs(x - A.x) < AHU_W / 2 + tol && y <= g + tol && y > g - AHU_H - tol) {
        return A.alive
          ? { title: 'Old-world AHU', text: `An air-handling unit older than anyone's records, keeping the meadow warm. Shells stop on it and blasts wear it down. Destroy it and the warmth goes: the sky cools, snow falls and frost creeps over the meadow for the rest of the round.${tough}`, stat: hp(A.hp, AHU_HP) }
          : { title: 'Old-world AHU (destroyed)', text: 'A burnt-out shell, still smoking. The meadow stays cold for the rest of the round.' };
      }
    }
    for (const t of T.towers || []) {
      const g = T.hAt(t.x);
      if (t.h && Math.abs(x - t.x) < 12 + tol && y <= g && y > g - t.h * TOWER_SEC - tol) {
        const i = clamp(Math.floor((g - y) / TOWER_SEC), 0, t.h - 1);
        return { title: 'Radio tower', text: `A lattice mast in sections. Shells and beams stop on it. Break a section and everything above it topples away from the blast, crushing whatever it lands on for ${TOWER_CRUSH} per fallen section (up to 120).${tough}`, stat: `${t.h} sections · this one ${hp(t.hp[i], t.maxHp)}` };
      }
    }
    for (const G of T.giants || []) {
      if (G.state === 'gone') continue;
      const g = T.hAt(G.x), name = giantName(G);
      const Name = name[0].toUpperCase() + name.slice(1);
      if (G.state === 'down') {
        if (Math.abs(x - G.x) < G.stemW / 2 + tol && y <= g + tol && y > g - G.stemH * 0.3 - tol) return { title: `${Name} (stump)`, text: 'Its top has come down. Nothing left here to hide under.' };
        continue;
      }
      if (G.state === 'falling') continue;
      const inStem = Math.abs(x - G.x) < G.stemW / 2 + tol && y <= g && y > g - G.stemH;
      if (G.state === 'bare') {
        if (inStem) return { title: `${Name} (bare)`, text: 'Its top has been shot away, so it is no cover any more. Shells still stop on the stem.', stat: `Stem ${hp(G.stemHp, GIANT_STEM_HP)}` };
        continue;
      }
      if (T.giantAt(x, y) === G || inStem) {
        return { title: Name, text: `Cover: shells, beams and hostile fire stop on the top and burst there, so whoever is under it is covered. Blasts wear the top and the stem down. Shoot the top away and the cover is gone; break the stem and the top comes down, crushing everything underneath for ${GIANT_CRUSH}.${tough}`, stat: `Top ${hp(G.capHp, GIANT_CAP_HP)} · stem ${hp(G.stemHp, GIANT_STEM_HP)}` };
      }
    }
    for (const b of T.bridges || []) {
      if (x < b.x0 - tol || x > b.x1 + tol) continue;
      const s = b.segs[clamp(Math.floor((x - b.x0) / BRIDGE_SEG), 0, b.segs.length - 1)];
      const onDeck = s && !s.gone && y >= s.y - 6 - tol && y <= s.y + b.deck + tol;
      const onCol = b.cols.some((c) => Math.abs(c - x) < 6 + tol) && s && y > s.y && y <= T.hAt(x);
      if (!onDeck && !onCol) continue;
      const hw = b.kind === 'highway', mat = MATERIAL_NAMES[materialFor(this.round)];
      return { title: hw ? 'Highway' : 'Bridge', text: `A ${mat} deck on columns. Vehicles drive across it or under it; shells stop on the deck and pass between the columns. Blasts break the deck in segments, and any stretch more than ${BRIDGE_OVERHANG} segments from a support falls, taking whoever is on it. S drops you through to the ground.${tough}`, stat: onDeck ? `This segment ${hp(s.hp, b.segHp)}` : 'Column' };
    }
    for (const line of T.lines || []) {
      for (let i = 0; i < line.poles.length; i++) {
        const p = line.poles[i], g = T.hAt(p.x);
        if (!p.fallen && Math.abs(x - p.x) < 4 + tol && y <= g && y > g - POLE_H - tol) {
          return { title: 'Power line', text: `Wooden poles carrying live wires. Knock a pole over and the wires either side fall live: anyone under them takes ${SHOCK_FALL} at once and ${SHOCK_TURN} at the start of each of their turns, for ${LIVE_TURNS} turns.${tough}`, stat: hp(p.hp, POLE_HP * MATERIALS[materialFor(this.round)].hp) };
        }
      }
      for (let i = 0; i < line.spans.length; i++) {
        const s = line.spans[i], a = line.poles[i].x, b = line.poles[i + 1].x;
        if (s.state === 'live' && x > Math.min(a, b) && x < Math.max(a, b) && Math.abs(y - T.hAt(x)) < 16 + tol) {
          return { title: 'Live wire', text: `A fallen power line, still live. Anyone on the ground under it takes ${SHOCK_TURN} at the start of each of their turns.`, stat: `${Math.max(0, s.until - this.turnCount)} turns left` };
        }
      }
    }
    if (T.forts.length && T.fortAt(x, y)) {
      return { title: 'Fort', text: `A small neutral stronghold of square blocks. Shells stop on it and vehicles can't drive through it. Blasts break blocks, and blocks with nothing under them drop down their column.${tough}`, stat: `${FORT_HP} HP a block` };
    }
    const tree = T.treeAt(x, y) || T.treeAt(x - tol, y) || T.treeAt(x + tol, y);
    if (tree) {
      return { title: TREE_NAMES[T.treeKind] || 'Tree', text: `Shells burst on it. Any nearby blast knocks it down, and driving through it knocks it down but costs ${TREE_RAM_DMG + 3 * tree.h} health.` };
    }
    const g = T.hAt(x);
    if (Math.abs(y - g) < 24 + tol || y > g) {
      if ((T.voids || []).some(([a, b]) => x >= a && x <= b)) return { title: 'Void', text: 'The ground here is gone altogether. Anything that falls in is lost.' };
      const lv = T.lavaAt(x);
      if (lv > 0.1) return { title: 'Molten ground', text: `Left by Ikaros' Apollon, and permanent. Standing in it at the start of your turn costs up to ${LAVA_DMG}.`, stat: `${Math.round(lv * 100)}% molten` };
    }
    return null;
  },

  // the map chip's text: lore, then what the map does
  mapTip() {
    const B = this.biome, k = this.mapToughness();
    const fronts = (B.fronts || []).map((f) => FRONT_NAMES[f] || f).join(', ');
    const more = [`Weather: ${fronts}.`, `Sudden death: ${B.sudden.name.toLowerCase()} rises each cycle.`];
    if (k > 1.05) more.push(`Map toughness ×${k.toFixed(1)}: craters are smaller and structures take ${Math.round(100 / k)}% of each blast, scaled to the strongest player.`);
    return { title: B.name, text: MAP_LORE[B.id] || '', stat: more.join(' ') };
  },
});

Object.assign(UI, {
  showTip(info, px, py) {
    const d = $('tip');
    if (!info) { d.hidden = true; return; }
    const key = info.title + info.text + (info.stat || '');
    if (this.tipKey !== key) {
      this.tipKey = key;
      d.innerHTML = `<b>${esc(info.title)}</b><span>${esc(info.text)}</span>${info.stat ? `<small>${esc(info.stat)}</small>` : ''}`;
    }
    d.hidden = false;
    const s = $('stage').getBoundingClientRect();
    const w = d.offsetWidth, h = d.offsetHeight;
    let x = px - s.left + 16, y = py - s.top + 18;
    if (x + w > s.width - 8) x = px - s.left - w - 16;
    if (y + h > s.height - 8) y = py - s.top - h - 12;
    d.style.left = `${Math.max(8, x)}px`;
    d.style.top = `${Math.max(8, y)}px`;
  },

  initInspect() {
    const g = this.game, c = g.canvas, chip = $('mapinfo');
    chip.addEventListener('mouseenter', () => { const r = chip.getBoundingClientRect(); this.showTip(g.mapTip(), r.left, r.bottom - 10); });
    chip.addEventListener('mouseleave', () => this.showTip(null));
    c.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || g.drag || g.paused || g.phase === 'menu' || g.phase === 'intro' || $('hud').hidden) { this.showTip(null); return; }
      const p = g.worldAt(e);
      this.showTip(g.inspectAt(p.x, p.y, 3 * p.sc), e.clientX, e.clientY);
    });
    c.addEventListener('pointerleave', () => this.showTip(null));
    c.addEventListener('pointerdown', () => this.showTip(null));
  },

  // the map's name in the top bar
  syncMapChip(g) {
    if (this.last.map === g.biome.id) return;
    this.last.map = g.biome.id;
    $('mapinfo').textContent = g.biome.name;
  },
});
