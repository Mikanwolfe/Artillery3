'use strict';
// One fight: you against one foe, turn about, like the original (which alternated p1 and p2 at
// :grid.p1 / :grid.p2). The logic resolves a whole round at once and returns a list of events; the UI
// plays them back as animations, and tools/sim.mjs ignores them.
//
// A round: your action (a skill or Guard; a potion is free, once a turn) -> the foe's action -> the end
// of the round (damage over time, regeneration, durations, cooldowns) -> the foe picks its next move,
// which shows as its intent.

const STATUS_INFO = {
  burn: { name: 'Burn', color: '#ff7a4d', debuff: true, dot: true },
  poison: { name: 'Poison', color: '#9be05a', debuff: true, dot: true, maxStacks: 5 },
  bleed: { name: 'Bleed', color: '#ff4d6a', debuff: true, dot: true },
  stun: { name: 'Stun', color: '#ffe066', debuff: true },
  silence: { name: 'Silence', color: '#b6a6ff', debuff: true },
  weaken: { name: 'Weaken', color: '#d9a0ff', debuff: true },
  vuln: { name: 'Vulnerable', color: '#ff9ad5', debuff: true },
  blind: { name: 'Blind', color: '#9aa0b5', debuff: true },
  chill: { name: 'Chill', color: '#7fe3ff', debuff: true },
  doom: { name: 'Doom', color: '#ff3355', debuff: true },
};
const RANDOM_EFFS = ['burn', 'poison', 'bleed', 'blind', 'chill', 'weaken', 'vuln'];
const WEAKEN = 0.25, VULN = 0.25, BLIND = 30, CHILL = 0.25;
const DOT_PLAYER_SHARE = 2.5;   // a DoT you apply ticks for pow x 2.5 of the hit that applied it, every turn
const STUN_GUARD = 2;           // rounds of stun immunity after a stun wears off (no stun-locks either way)
const ENEMY_BASE_ACC = 84;      // an enemy move's hit chance before accuracy vs avoidance
const ENEMY_MAG_PIERCE = 30;    // magic moves ignore some armour

class Battle {
  constructor(save, enemy, opts = {}) {
    this.save = save;
    this.e = enemy;
    this.opts = opts;
    this.r = opts.rng || rng;
    this.round = 1;
    this.over = null;
    this.events = [];
    this.p = {
      hp: 0, mp: 0, shield: 0, statuses: [], buffs: [], cds: {}, guard: false, stunGuard: 0,
      potionUsed: false, hunter: 0, firstHit: true, dealt: 0, taken: 0, biggest: 0, crits: 0, turnsLow: 0,
    };
    const st = this.stats();
    const startHp = opts.hp != null ? opts.hp : 1, startMp = opts.mp != null ? opts.mp : 1; // shares of max
    this.p.hp = Math.max(1, Math.round(st.hpMax * startHp));
    this.p.mp = Math.round(st.mpMax * startMp);
    Object.assign(this.e, { shield: 0, statuses: [], buffs: [], cds: {}, used: {}, phaseIdx: -1, cycleIdx: 0, charging: null,
      stunGuard: 0, revived: false, hist: [], heads: 0, intent: null, lostHeads: 0 });
    if (this.e.ward) this.e.shield = Math.round(this.e.hpMax * this.e.ward);
    if (this.e.passive.heads) this.e.heads = this.e.passive.heads.start;
    this.stolen = 0;
    if (this.e.passive.first) {
      this.emit({ t: 'msg', text: `${this.e.name} strikes first!`, color: '#ffb84d' });
      this.enemyTurn();
      this.endRound(true);
    }
    this.chooseIntent();
  }

  // ----------------------------------------------------------------------------- helpers
  emit(ev) {
    ev.snap = { p: { hp: this.p.hp, mp: this.p.mp, shield: this.p.shield }, e: { hp: this.e.hp, shield: this.e.shield } };
    this.events.push(ev);
    return ev;
  }
  flush() { const ev = this.events; this.events = []; return ev; }
  stats() {
    const buffs = this.p.buffs.map((b) => ({ mods: b.mods }));
    const st = computeStats(this.save, buffs);
    return st;
  }
  has(who, id) { return who.statuses.find((s) => s.id === id); }
  enemyMod(k) { let v = 0; for (const b of this.e.buffs) if (b.mods && b.mods[k]) v += b.mods[k]; return v; }
  perk(id) { return perkRank(this.save, id); }

  addStatus(who, eff, refDmg = 0) {
    const isPlayer = who === this.p;
    if (eff.id === 'stun' && who.stunGuard > 0) return null;
    if (eff.id === 'stun' && !isPlayer && this.e.boss && this.r.chance(0.5)) {
      this.emit({ t: 'msg', text: `${this.e.baseName} shrugs off the stun.`, color: '#9aa0b5' });
      return null;
    }
    const info = STATUS_INFO[eff.id];
    let pow = eff.pow || 0;
    if (info.dot && !isPlayer) pow = Math.max(1, Math.round(refDmg * pow * DOT_PLAYER_SHARE)); // flat ticks from your hit
    const cur = who.statuses.find((s) => s.id === eff.id);
    if (cur) {
      if (eff.id === 'poison') cur.stacks = Math.min(info.maxStacks, cur.stacks + (eff.stacks || 1));
      cur.turns = Math.max(cur.turns, eff.turns);
      cur.pow = Math.max(cur.pow, pow);
    } else {
      who.statuses.push({ id: eff.id, turns: eff.turns, pow, stacks: eff.id === 'poison' ? (eff.stacks || 1) : 1 });
    }
    if (eff.id === 'stun' && !isPlayer && this.e.charging) {
      this.emit({ t: 'msg', text: `${this.e.baseName}'s ${this.e.charging.name} is broken!`, color: '#ffe066' });
      this.e.charging = null;
    }
    this.emit({ t: 'status', to: isPlayer ? 'p' : 'e', id: eff.id, text: info.name + (eff.id === 'poison' ? ` x${(who.statuses.find((s) => s.id === 'poison') || {}).stacks}` : ''), color: info.color });
    return true;
  }
  cleanse(who, n) {
    let k = 0;
    for (let i = who.statuses.length - 1; i >= 0 && k < n; i--) {
      if (STATUS_INFO[who.statuses[i].id].debuff) { who.statuses.splice(i, 1); k++; }
    }
    if (k) this.emit({ t: 'cleanse', to: who === this.p ? 'p' : 'e', n: k });
    return k;
  }

  // ----------------------------------------------------------------------------- the player's turn
  // Can this skill be used now? Returns null or a reason.
  blocked(id) {
    const s = SKILLS[id];
    if (!s) return 'Unknown';
    const rank = this.save.ranks[id];
    if (rank == null || rank < 0) return 'Not learnt';
    if (!classAllows(this.save, id)) return `${CLASSES[s.cls].name} only`;
    if (this.p.cds[id] > 0) return `Cooldown ${this.p.cds[id]}`;
    if (this.has(this.p, 'silence') && ['mag', 'hyb', 'heal', 'buff'].includes(s.type)) return 'Silenced';
    const st = this.stats();
    const mp = skillMp(s, rank, st);
    if (this.p.mp < mp) return 'Not enough MP';
    if (s.hpCost && this.p.hp <= Math.round(st.hpMax * s.hpCost)) return 'Not enough HP';
    return null;
  }

  usePotion(slot) {
    if (this.over || this.p.potionUsed) return [];
    const q = this.save.quick[slot];
    if (!q || q.n <= 0) return [];
    const P = POTIONS[q.id];
    const st = this.stats();
    const k = 1 + st.potionPct;
    this.p.potionUsed = true;
    q.n--;
    if (q.n <= 0) this.save.quick[slot] = null;
    this.emit({ t: 'act', who: 'p', name: P.name, fx: 'potion', potion: q.id });
    if (P.setHalf) {
      this.p.hp = Math.max(1, Math.round(st.hpMax * 0.5));
      this.p.mp = Math.round(st.mpMax * 0.5);
      this.emit({ t: 'heal', to: 'p', amount: 0, text: 'Health and mana set to half' });
    }
    if (P.heal) this.healPlayer(st.hpMax * P.heal * k, st);
    if (P.mpGain) this.gainMp(st.mpMax * P.mpGain * k, st);
    if (P.cleanse) this.cleanse(this.p, P.cleanse);
    if (P.buff) {
      const mods = {};
      for (const [m, v] of Object.entries(P.buff.mods || {})) mods[m] = v * k;
      this.p.buffs = this.p.buffs.filter((b) => b.name !== P.buff.name);
      this.p.buffs.push({ name: P.buff.name, turns: P.buff.turns, mods, deny: P.buff.deny, recoil: P.buff.recoil, potion: true });
      this.emit({ t: 'buff', to: 'p', name: P.buff.name });
      this.clampPlayer();
    }
    this.save.stats.potions = (this.save.stats.potions || 0) + 1;
    return this.flush();
  }

  act(action) {
    if (this.over) return [];
    if (this.has(this.p, 'stun')) {
      // shouldn't happen (stuns are spent automatically), but keep the loop safe
      action = { type: 'stunned' };
    }
    if (action.type === 'skill') {
      const why = this.blocked(action.id);
      if (why) return [{ t: 'nope', text: why }];
      this.playerSkill(action.id);
    } else if (action.type === 'guard') {
      const st = this.stats();
      this.p.guard = true;
      this.emit({ t: 'act', who: 'p', name: 'Guard', fx: 'guard' });
      this.gainMp(st.mpMax * GUARD_MP, st);
    }
    if (!this.over) this.afterPlayer();
    return this.flush();
  }

  afterPlayer() {
    if (this.checkEnemyDeath()) return;
    this.enemyTurn();
    if (this.over) return;
    this.endRound();
    if (this.over) return;
    this.chooseIntent();
    // a stunned player loses the next turn: play it out at once
    let guard = 0;
    while (!this.over && this.has(this.p, 'stun') && guard++ < 5) {
      this.emit({ t: 'msg', text: 'You are stunned and lose your turn!', color: '#ffe066' });
      this.p.statuses = this.p.statuses.filter((s) => s.id !== 'stun');
      this.p.stunGuard = STUN_GUARD;
      this.enemyTurn();
      if (this.over) return;
      this.endRound();
      if (this.over) return;
      this.chooseIntent();
    }
  }

  playerSkill(id) {
    const s = SKILLS[id];
    const rank = this.save.ranks[id];
    let st = this.stats();
    const gifted = this.r.chance(0.05 * this.perk('gifted'));
    let mp = skillMp(s, rank, st);
    if (gifted) mp = 0;
    else if (mp && this.r.chance(0.12 * this.perk('potential'))) mp = Math.round(mp / 2);
    this.p.mp -= mp;
    if (s.hpCost) {
      const c = Math.round(st.hpMax * s.hpCost);
      this.p.hp = Math.max(1, this.p.hp - c);
    }
    this.p.cds[id] = gifted ? 0 : s.cd + (s.cd ? 1 : 0);
    this.emit({ t: 'act', who: 'p', name: s.name, fx: s.fx, skill: id, mp, gifted });
    this.save.stats.casts = this.save.stats.casts || {};
    this.save.stats.casts[id] = (this.save.stats.casts[id] || 0) + 1;

    if (s.type === 'heal') {
      const amt = (st.hpMax * (s.heal + s.healRank * rank) + s.healFlat * RANK_MULT[rank]) * (1 + st.healPct);
      this.healPlayer(amt, st);
      if (s.cleanse) this.cleanse(this.p, s.cleanse);
      return;
    }
    if (s.type === 'rest') {
      const ab = ABILITIES[this.save.ability];
      const amt = (st.mpMax * (s.restore + s.restoreRank * rank) + 8 * RANK_MULT[rank]) * (1 + (ab.restBonus || 0));
      this.gainMp(amt, st);
      this.cleanse(this.p, 1);
      return;
    }
    if (s.type === 'buff') {
      const mods = { ...s.buff.mods };
      if (s.buff.rankMods) for (const [k, v] of Object.entries(s.buff.rankMods)) mods[k] = (mods[k] || 0) + v * rank;
      this.p.buffs = this.p.buffs.filter((b) => b.name !== s.buff.name);
      this.p.buffs.push({ name: s.buff.name, turns: s.buff.turns, mods });
      this.emit({ t: 'buff', to: 'p', name: s.buff.name });
      if (s.shield) { const sh = Math.round(this.stats().hpMax * s.shield); this.p.shield += sh; this.emit({ t: 'shield', to: 'p', amount: sh }); }
      if (s.eff) for (const ef of s.eff) if (ef.target === 'foe' && this.r.chance(ef.chance)) this.addStatus(this.e, ef);
      this.clampPlayer();
      return;
    }
    // attacks
    st = this.stats();
    const extra = this.r.chance(0.08 * this.perk('final'));
    const hits = s.hits + (extra ? 1 : 0);
    for (let h = 0; h < hits && !this.over; h++) {
      const half = extra && h === hits - 1;
      if (half) this.emit({ t: 'msg', text: 'Final: a second strike!', color: '#c3b0ff' });
      this.playerHit(s, rank, st, half ? 0.5 : 1, h);
      if (this.e.hp <= 0) break;
    }
    if (s.selfHeal) this.healPlayer(st.hpMax * s.selfHeal, st);
  }

  playerHit(s, rank, st, scale, idx) {
    const e = this.e;
    const ab = ABILITIES[this.save.ability];
    let acc = s.acc - (this.has(this.p, 'blind') ? BLIND : 0);
    const myAcc = st.acc * (this.has(this.p, 'chill') ? 1 - CHILL : 1);
    const theirAvd = e.avd * (1 + this.enemyMod('avdPct')) * (this.has(e, 'chill') ? 1 - CHILL : 1);
    const deadeye = this.r.chance(0.08 * this.perk('deadeye'));
    const chance = deadeye ? 100 : hitChance(acc, myAcc, theirAvd);
    if (this.r.next() * 100 >= chance) {
      this.p.hunter = 0;
      this.emit({ t: 'miss', to: 'e', idx });
      return;
    }
    let max = s.bd * RANK_MULT[rank] * powerOf(st, s.type);
    if (s.defScale) max += (st.def * s.defScale + st.hpMax * s.hpScale) * RANK_MULT[rank];
    let mult = 1 + st.dmgPct + (s.type === 'phys' ? st.physPct : s.type === 'mag' ? st.magPct : (st.physPct + st.magPct) / 2);
    if (e.boss) mult += st.bossPct;
    mult += 0.03 * this.perk('concentration') * Math.min(10, this.round);
    mult += 0.04 * this.perk('hunter') * Math.min(10, this.p.hunter);
    if (ab.execute && e.hp < e.hpMax * 0.3) mult += ab.execute;
    if (deadeye) mult += 0.25;
    if (this.has(this.p, 'weaken')) mult *= 1 - WEAKEN;
    if (this.has(e, 'vuln')) mult *= 1 + VULN;
    let critChance = st.crit + s.crit + (this.p.hp < this.stats().hpMax * 0.25 ? 15 * this.perk('adrenaline') : 0);
    critChance = Math.min(CRIT_CAP, critChance);
    let crit = this.r.next() * 100 < critChance;
    if (ab.firstCrit && this.p.firstHit) crit = true;
    this.p.firstHit = false;
    let dmg = rollDamage(max, st.bal, s.bal, this.r) * mult * scale * (crit ? st.critMult : 1);
    const eDef = e.def * (1 + this.enemyMod('defPct'));
    dmg = mitigate(dmg, eDef, st.dfp, s.pierce, this.enemyMod('prot'));
    dmg = Math.max(1, Math.round(dmg));
    this.p.hunter++;
    const dealt = this.damageEnemy(dmg, crit, idx);
    // after-effects
    const corrupt = this.p.buffs.find((b) => b.recoil);
    if (corrupt) this.damagePlayer(Math.round(dealt * corrupt.recoil), { quiet: false, kind: 'recoil', noGuard: true });
    const ls = (s.lifesteal || 0) + st.lifesteal;
    if (ls > 0 && dealt > 0) this.healPlayer(dealt * ls, st, true);
    if (e.passive.thorns && dealt > 0) this.damagePlayer(Math.round(dealt * e.passive.thorns), { kind: 'thorns', noGuard: true });
    if (e.hp > 0) {
      if (s.eff) for (const ef of s.eff) if (ef.target !== 'foe' && this.r.chance(ef.chance)) this.addStatus(e, ef, dealt);
      if ((crit && ab.critBleed) || (st.bleedOnHit && this.r.chance(st.bleedOnHit))) this.addStatus(e, { id: 'bleed', turns: 2, pow: 0.08 }, dealt);
    }
  }

  damageEnemy(dmg, crit, idx, kind = 'hit') {
    const e = this.e;
    let absorbed = 0;
    if (e.shield > 0) { absorbed = Math.min(e.shield, dmg); e.shield -= absorbed; }
    const real = dmg - absorbed;
    const before = e.hp;
    e.hp = Math.max(0, e.hp - real);
    const dealt = before - e.hp;
    this.p.dealt += dealt;
    if (dmg > this.p.biggest) this.p.biggest = dmg;
    if (crit) this.p.crits++;
    const label = kind === 'hit' ? hitLabel(dmg, e.hpMax, crit) : '';
    this.emit({ t: 'dmg', to: 'e', amount: dmg, absorbed, crit, label, idx, kind });
    // hydra: big damage costs heads
    if (e.passive.heads) {
      const lost = Math.floor((1 - e.hp / e.hpMax) / 0.2);
      if (lost > e.lostHeads && e.hp > 0) {
        const n = lost - e.lostHeads;
        e.lostHeads = lost;
        e.heads = Math.max(1, e.heads - n);
        this.emit({ t: 'msg', text: `A head falls! (${e.heads} left)`, color: '#ff8a5c' });
      }
    }
    return dealt;
  }

  healPlayer(amount, st, quiet) {
    st = st || this.stats();
    const before = this.p.hp;
    this.p.hp = Math.min(st.hpMax, Math.round(this.p.hp + amount));
    const got = this.p.hp - before;
    if (got > 0 || !quiet) this.emit({ t: 'heal', to: 'p', amount: got, quiet });
    return got;
  }
  gainMp(amount, st) {
    st = st || this.stats();
    const before = this.p.mp;
    this.p.mp = Math.min(st.mpMax, Math.round(this.p.mp + amount));
    this.emit({ t: 'mp', to: 'p', amount: this.p.mp - before });
  }
  clampPlayer() {
    const st = this.stats();
    this.p.hp = Math.min(this.p.hp, st.hpMax);
    this.p.mp = Math.min(this.p.mp, st.mpMax);
  }

  // ----------------------------------------------------------------------------- the foe's turn
  enemyMoves() {
    const e = this.e;
    let moves = e.moves.slice();
    for (let i = 0; i <= e.phaseIdx; i++) {
      const ph = e.phases[i];
      if (ph.set) moves = ph.set.slice();
      if (ph.add) moves = moves.concat(ph.add);
    }
    if (e.passive.cycle) {
      const set = e.passive.cycle.sets[e.cycleIdx % e.passive.cycle.sets.length];
      moves = moves.concat(set.moves);
    }
    return moves;
  }
  cycleSet() { return this.e.passive.cycle ? this.e.passive.cycle.sets[this.e.cycleIdx % this.e.passive.cycle.sets.length] : null; }

  chooseIntent() {
    const e = this.e;
    if (this.over) return;
    if (e.charging) { e.intent = { move: e.charging.then, charge: e.charging, wind: e.charging.left }; return; }
    const hpShare = e.hp / e.hpMax;
    const silenced = this.has(e, 'silence');
    const opts = this.enemyMoves().filter((m) => {
      if ((e.cds[m.name] || 0) > 0) return false;
      if (m.once && e.used[m.name]) return false;
      if (m.hpBelow && hpShare >= m.hpBelow) return false;
      if (m.kind === 'heal' && hpShare > 0.9) return false;
      if (m.kind === 'rewind' && !this.rewindTarget()) return false;
      if (m.kind === 'buff' && e.buffs.find((b) => b.name === m.name)) return false;
      if (silenced && ((m.type || e.type) === 'mag' || ['heal', 'shield', 'buff', 'debuff', 'rewind'].includes(m.kind))) return false;
      return true;
    });
    const m = opts.length ? this.r.weighted(opts, (x) => x.w || 1) : { kind: 'hit', name: 'Strike', pow: 0.8, type: 'phys' };
    e.intent = { move: m };
  }

  intentInfo() {
    // what the UI shows over the foe: the move, a rough damage figure and a warning for charges
    const e = this.e;
    const it = e.intent;
    if (!it) return null;
    const m = it.move;
    if (it.charge) return { kind: 'charge', name: m.name, turns: it.wind, est: this.estimate(m), text: `${m.name} in ${it.wind}` };
    if (m.kind === 'charge') return { kind: 'charge', name: m.name, est: this.estimate(m.then), text: m.name === m.then.name ? `${m.name} is coming` : `${m.name}: ${m.then.name} is coming` };
    if (['hit', 'multi', 'drain', 'mpburn'].includes(m.kind)) return { kind: 'attack', name: m.name, est: this.estimate(m), hits: this.hitsOf(m) };
    return { kind: m.kind, name: m.name };
  }
  hitsOf(m) { return m.heads ? this.e.heads : (m.hits || 1); }
  estimate(m) {
    // expected damage of a move against you right now (before misses and crits)
    const e = this.e;
    const st = this.stats();
    const type = m.type || e.type;
    const max = e.dmg * m.pow * this.enemyDmgMult();
    const avg = max * (e.bal + 65) / (100 + e.bal + 30);
    const pierce = (m.pierce || 0) + (type === 'mag' ? ENEMY_MAG_PIERCE : 0);
    let d = mitigate(avg, st.def, e.dfp, pierce, st.prot);
    if (this.has(this.p, 'vuln')) d *= 1 + VULN;
    return Math.round(d * this.hitsOf(m));
  }
  enemyDmgMult() {
    const e = this.e;
    let k = 1 + this.enemyMod('dmgPct');
    if (e.passive.enrage && e.hp < e.hpMax * 0.5) k += e.passive.enrage;
    if (this.round > ENRAGE_ROUND) k *= 1 + ENRAGE_STEP * (this.round - ENRAGE_ROUND);
    if (this.has(e, 'weaken')) k *= 1 - WEAKEN;
    return k;
  }

  enemyTurn() {
    const e = this.e;
    if (e.hp <= 0 || this.over) return;
    if (this.has(e, 'stun')) {
      e.statuses = e.statuses.filter((s) => s.id !== 'stun');
      e.stunGuard = STUN_GUARD;
      this.emit({ t: 'msg', text: `${e.baseName} is stunned!`, color: '#ffe066' });
      return;
    }
    const it = e.intent || { move: { kind: 'hit', name: 'Strike', pow: 0.8 } };
    let m = it.move;
    if (it.charge) {
      it.charge.left--;
      if (it.charge.left > 0) {
        this.emit({ t: 'act', who: 'e', name: it.charge.name, fx: 'charge', charge: true, text: `${it.charge.then.name} in ${it.charge.left}` });
        return;
      }
      e.charging = null;
      m = it.charge.then;
    } else if (m.kind === 'charge') {
      e.cds[m.name] = (m.cd || 3) + 1;
      e.charging = { name: m.name, then: m.then, left: m.wind || 1 };
      this.emit({ t: 'act', who: 'e', name: m.name, fx: 'charge', charge: true, text: `${m.then.name} is coming!` });
      return;
    }
    if (m.cd) e.cds[m.name] = m.cd + 1;
    if (m.once) e.used[m.name] = true;
    this.enemyDo(m);
  }

  enemyDo(m) {
    const e = this.e;
    const type = m.type || e.type;
    this.emit({ t: 'act', who: 'e', name: m.name, fx: this.enemyFx(m, type), kind: m.kind });
    if (m.kind === 'buff') {
      e.buffs = e.buffs.filter((b) => b.name !== m.name);
      e.buffs.push({ name: m.name, turns: m.turns, mods: m.mods });
      if (m.selfCost) e.hp = Math.max(1, Math.round(e.hp - e.hpMax * m.selfCost));
      this.emit({ t: 'buff', to: 'e', name: m.name });
      return;
    }
    if (m.kind === 'shield') {
      const sh = Math.round(e.hpMax * m.pow);
      e.shield += sh;
      this.emit({ t: 'shield', to: 'e', amount: sh });
      return;
    }
    if (m.kind === 'heal') {
      const before = e.hp;
      e.hp = Math.min(e.hpMax, Math.round(e.hp + e.hpMax * m.pow));
      this.emit({ t: 'heal', to: 'e', amount: e.hp - before });
      return;
    }
    if (m.kind === 'rewind') {
      const target = this.rewindTarget();
      const before = e.hp;
      if (target) e.hp = Math.min(e.hpMax, target);
      this.emit({ t: 'heal', to: 'e', amount: e.hp - before, text: 'Time runs backwards' });
      return;
    }
    if (m.kind === 'debuff') {
      if (m.dispel && (this.p.buffs.length || this.p.shield)) {
        this.p.buffs = this.p.buffs.filter((b) => b.potion && b.deny); // a Denial Analeptic still holds
        this.p.shield = 0;
        this.emit({ t: 'msg', text: 'Your blessings are stripped away!', color: '#c38bff' });
      }
      const denied = this.p.buffs.find((b) => b.deny);
      for (const ef of m.eff || []) if (!denied && this.r.chance(ef.chance)) this.addStatus(this.p, ef);
      return;
    }
    // attacks
    const hits = this.hitsOf(m);
    for (let h = 0; h < hits && !this.over; h++) this.enemyHit(m, type, h);
  }
  enemyFx(m, type) {
    if (m.kind === 'buff' || m.kind === 'shield') return 'ebuff';
    if (m.kind === 'heal' || m.kind === 'rewind') return 'eheal';
    if (m.kind === 'debuff') return 'ecurse';
    if (m.kind === 'drain') return 'edrain';
    if (m.kind === 'multi') return type === 'mag' ? 'emagmulti' : 'emulti';
    if (m.pow >= 2.4) return type === 'mag' ? 'ebigmag' : 'ebig';
    return type === 'mag' ? 'emag' : 'ehit';
  }

  enemyHit(m, type, idx) {
    const e = this.e;
    const st = this.stats();
    if (this.r.chance(0.06 * this.perk('sixthsense'))) {
      this.emit({ t: 'miss', to: 'p', idx, text: 'Sixth Sense!' });
      return;
    }
    const eAcc = e.acc * (this.has(e, 'chill') ? 1 - CHILL : 1);
    const myAvd = st.avd * (this.has(this.p, 'chill') ? 1 - CHILL : 1);
    const chance = hitChance(ENEMY_BASE_ACC + (m.acc || 0) - (this.has(e, 'blind') ? BLIND : 0), eAcc, myAvd);
    if (this.r.next() * 100 >= chance) { this.emit({ t: 'miss', to: 'p', idx }); return; }
    const max = e.dmg * m.pow * this.enemyDmgMult();
    const crit = this.r.next() * 100 < e.crit;
    let dmg = rollDamage(max, e.bal, 30, this.r) * (crit ? e.critMult : 1);
    const pierce = (m.pierce || 0) + (type === 'mag' ? ENEMY_MAG_PIERCE : 0);
    dmg = mitigate(dmg, st.def, e.dfp, pierce, st.prot);
    if (this.has(this.p, 'vuln')) dmg *= 1 + VULN;
    dmg = Math.max(1, Math.round(dmg));
    const taken = this.damagePlayer(dmg, { crit, idx, label: crit ? 'Critical' : '' });
    if (taken > 0) {
      const ls = (m.lifesteal || 0) + (e.passive.lifesteal || 0);
      if (ls) { const before = e.hp; e.hp = Math.min(e.hpMax, Math.round(e.hp + taken * ls)); if (e.hp > before) this.emit({ t: 'heal', to: 'e', amount: e.hp - before, quiet: true }); }
      const burnMp = (m.mpBurn || 0) + (e.mpBurnAffix || 0);
      if (burnMp) {
        const lost = Math.min(this.p.mp, Math.round(st.mpMax * burnMp));
        this.p.mp -= lost;
        if (lost) this.emit({ t: 'mp', to: 'p', amount: -lost });
      }
      if (m.steal && this.save.sc > 0) {
        const s = Math.max(1, Math.round(this.save.sc * m.steal));
        this.save.sc -= s;
        this.stolen += s;
        this.emit({ t: 'msg', text: `-${fmt(s)} Soul Coins stolen!`, color: '#f2c45a' });
      }
      const effs = (m.eff || []).concat(e.passive.onHit || []);
      if (m.randomEff) effs.push({ id: this.r.pick(RANDOM_EFFS), chance: 0.6, turns: 2, pow: 0.05 });
      for (const ef of effs) if (this.p.hp > 0 && this.r.chance(ef.chance)) this.addStatus(this.p, ef);
    }
  }

  damagePlayer(dmg, o = {}) {
    const deny = this.p.buffs.find((b) => b.deny);
    if (deny && o.kind !== 'recoil') { this.emit({ t: 'dmg', to: 'p', amount: 0, label: 'Denied', idx: o.idx }); return 0; }
    if (this.p.guard && !o.noGuard) dmg = Math.round(dmg * (1 - GUARD_CUT));
    let absorbed = 0;
    if (this.p.shield > 0) { absorbed = Math.min(this.p.shield, dmg); this.p.shield -= absorbed; }
    const real = dmg - absorbed;
    const before = this.p.hp;
    this.p.hp = Math.max(0, this.p.hp - real);
    this.p.taken += before - this.p.hp;
    this.emit({ t: 'dmg', to: 'p', amount: dmg, absorbed, crit: o.crit, label: o.label || '', idx: o.idx, kind: o.kind || 'hit' });
    this.checkPlayerDeath();
    return before - this.p.hp;
  }

  rewindTarget() {
    const h = this.e.hist;
    if (h.length < 2) return null;
    const v = h[h.length - 2];
    return v > this.e.hp + this.e.hpMax * 0.05 ? v : null;
  }

  // ----------------------------------------------------------------------------- the end of a round
  endRound(silent) {
    const e = this.e, p = this.p;
    const st = this.stats();
    // damage over time
    for (const who of [p, e]) {
      for (const s of who.statuses) {
        if (!STATUS_INFO[s.id].dot) continue;
        if (who === p) {
          if (p.buffs.find((b) => b.deny)) continue;
          const dmg = Math.max(1, Math.round(st.hpMax * s.pow * s.stacks));
          this.damagePlayer(dmg, { kind: s.id, noGuard: true, label: STATUS_INFO[s.id].name });
          if (this.over) return;
        } else if (e.hp > 0) {
          const dmg = Math.max(1, Math.round(s.pow * s.stacks));
          this.damageEnemy(dmg, false, 0, s.id);
        }
      }
    }
    // doom
    const doom = this.has(p, 'doom');
    if (doom && doom.turns <= 1) {
      p.statuses = p.statuses.filter((s) => s !== doom);
      this.emit({ t: 'msg', text: 'Your name is called. Doom falls!', color: '#ff3355' });
      this.damagePlayer(Math.round(st.hpMax * doom.pow), { kind: 'doom', label: 'Doom' });
      if (this.over) return;
    }
    if (this.checkEnemyDeath()) return;
    // regeneration
    if (st.hpRegen > 0 && p.hp < st.hpMax) this.healPlayer(st.hpMax * st.hpRegen, st, true);
    if (p.mp < st.mpMax) { const before = p.mp; p.mp = Math.min(st.mpMax, Math.round(p.mp + st.mpMax * st.mpRegen)); if (p.mp > before) this.emit({ t: 'mp', to: 'p', amount: p.mp - before, quiet: true }); }
    if (e.passive.regen && e.hp < e.hpMax) { const before = e.hp; e.hp = Math.min(e.hpMax, Math.round(e.hp + e.hpMax * e.passive.regen)); this.emit({ t: 'heal', to: 'e', amount: e.hp - before, quiet: true }); }
    // durations
    for (const who of [p, e]) {
      who.statuses = who.statuses.filter((s) => s.id === 'stun' || --s.turns > 0);
      who.buffs = who.buffs.filter((b) => --b.turns > 0);
      for (const k of Object.keys(who.cds)) if (who.cds[k] > 0) who.cds[k]--;
      if (who.stunGuard > 0) who.stunGuard--;
    }
    p.guard = false;
    p.potionUsed = false;
    this.clampPlayer();
    // passives that run on the clock
    e.hist.push(e.hp);
    if (e.passive.heads) {
      if (this.round % e.passive.heads.every === 0 && e.heads < e.passive.heads.max) {
        if (this.has(e, 'burn')) this.emit({ t: 'msg', text: 'The burns stop a new head from growing.', color: '#ff7a4d' });
        else { e.heads++; this.emit({ t: 'msg', text: `A new head grows! (${e.heads})`, color: '#ff8a5c' }); }
      }
    }
    if (e.passive.cycle && this.round % e.passive.cycle.every === 0) {
      e.cycleIdx++;
      const set = this.cycleSet();
      this.emit({ t: 'phase', text: `${set.name}`, color: set.color || '#ffffff' });
    }
    if (e.passive.curse && this.round % 3 === 0) this.addStatus(p, { id: 'weaken', turns: 2 });
    if (p.hp < st.hpMax * 0.1) p.turnsLow++;
    this.round++;
    if (this.round === ENRAGE_ROUND + 1) this.emit({ t: 'msg', text: `The stream grows impatient: ${e.baseName} hits harder every round.`, color: '#ff5a7a' });
    if (!silent) this.emit({ t: 'round', n: this.round });
  }

  // ----------------------------------------------------------------------------- deaths and phases
  checkEnemyDeath() {
    const e = this.e;
    // phases
    const share = e.hp / e.hpMax;
    while (e.hp > 0 && e.phaseIdx + 1 < e.phases.length && share < e.phases[e.phaseIdx + 1].below) {
      e.phaseIdx++;
      const ph = e.phases[e.phaseIdx];
      if (ph.mods) e.buffs.push({ name: ph.name || 'Phase', turns: 999, mods: ph.mods });
      if (ph.replace) for (const [name, rep] of Object.entries(ph.replace)) {
        for (const mv of e.moves) if (mv.name === name) Object.assign(mv, rep);
        if (e.charging && e.charging.name === name && rep.wind) e.charging.left = Math.min(e.charging.left, rep.wind);
      }
      e.charging = ph.set ? null : e.charging;
      this.emit({ t: 'phase', text: ph.msg, color: '#ff5a7a', name: ph.name });
    }
    if (e.hp > 0) return false;
    if (e.passive.revive && !e.revived) {
      e.revived = true;
      e.hp = Math.round(e.hpMax * e.passive.revive);
      e.statuses = [];
      e.charging = null;
      this.emit({ t: 'revive', who: 'e', text: e.passive.reviveMsg });
      return false;
    }
    if (e.passive.rebirth && !e.revived) {
      e.revived = true;
      e.hp = Math.round(e.hpMax * e.passive.rebirth);
      e.statuses = [];
      e.charging = null;
      e.buffs.push({ name: 'Reborn', turns: 999, mods: { dmgPct: 0.1 } });
      this.emit({ t: 'revive', who: 'e', text: e.passive.rebirthMsg });
      return false;
    }
    this.over = 'win';
    this.emit({ t: 'death', who: 'e' });
    return true;
  }
  checkPlayerDeath() {
    if (this.p.hp > 0 || this.over) return false;
    this.over = 'lose';
    this.emit({ t: 'death', who: 'p' });
    return true;
  }
}

// may the current class use this skill? Adventurer skills always; class skills only in that class.
function classAllows(save, id) {
  const s = SKILLS[id];
  return s.cls === 'adventurer' || s.cls === save.cls;
}
