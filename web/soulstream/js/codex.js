'use strict';
// The Codex (title menu and the Esc menu), after Artillery 3's: pick a class, a birthright, a floor and a
// rank; browse every skill and every weapon (6 types x 8 tiers); read its card, measured numbers and
// where it ranks; and try it on a training dummy that never falls and keeps a tally. Nothing here
// touches your save: the range uses a reference character built for the chosen floor
// (buildTestSave), and its own random numbers.

// how each skill actually plays: a short read for the card
const SKILL_NOTES = {
  att: 'Free and steady. Worth ranking early, when every point of damage counts; by the Barrow it is what you use when the mana runs out.',
  hea: 'Scales with your max health, so it never falls off. Rank it with your main attack, or bosses outlast you.',
  res: 'Costs the turn but refills about a quarter of your mana and lifts a debuff. Use it when the foe is winding up, not when it is about to hit.',
  fus: 'The strongest opener an Adventurer has, paid in health and mana. Uses STR and INT both, so it suits any build.',
  mga: 'Cheap and almost never misses. The Adventurer’s mana workhorse until Lightning.',
  mgc: 'Two hits that bite through defence. Better than Magic Arrow against armoured foes (Spire constructs, Ironclad champions).',
  sok: 'Best damage per mana of the early skills, on a 1-turn cooldown. Alternate it with Fusion or Magic Arrow.',
  hdr: 'Damage and healing in one turn. Its value grows the longer the fight: bosses, Vampiric foes.',
  lig: 'Ignores much of their defence and stuns one time in five. A stun breaks a charge, so hold it for the wind-up.',
  enl: 'All five stats +15% for 4 turns. Pays for itself in a long fight; wasted on a regular you can kill in three.',
  dbl: 'The Adventurer’s heavy hitter, with a bleed that does a third again over three turns. Cooldown 2.',
  ice: 'The steadiest damage in the game (balance 100) and a chill that blunts their accuracy and avoidance.',
  fir: 'High damage plus a burn worth most of a second cast. Burns also stop the Hydra regrowing heads.',
  esc: 'Pierce 120: the answer to armoured foes. Lower hit chance, so pair it with Clairvoyance or a Sniper Potion.',
  cla: 'INT, DEX and defence penetration +25%. An Eweca’s damage buff: cast it first against bosses.',
  hly: 'The Eweca nuke. Big enough to end champion fights; the 2-turn cooldown and the health cost are the price.',
  sil: 'Awakened. A huge hit that also silences and freezes: the safest way to stop a caster boss acting.',
  cer: 'Laceda’s staple: big, cheap and steady. Most turns, this.',
  lsc: 'Two hits on a 1-turn cooldown. Strong on unarmoured foes; poor into high defence (pierce 10).',
  lsp: 'Pierce 120 at a low cost: Laceda’s answer to armour, and often better than Cero past the Spire.',
  shm: 'Avoidance and accuracy for 4 turns. Defensive more than offensive: use it against multi-hit foes.',
  lac: 'The single biggest physical hit before awakening. Costs 12% of your health: mind your HP against bosses.',
  fur: 'Awakened. Four strokes on a 4-turn cooldown; the damage per cast is the highest of any physical skill.',
  smh: 'Weak by Falias standards, but cheap and it stuns. Falias wins by outlasting, not out-hitting.',
  fhl: 'The best heal in the game, with a cleanse. A Falias can heal every other turn.',
  fsh: 'Protection, defence and a barrier in one: cast it the turn before a charged blow lands.',
  fbr: 'Falias’s real damage. Hybrid, so it uses both STR and INT.',
  fsl: 'Scales with defence and max health, so it grows with every Defence and Health mastery you buy.',
  gods: 'Awakened. Falias’ Wrath, bigger, with a heal. Only as strong as your defence.',
  wow: 'Low balance means wild rolls, but high pierce and crit. Spam it; let crits do the work.',
  dkl: 'Zero balance: anything from half to full damage, and high crit. Excellent with Clairvoyance-style buffs and Deadly enchants.',
  wor: 'Physical Luminous: better balance than its siblings. Costs a tenth of your health.',
  wit: 'Balance +60 fixes the Luminous swing for 4 turns, and weakens the foe.',
  arc: 'Five hits with pierce 200. If they survive, well, gg. Health and mana hungry.',
  wol: 'Awakened. Seven hits, pierce 250. The largest number the game can make.',
};

const Codex = {
  c: { cls: 'eweca', ability: 'mage', floor: 30, rank: -1, filter: 'skills', skill: 'ice', weapon: null, wtype: 'all', dummy: 'regular' },
  prev: 'title', tally: null, b: null, busy: false, raf: 0,

  open() {
    this.prev = UI.screen === 'battle' ? 'hub' : (UI.screen || 'title');
    UI.closeModal && !$('modal').hidden && UI.closeModal();
    UI.show('codex');
    if (!this.T) {
      this.T = new Term($('cx-cv'));
      this.A = new Arena(this.T);
      $('cx-back').onclick = () => this.close();
      $('cx-fire').onclick = () => this.fire();
      $('cx-ten').onclick = () => this.quick(10);
      $('cx-reset').onclick = () => { this.resetTally(); this.readout(); };
      window.addEventListener('resize', () => { if (UI.screen === 'codex') this.fit(); });
    }
    this.rebuild();
    this.render();
    this.loop();
  },
  close() {
    cancelAnimationFrame(this.raf);
    if (this.prev === 'hub' && UI.save) Hub.open(); else UI.title();
  },
  onKey(k) {
    if (k === ' ' || k === 'Enter' || k === 'F') { this.fire(); return true; }
    if (k === 'T') { this.quick(10); return true; }
    if (k === 'Escape' || k === 'Q') { this.close(); return true; }
    return false;
  },

  // ------------------------------------------------------------------ the reference character and the dummy
  rng() { const r = Object.create(rng); r.s = 0x5eed + (this.tally ? this.tally.turns * 7919 : 0); return r; },
  weaponItem(type, tier, f) {
    const r = Object.create(rng);
    r.s = 1000 + Object.keys(WEAPON_TYPES).indexOf(type) * 97 + RARITY_BY_ID[tier].i * 13 + f * 7;
    const it = makeItem(f, { slot: 'weapon', type, rarity: tier }, r);
    // a mid roll and the damage line only, so tiers compare cleanly (real drops add stat lines and, from
    // Legendary, an enchant)
    it.dmg = +(WEAPON_DMG * RARITY_BY_ID[tier].mult * (1 + f / 60)).toFixed(3);
    it.stats = {};
    delete it.enchant;
    return it;
  },
  build(weapon) {
    const c = this.c;
    const s = buildTestSave(c.floor, c.cls, c.ability, { rank: c.rank >= 0 ? c.rank : undefined, allSkills: true, gear: false, awaken: true, name: 'You' });
    s.equip = [weapon || null, null, null, null];
    return s;
  },
  currentWeapon() { const w = this.c.weapon; return w ? this.weaponItem(w.type, w.tier, this.c.floor) : null; },
  dummy(kind = this.c.dummy) {
    const f = this.c.floor;
    const S = floorScale(f);
    const k = { none: 0, regular: 1, elite: 1.5, boss: 3.4 }[kind];
    const ref = Math.round(ENEMY_HP * Math.pow(S, ENEMY_HP_EXP) * (k || 1));
    return {
      id: 'dummy', name: 'Training Dummy', baseName: 'Training Dummy', kind: kind === 'boss' ? 'boss' : 'regular', floor: f, stratum: floorInfo(f).stratum.n,
      boss: kind === 'boss', type: 'phys', hpMax: ref, hp: 1e15, dmg: 0,
      def: kind === 'none' ? 0 : Math.round(ENEMY_DEF(f) * (kind === 'boss' ? 1.4 : 1)), dfp: 0,
      acc: 0, avd: kind === 'none' ? 0 : Math.round(ENEMY_AVD(f)), crit: 0, critMult: 1, bal: 40, affixes: [],
      reward: { sc: 0, xp: 0, loot: 0 }, moves: [], phases: [], passive: {},
    };
  },
  newBattle(save, kind) {
    const b = new Battle(save, this.dummy(kind), { rng: this.rng() });
    b.flush();
    return b;
  },
  rebuild() {
    this.save = this.build(this.currentWeapon());
    this.b = this.newBattle(this.save);
    this.resetTally();
    this.A.setFighters({ art: ART[CLASSES[this.c.cls].art] }, { art: ART.dummy });
    this.A.backdrop = makeBackdrop(floorInfo(this.c.floor).sIdx, this.T.cols);
    this.fit();
  },
  resetTally() { this.tally = { last: 0, best: 0, total: 0, turns: 0, hits: 0, misses: 0, crits: 0, lastHits: [] }; },

  // one turn on the range: full health and mana, no cooldowns; the skill, then the end of the round (DoTs tick)
  turn(b, id) {
    const st = b.stats();
    b.p.hp = st.hpMax; b.p.mp = st.mpMax; b.p.cds = {}; b.p.potionUsed = false;
    b.e.hp = 1e15;
    b.playerSkill(id);
    b.endRound(true);
    b.e.hp = 1e15;
    return b.flush();
  },
  count(evs) {
    let dmg = 0, hits = 0, misses = 0, crits = 0;
    for (const e of evs) {
      if (e.t === 'dmg' && e.to === 'e') { dmg += e.amount; if (!e.kind || e.kind === 'hit') { hits++; if (e.crit) crits++; } }
      if (e.t === 'miss' && e.to === 'e') misses++;
    }
    return { dmg, hits, misses, crits };
  },
  addTally(r) {
    const t = this.tally;
    t.last = r.dmg; t.best = Math.max(t.best, r.dmg); t.total += r.dmg; t.turns++;
    t.hits += r.hits; t.misses += r.misses; t.crits += r.crits;
  },

  // measured numbers: n turns on a fresh dummy with fixed random numbers
  measure(save, id, n = 60, kind) {
    const b = new Battle(save, this.dummy(kind), { rng: (() => { const r = Object.create(rng); r.s = 4242; return r; })() });
    b.flush();
    const sk = SKILLS[id];
    let total = 0, hits = 0, misses = 0, crits = 0, lo = Infinity, hi = 0;
    for (let i = 0; i < n; i++) {
      b.p.buffs = []; b.p.statuses = []; b.e.statuses = []; // each turn on its own (DoTs still tick from that turn)
      const r = this.count(this.turn(b, id));
      total += r.dmg; hits += r.hits; misses += r.misses; crits += r.crits;
      lo = Math.min(lo, r.dmg); hi = Math.max(hi, r.dmg);
    }
    const avg = total / n;
    const st = computeStats(save);
    const mp = skillMp(sk, Math.max(0, save.ranks[id]), st);
    return { avg, lo: lo === Infinity ? 0 : lo, hi, perTurn: avg / (1 + sk.cd), hit: hits + misses ? hits / (hits + misses) : 1, crit: hits ? crits / hits : 0, mp, perMp: mp ? avg / mp : Infinity };
  },

  // ------------------------------------------------------------------ actions
  async fire() {
    if (this.busy) return;
    const id = this.c.skill;
    if (!id || !SKILLS[id]) return;
    this.busy = true;
    const evs = this.turn(this.b, id);
    const r = this.count(evs);
    await this.play(evs);
    this.addTally(r);
    this.busy = false;
    this.readout();
  },
  quick(n) {
    if (this.busy || !this.c.skill) return;
    for (let i = 0; i < n; i++) this.addTally(this.count(this.turn(this.b, this.c.skill)));
    this.A.float('e', `${n} turns`, '#7fe3ff', { big: true });
    this.readout();
  },
  async play(evs) {
    const A = this.A;
    for (const ev of evs) {
      if (ev.t === 'act') {
        SFX.play(SKILLS[ev.skill] && SKILLS[ev.skill].type === 'mag' ? 'magic' : 'click');
        const fx = SKILL_FX[ev.fx];
        if (fx) await fx(A, 'p', 'e');
      } else if (ev.t === 'dmg' && ev.to === 'e') {
        const dot = ev.kind && ev.kind !== 'hit';
        const col = ev.crit ? '#ffe066' : dot ? (STATUS_INFO[ev.kind] ? STATUS_INFO[ev.kind].color : '#ffffff') : '#ffffff';
        A.float('e', `${ev.label && !dot ? ev.label.toUpperCase() + ' ' : ''}-${fmt(ev.amount)}`, col, { big: ev.crit || !!ev.label, idx: ev.idx || 0 });
        A.hitFlash('e');
        impactFX(A, 'e', col, ev.idx);
        SFX.play(ev.crit ? 'crit' : 'hit');
        await wait(dot ? 220 : 130);
      } else if (ev.t === 'miss' && ev.to === 'e') {
        A.float('e', 'Miss!', '#9aa0b5', { idx: ev.idx || 0 }); SFX.play('miss'); await wait(140);
      } else if (ev.t === 'heal' && ev.to === 'p' && ev.amount > 0) {
        A.float('p', `+${fmt(ev.amount)}`, '#7fe08a');
      } else if (ev.t === 'mp' && ev.to === 'p' && ev.amount > 0 && !ev.quiet) {
        A.float('p', `+${fmt(ev.amount)} MP`, '#6fa8ff', { idx: 2 });
      } else if (ev.t === 'status') {
        A.float(ev.to, ev.text, ev.color, { idx: 2 }); await wait(120);
      } else if (ev.t === 'buff') {
        A.float(ev.to, ev.name, '#c3b0ff', { idx: 1 }); SFX.play('buff'); await wait(120);
      } else if (ev.t === 'shield') {
        A.float(ev.to, `+${fmt(ev.amount)} shield`, '#ffd866', { idx: 1 });
      } else if (ev.t === 'msg' && ev.text) {
        A.floats.push({ x: this.T.cols / 2, y: 4, text: ev.text, color: ev.color || '#ffffff', life: 1.4, vy: 0.5 });
      }
    }
  },

  // ------------------------------------------------------------------ the console
  fit() {
    const T = this.T;
    const wrap = $('cx-stage');
    const W = wrap.clientWidth - 8;
    const cols = W >= 700 ? 90 : 64;
    const rows = 27;
    const availH = Math.max(220, wrap.clientHeight - 150);
    const cw = Math.min(W / cols, availH / (rows * 1.98));
    T.setSize(cols, rows);
    $('cx-cv').style.width = (cw * cols) + 'px';
    T.resize(cw * cols);
    this.A.layout();
    this.A.backdrop = makeBackdrop(floorInfo(this.c.floor).sIdx, T.cols);
  },
  loop() {
    cancelAnimationFrame(this.raf);
    let last = performance.now();
    const step = (now) => {
      if (UI.screen !== 'codex') return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      this.A.update(dt * FX.speed);
      this.A.draw((T) => this.hud(T));
      this.T.render();
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  },
  hud(T) {
    const c = this.c, G = this.A.GROUND, b = this.b;
    T.text(1, 0, 'TRAINING RANGE', '#7fe3ff');
    const d = { none: 'no defence', regular: `floor ${c.floor} regular`, elite: `floor ${c.floor} champion`, boss: `floor ${c.floor} boss` }[c.dummy];
    T.text(T.cols - d.length - 1, 0, d, DIM);
    T.text(1, G + 2, `+ ${CLASSES[c.cls].name}`, '#ffffff', { bold: true });
    T.text(1, G + 3, `${ABILITIES[c.ability].name} · rank ${rankName(c.rank >= 0 ? c.rank : Math.min(14, Math.floor(c.floor / 7)))}`, DIM);
    const ex = Math.round(T.cols * 0.55);
    T.text(ex, G + 2, '- Training Dummy', '#ffb0a0', { bold: true });
    T.text(ex, G + 3, `DEF ${b.e.def} · AVD ${b.e.avd}`, DIM);
    const tags = [];
    for (const s of b.e.statuses) tags.push([`${STATUS_INFO[s.id].name} ${s.turns}`, STATUS_INFO[s.id].color]);
    for (const bf of b.p.buffs) tags.push([`${bf.name} ${bf.turns}`, '#c3b0ff']);
    let x = ex;
    for (const [t, col] of tags) { if (x + t.length >= T.cols) break; T.text(x, G + 4, t, col); x += t.length + 2; }
  },
  readout() {
    const t = this.tally;
    const acc = t.hits + t.misses ? Math.round(100 * t.hits / (t.hits + t.misses)) + '%' : '-';
    $('cx-readout').innerHTML = `<span class="mgh">Last turn</span><b>${fmt(t.last)}</b><span class="mgh">Best</span><b>${fmt(t.best)}</b><span class="mgh">Average</span><b>${t.turns ? fmt(t.total / t.turns) : 0}</b><span class="mgh">Total</span><b>${fmt(t.total)}</b><span class="mgh">Turns</span><b>${t.turns}</b><span class="mgh">Hit</span><b>${acc}</b><span class="mgh">Crit</span><b>${t.hits ? Math.round(100 * t.crits / t.hits) + '%' : '-'}</b>`;
  },

  // ------------------------------------------------------------------ the panel
  render() {
    const c = this.c;
    const seg = (name, opts, cur) => `<div class="seg" data-seg="${name}">${opts.map(([v, l, tip]) => `<button class="${String(v) === String(cur) ? 'on' : ''}" data-v="${v}"${tip ? ` data-tip="${esc(tip)}"` : ''}>${l}</button>`).join('')}</div>`;
    let html = `
      <div class="sec">Character<span class="grip"></span></div>
      <div class="cx-classes">${Object.values(CLASSES).map((C) => `<button class="cx-cls${C.id === c.cls ? ' on' : ''}" data-cls="${C.id}">${C.name}</button>`).join('')}</div>
      <div class="cx-row"><label class="field"><span class="mgh">Birthright</span><select id="cx-ab">${Object.values(ABILITIES).map((a) => `<option value="${a.id}"${a.id === c.ability ? ' selected' : ''}>${a.name}</option>`).join('')}</select></label>
        <label class="field" style="flex:1"><span class="mgh">Floor <b id="cx-fv">${c.floor}</b> <span class="dim">${esc(stratumName(floorInfo(c.floor)))}</span></span><input type="range" id="cx-floor" min="1" max="150" value="${c.floor}"></label></div>
      <div class="cx-row"><span class="mgh">Skill rank</span>${seg('rank', [[-1, 'auto', 'One rank per 7 floors, as a steady player would have']].concat(RANKS.map((r, i) => [i, r])), c.rank)}</div>
      <div class="cx-row"><span class="mgh">Dummy</span>${seg('dummy', [['none', 'No defence'], ['regular', 'Regular'], ['elite', 'Champion'], ['boss', 'Boss']], c.dummy)}</div>
      <p class="note">The range uses a reference character for the floor: trained stats, Health and Defence masteries, no accessories. Health and mana refill every turn and cooldowns are ignored; the measured numbers below account for cooldowns.</p>
      <div class="sec">Browse<span class="grip"></span></div>
      ${seg('filter', [['skills', 'Skills'], ['weapons', 'Weapons']], c.filter)}`;
    html += c.filter === 'skills' ? this.renderSkills() : this.renderWeapons();
    const panel = $('cx-panel');
    const top = panel.scrollTop;
    panel.innerHTML = html;
    panel.scrollTop = top;
    this.bind();
    this.readout();
    $('cx-fire').textContent = c.skill ? `Fire: ${SKILLS[c.skill].name}` : 'Fire';
  },
  bind() {
    const c = this.c, P = $('cx-panel');
    P.querySelectorAll('[data-cls]').forEach((b) => { b.onclick = () => { c.cls = b.dataset.cls; if (!this.skillIds().includes(c.skill)) c.skill = CLASSES[c.cls].skills[0]; this.rebuild(); this.render(); }; });
    $('cx-ab').onchange = (e) => { c.ability = e.target.value; this.rebuild(); this.render(); };
    const fl = $('cx-floor');
    fl.oninput = () => { $('cx-fv').textContent = fl.value; };
    fl.onchange = () => { c.floor = +fl.value; this.rebuild(); this.render(); };
    P.querySelectorAll('[data-seg]').forEach((s) => s.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        const k = s.dataset.seg, v = b.dataset.v;
        if (k === 'rank') c.rank = +v;
        if (k === 'dummy') c.dummy = v;
        if (k === 'filter') c.filter = v;
        if (k === 'wtype') c.wtype = v;
        if (k !== 'filter' && k !== 'wtype') this.rebuild();
        this.render();
      };
    }));
    P.querySelectorAll('[data-skill]').forEach((b) => { b.onclick = () => { c.skill = b.dataset.skill; this.render(); }; });
    P.querySelectorAll('[data-wpn]').forEach((b) => {
      b.onclick = () => {
        const [type, tier] = b.dataset.wpn.split(':');
        c.weapon = type === 'none' ? null : { type, tier };
        this.rebuild(); this.render();
      };
    });
  },
  skillIds() {
    const cls = this.c.cls;
    return Object.keys(SKILLS).filter((id) => SKILLS[id].cls === 'adventurer' || SKILLS[id].cls === cls);
  },
  bars(rows, cur, attr) {
    // rows: [key, label, value, badgeHTML]; a horizontal bar chart, clickable
    const max = Math.max(1, ...rows.map((r) => r[2]));
    return `<div class="cx-bars">${rows.map(([k, label, v, badge, extra]) => `<button class="cx-bar${k === cur ? ' on' : ''}" ${attr}="${k}">${badge || ''}<span class="nm">${esc(label)}</span><span class="track"><span style="width:${(100 * v / max).toFixed(1)}%"></span></span><b>${fmt(v)}</b>${extra || ''}</button>`).join('')}</div>`;
  },

  renderSkills() {
    const c = this.c;
    const s = this.save;
    const st = computeStats(s);
    const id = c.skill;
    const k = SKILLS[id];
    const r = Math.max(0, s.ranks[id]);
    const C = CLASSES[k.cls];
    let html = '';
    // the chosen skill's card
    const facts = [];
    const rr = skillRange(k, r, st);
    if (rr) facts.push(['Damage', `${fmt(rr[0])} to ${fmt(rr[1])}${k.hits > 1 ? ` x ${k.hits} hits` : ''} before defence`]);
    if (k.type === 'heal') facts.push(['Heals', `${Math.round((k.heal + k.healRank * r) * 100)}% of max health + ${fmt(k.healFlat * RANK_MULT[r])}`]);
    if (k.type === 'rest') facts.push(['Restores', `${Math.round((k.restore + k.restoreRank * r) * 100)}% of max mana, lifts a debuff`]);
    if (k.buff) facts.push(['Buff', `${k.buff.name}, ${k.buff.turns} turns: ${Object.entries(k.buff.mods).map(([m, v]) => fmtMod(m, v + ((k.buff.rankMods && k.buff.rankMods[m]) || 0) * r)).join(', ')}`]);
    facts.push(['Type', { phys: 'Physical (STR)', mag: 'Magic (INT)', hyb: 'Hybrid (STR + INT)', heal: 'Heal', rest: 'Rest', buff: 'Buff' }[k.type]]);
    facts.push(['Cost', `${k.mp ? skillMp(k, r, st) + ' MP' : 'no mana'}${k.hpCost ? ` + ${Math.round(k.hpCost * 100)}% health` : ''}${k.cd ? `, cooldown ${k.cd}` : ''}`]);
    if (k.bd) facts.push(['Accuracy, balance, pierce, crit', `${k.acc}% · ${k.bal} · ${k.pierce} · +${k.crit}%`]);
    if (k.eff) facts.push(['Effects', k.eff.map((e) => `${Math.round(e.chance * 100)}% ${STATUS_INFO[e.id].name} (${e.turns})`).join(', ')]);
    facts.push(['Learn', k.learn ? `${fmt(k.learn)} SC${k.minFloor ? `, after floor ${k.minFloor - 1}` : ''}${k.ult ? ', once awakened' : ''}` : k.cls === 'adventurer' ? 'known from the start' : `free with the ${C.name} blessing`]);
    let meas = '';
    if (k.bd) {
      const m = this.measure(s, id);
      const dmy = this.dummy();
      facts.push(['Measured (60 turns)', `${fmt(m.avg)} a cast (${fmt(m.lo)} to ${fmt(m.hi)}), ${Math.round(m.hit * 100)}% of hits land, ${Math.round(m.crit * 100)}% crit`]);
      facts.push(['Per turn', `${fmt(m.perTurn)}${k.cd ? ` (cooldown ${k.cd})` : ''}${m.mp ? ` · ${m.perMp.toFixed(1)} per MP` : ''}`]);
      const turns = dmy.hpMax / Math.max(1, m.perTurn);
      facts.push(['Turns to kill', `about ${turns < 10 ? turns.toFixed(1) : Math.round(turns)} against a ${this.c.dummy === 'none' ? 'regular' : this.c.dummy === 'elite' ? 'champion' : this.c.dummy} of floor ${c.floor} (${fmt(dmy.hpMax)} health)`]);
      meas = 'ok';
    }
    html += `<div class="cx-card">
      <div class="cx-whead">${UI.badge({ kind: 'skill', id })}<div><p class="mgh">${C.name}${k.ult ? ' · awakened' : ''} · ${RARITY_BY_ID[k.tier].name}</p><h3 style="color:${RARITY_BY_ID[k.tier].color}">${esc(k.name)} <span class="rank">${rankName(r)}</span> <span class="dim">${RANK_MULT[r].toFixed(2)}x</span></h3></div></div>
      <p class="sub">${esc(k.desc)}</p>
      <dl class="cx-dl">${facts.map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}</dl>
      ${SKILL_NOTES[id] ? `<p class="cx-meta">${esc(SKILL_NOTES[id])}</p>` : ''}
    </div>`;
    // the ranking: every attack this class can use, by measured damage per turn
    const atk = this.skillIds().filter((x) => SKILLS[x].bd);
    const rows = atk.map((x) => { const m = this.measure(s, x, 30); return [x, SKILLS[x].name, m.perTurn, UI.badge({ kind: 'skill', id: x }, true)]; }).sort((a, b) => b[2] - a[2]);
    html += `<p class="mgh" style="margin-top:1em">Damage per turn on this dummy, cooldowns counted${meas ? '' : ''}. Click to pick.</p>${this.bars(rows, id, 'data-skill')}`;
    const util = this.skillIds().filter((x) => !SKILLS[x].bd);
    html += `<p class="mgh" style="margin-top:1em">Heals, rest and buffs</p><div class="cx-list">${util.map((x) => `<button class="cx-w${x === id ? ' on' : ''}" data-skill="${x}">${UI.badge({ kind: 'skill', id: x }, true)}<span>${SKILLS[x].name}</span><small>${SKILLS[x].type}</small></button>`).join('')}</div>`;
    return html;
  },

  renderWeapons() {
    const c = this.c;
    const types = Object.keys(WEAPON_TYPES);
    let html = `<div class="cx-row">${'<div class="seg" data-seg="wtype">' + [['all', 'All']].concat(types.map((t) => [t, WEAPON_TYPES[t].name])).map(([v, l]) => `<button class="${v === c.wtype ? 'on' : ''}" data-v="${v}">${l}</button>`).join('') + '</div>'}</div>`;
    const fireId = c.skill && SKILLS[c.skill].bd ? c.skill : CLASSES[c.cls].skills[0];
    const bare = this.measure(this.build(null), fireId, 30).perTurn;
    const w = this.currentWeapon();
    if (w) {
      const T = WEAPON_TYPES[w.type];
      const m = this.measure(this.save, fireId, 60);
      const fav = T.fav.includes(c.cls);
      html += `<div class="cx-card"><div class="cx-whead">${UI.badge(w)}<div><p class="mgh">${T.name} · ${RARITY_BY_ID[w.rarity].name} · item level ${c.floor}</p><h3 style="color:${RARITY_BY_ID[w.rarity].color}">${esc(itemName(w))}</h3><p class="cost sc">${fmt(armouryPrice(w))} SC in the Armoury</p></div></div>
        <p class="sub">${UI.itemLine(w)}</p><p class="note">Reference weapon: a mid roll of the damage line only. Real drops add ${RARITY_BY_ID[w.rarity].lines - 1} stat line${RARITY_BY_ID[w.rarity].lines - 1 === 1 ? '' : 's'}${RARITY_BY_ID[w.rarity].enchant ? ' and an enchant' : ''}.</p>
        <dl class="cx-dl"><dt>Boosts</dt><dd>${T.dmg.map((k) => STAT_LINES[k].name).join(' and ')}${T.dmg.length > 1 ? ' (split, at 1.5x the total)' : ''}. Leans to ${T.lean.map((k) => STAT_LINES[k].name).join(', ')}.</dd>
        <dt>Favoured by</dt><dd>${T.fav.map((x) => CLASSES[x].name).join(', ')}: their damage line counts 25% more.${fav ? ` <b class="cool">${CLASSES[c.cls].name} is one.</b>` : ''}</dd>
        <dt>Drops from</dt><dd>${TIER_FLOOR[w.rarity] ? `floor ${TIER_FLOOR[w.rarity] + 1} on` : 'the start'}${w.rarity === 'luminous' ? ', Luminous and the bosses of the Beyond only' : ''}</dd>
        <dt>With ${esc(SKILLS[fireId].name)}</dt><dd>${fmt(m.perTurn)} a turn against ${fmt(bare)} bare-handed: <b class="${m.perTurn >= bare ? 'cool' : 'hot'}">${m.perTurn >= bare ? '+' : ''}${Math.round(100 * (m.perTurn / Math.max(1, bare) - 1))}%</b>.</dd></dl></div>`;
    } else html += `<p class="sub">Pick a weapon to equip it on the range. Fire uses the skill picked under Skills (now ${esc(SKILLS[fireId].name)}).</p>`;
    // every weapon of the chosen type(s), every tier, ranked by the gain it gives this character
    const list = [];
    for (const t of types) if (c.wtype === 'all' || c.wtype === t) for (const R of RARITIES) list.push([t, R.id]);
    const rows = list.map(([t, tier]) => {
      const it = this.weaponItem(t, tier, c.floor);
      const v = this.measure(this.build(it), fireId, 20).perTurn;
      const pctGain = Math.round(100 * (v / Math.max(1, bare) - 1));
      return [`${t}:${tier}`, `${RARITY_BY_ID[tier].name} ${WEAPON_TYPES[t].name}`, v, UI.badge(it, true), `<small class="${tierOpen(tier, c.floor - 1) ? 'cool' : 'dim'}">+${pctGain}%</small>`];
    });
    if (c.wtype !== 'all') rows.sort((a, b) => b[2] - a[2]);
    html += `<p class="mgh" style="margin-top:1em">${esc(SKILLS[fireId].name)} per turn with each weapon (floor ${c.floor}); green tiers can drop at this depth. <button class="mini" data-wpn="none:x">Bare hands</button></p>${this.bars(rows, w ? `${w.type}:${w.rarity}` : '', 'data-wpn')}`;
    return html;
  },
};
