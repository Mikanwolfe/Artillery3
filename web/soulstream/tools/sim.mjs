// Balance simulator: plays whole runs headless with the game's own code, so the curves in rules.js
// can be checked after a change.
//   node tools/sim.mjs [--runs N] [--fights N] [--class eweca|laceda|falias|luminous] [--ability id] [--seed N] [--verbose]
// A bot plays each fight (guards telegraphed blows, heals, picks the best expected damage) and shops
// greedily by power gained per Soul Coin/XP spent. It is a decent player, not a perfect one.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['util', 'rules', 'skills', 'classes', 'items', 'enemies', 'battle', 'state'];
const ctx = { console, Math, Date, JSON, Object, Array, localStorage: undefined, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), atob: (s) => Buffer.from(s, 'base64').toString('binary') };
vm.createContext(ctx);
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
const G = (name) => vm.runInContext(name, ctx);

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true] : null).filter(Boolean));
const RUNS = +args.runs || 4, FIGHTS = +args.fights || 900, VERBOSE = !!args.verbose;
const CLASS = args.class || 'eweca', ABILITY = args.ability || null;

const { computeStats, SKILLS, RANK_MULT, powerOf, mitigate, hitChance, skillMp, rankUpCost, MASTERIES, makeEnemy, floorInfo, rng,
  newSave, startFight, finishFight, restAtSanctum, learnSkill, rankUp, buyMastery, masteryCost, buyClass, awaken, embody, buyArmoury,
  armouryPrice, equip, swapEquip, buyPotion, takePerk, skillAvailable, classUnlocked, CLASSES, ABILITIES, POTIONS, itemMods,
  AWAKEN_FLOOR, EMBODIMENT_FLOOR, classAllows, STREAK_RECOVER } = new Proxy({}, { get: (_, k) => G(k) });

// ------------------------------------------------------------------------------------ the bot's power model
function attackValue(save, st, id, ref, inFight) {
  const s = SKILLS[id];
  const r = save.ranks[id];
  if (r < 0 || !s.bd || !classAllows(save, id)) return 0;
  let max = s.bd * RANK_MULT[r] * powerOf(st, s.type);
  if (s.defScale) max += (st.def * s.defScale + st.hpMax * s.hpScale) * RANK_MULT[r];
  max *= 1 + st.dmgPct + (s.type === 'phys' ? st.physPct : s.type === 'mag' ? st.magPct : (st.physPct + st.magPct) / 2);
  const avg = max * (st.bal + s.bal + 50) / (100 + st.bal + s.bal);
  const crit = Math.min(50, st.crit + s.crit) / 100;
  const d = mitigate(avg * (1 + crit * (st.critMult - 1)), ref.def, st.dfp, s.pierce, 0);
  const hit = hitChance(s.acc, st.acc, ref.avd) / 100;
  let v = d * hit * s.hits;
  if (s.cd && !inFight) v /= 1 + s.cd; // can't spam it
  const mp = skillMp(s, r, st);
  if (mp > 0) v *= Math.min(1, (st.mpMax * (st.mpRegen + 0.12)) / mp); // sustainability
  return v;
}
function power(save, refFloor) {
  const st = computeStats(save);
  const ref = makeEnemyRef(refFloor);
  // a rotation: the best skill, plus what fills the turns while cooldown skills recharge
  const vals = Object.keys(SKILLS).map((id) => attackValue(save, st, id, ref)).sort((a, b) => b - a);
  const best = vals[0] + 0.5 * (vals[1] || 0) + 0.25 * (vals[2] || 0);
  const taken = mitigate(ref.dmg, st.def, ref.dfp, 15, st.prot);
  const ehp = st.hpMax / Math.max(1, taken);
  return Math.log(best + 1) + 0.8 * Math.log(ehp + 1);
}
const refCache = new Map();
function makeEnemyRef(f) {
  if (!refCache.has(f)) { const s = rng.state(); const e = makeEnemy(f, { tplId: 'wolf', kind: 'regular' }); rng.seed(s); refCache.set(f, e); }
  return refCache.get(f);
}

// ------------------------------------------------------------------------------------ fighting
function choose(b) {
  const save = b.save;
  const st = b.stats();
  const hp = b.p.hp / st.hpMax, mp = b.p.mp / st.mpMax;
  const intent = b.intentInfo();
  // potions: a free action
  if (hp < 0.3) {
    const qi = save.quick.findIndex((q) => q && q.n > 0 && (POTIONS[q.id].heal || 0) > 0);
    if (qi >= 0) b.usePotion(qi);
  }
  const hp2 = b.p.hp / st.hpMax;
  const incoming = intent && intent.est ? intent.est / Math.max(1, b.p.hp) : 0;
  const usable = save.keys.filter((k) => k && !b.blocked(k));
  // a heavy blow is coming: shield, or guard
  if (intent && intent.kind === 'charge' && (intent.turns === 1 || intent.turns == null) && incoming > 0.35) {
    if (usable.includes('fsh')) return { type: 'skill', id: 'fsh' };
    if (intent.turns === 1 || incoming > 0.9) return { type: 'guard' };
  }
  if (incoming >= 1 && intent.kind === 'attack' && hp2 < 0.6) {
    const heal = ['fhl', 'hea'].find((h) => usable.includes(h));
    if (heal) return { type: 'skill', id: heal };
    return { type: 'guard' };
  }
  if (hp2 < 0.4) {
    const heal = ['fhl', 'hea'].find((h) => usable.includes(h));
    if (heal) return { type: 'skill', id: heal };
  }
  // buffs at the start of long fights
  const ref = { def: b.e.def, avd: b.e.avd, dfp: b.e.dfp };
  let best = null, bestV = 0;
  for (const id of usable) {
    const v = attackValue(save, st, id, ref, true);
    if (v > bestV) { bestV = v; best = id; }
  }
  const buffs = ['enl', 'cla', 'shm', 'wit'].filter((id) => usable.includes(id) && !b.p.buffs.find((x) => x.name === SKILLS[id].buff.name));
  if (buffs.length && b.e.hp > bestV * 4) return { type: 'skill', id: buffs[0] };
  if (!best || (mp < 0.15 && usable.includes('res') && best !== 'att')) {
    if (usable.includes('res') && mp < 0.5) return { type: 'skill', id: 'res' };
  }
  return best ? { type: 'skill', id: best } : { type: 'guard' };
}
function fight(save, mode) {
  const b = startFight(save, mode);
  let guard = 0;
  while (!b.over && guard++ < 200) b.act(choose(b));
  if (!b.over) b.over = 'lose';
  return { b, res: finishFight(save, b) };
}

// ------------------------------------------------------------------------------------ shopping
function shop(save) {
  if (save.pendingPerk) {
    const pref = ['powerful', 'mythical', 'bloodthirst', 'concentration', 'healthy', 'hunter', 'final', 'deadeye', 'zen', 'adrenaline', 'potential', 'gifted', 'sixthsense', 'lucky'];
    const pick = pref.find((p) => save.pendingPerk.includes(p)) || save.pendingPerk[0];
    takePerk(save, pick);
  }
  // the class plan
  if (CLASS !== 'adventurer' && !save.classes[CLASS] && classUnlocked(save, CLASS)) {
    if (buyClass(save, CLASS)) { if (save.sc < CLASSES[CLASS].price.sc || save.xp < CLASSES[CLASS].price.xp) return; } // saving up
  }
  if (save.classes[CLASS] && save.best >= AWAKEN_FLOOR - 1 && !save.awakened[CLASS]) { if (awaken(save)) return; }
  if (save.best >= EMBODIMENT_FLOOR - 1 && !save.embodiment) { if (embody(save, CLASS === 'falias' ? 'macha' : 'morrighan')) { /* saving */ } }
  // keep potions stocked (cheap, so first)
  for (let i = 0; i < 2; i++) buyPotion(save, 'hp');
  // greedy: best power gain per unit of currency
  const f = save.floor + 2;
  for (let n = 0; n < 60; n++) {
    const base = power(save, f);
    const opts = [];
    const try1 = (label, cost, fn) => {
      if (save.sc < cost.sc || save.xp < cost.xp) return;
      const snap = JSON.stringify(save);
      const err = fn();
      if (err) { Object.assign(save, JSON.parse(snap)); return; }
      const gain = power(save, f) - base;
      Object.assign(save, JSON.parse(snap));
      const price = cost.sc / Math.max(1, save._scRate || 50) + cost.xp / Math.max(1, save._xpRate || 50);
      opts.push({ label, gain, price, v: gain / Math.max(0.05, price), fn });
    };
    for (const id of Object.keys(SKILLS)) {
      if (save.ranks[id] < 0 && skillAvailable(save, id) && classAllows(save, id)) try1('learn ' + id, { sc: SKILLS[id].learn || 0, xp: 0 }, () => learnSkill(save, id));
      else if (save.ranks[id] >= 0 && classAllows(save, id) && SKILLS[id].bd) { const c = rankUpCost(SKILLS[id], save.ranks[id]); if (c) try1('rank ' + id, c, () => rankUp(save, id)); }
    }
    for (const m of MASTERIES) try1('mastery ' + m.id, { sc: 0, xp: masteryCost(save, m.id) }, () => buyMastery(save, m.id));
    save.shop.armoury.forEach((it, i) => {
      if (!it) return;
      try1('gear ' + i, { sc: armouryPrice(it), xp: 0 }, () => {
        const e = buyArmoury(save, i);
        if (e) return e;
        const bi = save.bag.findIndex((x) => x && x.uid === it.uid);
        if (!equip(save, bi)) {
          // replace the weakest equipped piece if that is better
          let bestI = -1, bestP = power(save, f);
          for (let k = 0; k < save.equip.length; k++) {
            swapEquip(save, bi, k);
            const p = power(save, f);
            swapEquip(save, bi, k);
            if (p > bestP) { bestP = p; bestI = k; }
          }
          if (bestI < 0) return 'no use';
          swapEquip(save, bi, bestI);
        }
        save.bag = save.bag.map((x) => (x && x.kind === 'gear' ? null : x)); // sell what's left over (simplified)
        return null;
      });
    });
    opts.sort((a, b) => b.v - a.v);
    const best = opts[0];
    if (!best || best.gain <= 1e-4) break;
    best.fn();
    if (VERBOSE) console.log(`  f${save.floor} buy ${best.label} (+${best.gain.toFixed(3)})`);
  }
  // put learnt attacks on keys: best 6 by value + heal + rest
  const st = computeStats(save);
  const ref = makeEnemyRef(save.floor);
  const atk = Object.keys(SKILLS).filter((id) => save.ranks[id] >= 0 && classAllows(save, id) && SKILLS[id].bd).sort((a, b) => attackValue(save, st, b, ref) - attackValue(save, st, a, ref));
  const util = ['fsh', 'fhl', 'hea', 'res', 'enl', 'cla', 'shm', 'wit'].filter((id) => save.ranks[id] >= 0 && classAllows(save, id));
  save.keys = atk.slice(0, 8 - Math.min(4, util.length)).concat(util.slice(0, 4));
  while (save.keys.length < 8) save.keys.push(null);
  save.keys = save.keys.slice(0, 8);
}

// ------------------------------------------------------------------------------------ runs
const MILESTONES = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 150];
function run(seed) {
  rng.seed(seed);
  const abil = ABILITY || Object.keys(ABILITIES)[seed % 12];
  const save = newSave('Bot', abil, { seed });
  const reach = {};
  let deathsHere = 0, lastFloor = 0, rounds = {}, fightsAt = {};
  for (let i = 0; i < FIGHTS; i++) {
    const train = deathsHere >= 2;
    const before = save.floor;
    const { b, res } = fight(save, train ? 'train' : 'climb');
    const sIdx = floorInfo(b.e.floor).sIdx;
    if (!train) { const k = sIdx + ':' + b.e.kind; (rounds[k] = rounds[k] || { n: 0, w: 0, r: 0 }); rounds[k].n++; rounds[k].r += b.round; if (res.win) rounds[k].w++; }
    save._scRate = (save._scRate || res.sc) * 0.8 + res.sc * 0.2;
    save._xpRate = (save._xpRate || res.xp) * 0.8 + res.xp * 0.2;
    if (train) { deathsHere = res.win ? Math.max(0, deathsHere - 0.5) : deathsHere; }
    else if (!res.win) deathsHere++;
    else if (save.floor > lastFloor) { deathsHere = 0; lastFloor = save.floor; }
    for (const m of MILESTONES) if (save.best >= m && reach[m] == null) reach[m] = i + 1;
    if (VERBOSE) console.log(`#${i + 1} ${train ? 'TRAIN' : 'f' + before} ${b.e.name}: ${res.win ? 'win' : 'LOSS'} in ${b.round} rounds, hp ${Math.round(b.p.hp)}  sc ${save.sc} xp ${save.xp}`);
    // the bot rests when hurt
    if (!save.carry || save.carry.hp < 0.6 + STREAK_RECOVER) restAtSanctum(save);
    shop(save);
  }
  const st = computeStats(save);
  return { seed, abil, best: save.best, deaths: save.deaths, reach, rounds, st, save };
}

const results = [];
for (let i = 0; i < RUNS; i++) {
  const r = run((+args.seed || 1000) + i);
  results.push(r);
  const mean = (a) => (a && a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-');
  console.log(`run ${i + 1} [${CLASS} / ${r.abil}] best floor ${r.best}, deaths ${r.deaths}`);
  console.log('   fights to reach: ' + MILESTONES.map((m) => `${m}:${r.reach[m] ?? '-'}`).join(' '));
  for (const kind of ['regular', 'elite', 'boss']) console.log(`   ${kind.padEnd(7)} rounds (win%) by stratum: ` + [...Array(12).keys()].filter((i) => r.rounds[i + ':' + kind]).map((i) => { const x = r.rounds[i + ':' + kind]; return `${i + 1}:${(x.r / x.n).toFixed(1)}(${Math.round(100 * x.w / x.n)})`; }).join(' '));
  console.log(`   end: HP ${r.st.hpMax} MP ${r.st.mpMax} STR ${r.st.str} DEX ${r.st.dex} INT ${r.st.int} DEF ${r.st.def} DFP ${r.st.dfp} | ranks ${Object.entries(r.save.ranks).filter(([, v]) => v >= 0).map(([k, v]) => k + ':' + v).join(' ')}`);
  console.log(`   masteries ${JSON.stringify(r.save.mastery)} gear ${r.save.equip.filter(Boolean).map((x) => x.rarity[0] + x.lvl).join(',')} perks ${JSON.stringify(r.save.perks)}`);
}
const avg = (k) => (results.reduce((x, r) => x + (r.reach[k] ?? NaN), 0) / results.length);
console.log('\naverage fights to reach: ' + MILESTONES.map((m) => `${m}:${isNaN(avg(m)) ? '-' : avg(m).toFixed(0)}`).join(' '));
console.log('average best floor: ' + (results.reduce((x, r) => x + r.best, 0) / results.length).toFixed(1));
