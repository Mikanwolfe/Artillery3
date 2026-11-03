'use strict';
// The character and the run: the save, rewards, deaths, and every shop action. No DOM in here, so the
// balance simulator drives exactly the same code as the game.

const SAVE_KEY = 'ss2.save';
const SAVE_VERSION = 1;
const BAG_SIZE = 8, EQUIP_SLOTS = 4, QUICK_SLOTS = 2; // equip[0] is the weapon, 1-3 accessories
const ARMOURY_STOCK = 4;

function newSave(name, ability, opts = {}) {
  const s = {
    v: SAVE_VERSION, name: name || rng.pick(SS_NAMES), ability, cls: 'adventurer', classes: { adventurer: true },
    awakened: {}, embodiment: null,
    trained: { str: 0, dex: 0, int: 0, luk: 0, wil: 0 }, mastery: {},
    ranks: {}, keys: ['att', 'fus', 'hea', 'res', null, null, null, null], // the original's default key layout
    sc: 60, xp: 0, floor: 1, best: 0, streak: 0, pity: 0, carry: null,
    bag: new Array(BAG_SIZE).fill(null), equip: new Array(EQUIP_SLOTS).fill(null), quick: [makePotion('hp', 1, 2), null],
    perks: {}, pendingPerk: null, codex: {}, shop: null, rate: 1, hardcore: !!opts.hardcore,
    deaths: 0, kills: 0, bossKills: [], created: Date.now(), seed: opts.seed || Math.floor(Math.random() * 1e9),
    stats: { fights: 0, potions: 0, casts: {}, biggest: 0, scEarned: 0, xpEarned: 0, trainings: 0 },
  };
  for (const id of Object.keys(SKILLS)) s.ranks[id] = -1;
  for (const id of ['att', 'hea', 'res', 'fus']) s.ranks[id] = 0;
  refreshShop(s);
  return s;
}

// ---------------------------------------------------------------------------------- fights
// mode 'climb': the next floor. 'train': a regular foe from a few floors back, no risk, 60% pay.
function startFight(save, mode = 'climb') {
  let enemy, opts = {};
  if (mode === 'train') {
    const f = Math.max(1, save.floor - 3);
    const info = floorInfo(f);
    enemy = makeEnemy(f, { training: true, kind: 'regular', tplId: rng.pick(info.stratum.regulars) });
  } else {
    enemy = makeEnemy(save.floor);
  }
  if (mode === 'climb' && save.carry) opts = { hp: save.carry.hp, mp: save.carry.mp };
  const b = new Battle(save, enemy, opts);
  b.mode = mode;
  return b;
}

// Apply the outcome of a finished battle. Returns a summary for the results screen.
function finishFight(save, b) {
  const st = computeStats(save);
  const e = b.e;
  const res = { win: b.over === 'win', mode: b.mode, floor: e.floor, enemy: e.name, boss: e.boss, kind: e.kind, sc: 0, xp: 0,
    loot: [], perkOffer: null, unlocked: [], lostSc: 0, rounds: b.round, dealt: b.p.dealt, biggest: b.p.biggest };
  save.stats.fights++;
  if (b.p.biggest > save.stats.biggest) save.stats.biggest = b.p.biggest;
  if (res.win) {
    const streakK = b.mode === 'climb' ? 1 + STREAK_BONUS * Math.min(STREAK_MAX, save.streak) : 1;
    const pityK = save.pity > 0 ? 1 + PITY_BONUS : 1;
    res.sc = Math.round(e.reward.sc * (1 + st.scPct) * streakK * pityK) + b.stolen;
    res.xp = Math.round(e.reward.xp * (1 + st.xpPct) * streakK * pityK);
    res.streakK = streakK; res.pity = save.pity > 0;
    if (save.pity > 0) save.pity--;
    save.sc += res.sc; save.xp += res.xp;
    save.stats.scEarned += res.sc; save.stats.xpEarned += res.xp;
    save.kills++;
    // loot
    if (rng.chance(e.reward.loot)) {
      const boost = e.kind === 'boss' ? 1.2 : e.kind === 'elite' ? 0.5 : 0;
      // bosses: a good chance of the best tier open at this depth; Luminous and the Beyond's bosses drop the Luminous tier
      let rarity;
      if (e.kind === 'boss') {
        if (e.id === 'luminous' || e.floor > 100) rarity = rng.chance(0.35) ? 'luminous' : undefined;
        if (!rarity && rng.chance(0.5)) rarity = [...RARITIES].reverse().find((x) => x.id !== 'luminous' && tierOpen(x.id, e.floor - 1)).id;
      }
      const it = makeItem(e.floor, { boost, rarity });
      res.loot.push(it);
    }
    if (rng.chance(e.kind === 'regular' ? 0.18 : 0.6)) res.loot.push(makePotion(randomPotionId(e.floor), e.floor, 1));
    for (const it of res.loot) {
      const where = stash(save, it);
      if (!where) { const v = Math.round(itemValue(it) * SELL_RATE); save.sc += v; it.autoSold = v; }
    }
    if (b.mode === 'climb') {
      const before = save.best;
      save.best = Math.max(save.best, save.floor);
      save.floor++;
      save.streak++;
      save.carry = { hp: Math.min(1, b.p.hp / st.hpMax + STREAK_RECOVER), mp: Math.min(1, b.p.mp / st.mpMax + STREAK_RECOVER) };
      if (e.boss) {
        if (!save.bossKills.includes(e.id)) save.bossKills.push(e.id);
        res.perkOffer = offerPerks(save);
        save.pendingPerk = res.perkOffer;
      }
      res.unlocked = unlocksBetween(before, save.best);
    } else save.stats.trainings++;
    save.rate = +rng.range(0.6, 1.4).toFixed(2); // the Soulstream's exchange rate drifts every fight
  } else if (b.mode === 'climb') {
    save.deaths++;
    res.lostSc = Math.round(save.sc * DEATH_SC_LOSS);
    save.sc -= res.lostSc;
    const cp = save.floor - ((save.floor - 1) % CHECKPOINT);
    res.backTo = cp;
    save.floor = cp;
    save.streak = 0;
    save.pity = PITY_FIGHTS;
    save.carry = null;
    res.hardcoreDeath = save.hardcore;
  } else {
    // a training loss costs nothing but the time
  }
  refreshShop(save);
  return res;
}

// Back to the Sanctum: full health and mana, streak over.
function restAtSanctum(save) {
  save.carry = null;
  save.streak = 0;
}

function unlocksBetween(a, b) {
  const out = [];
  for (const c of Object.values(CLASSES)) if (c.unlockFloor && a < c.unlockFloor - 1 && b >= c.unlockFloor - 1) out.push(`The ${c.name} blessing is offered in the Classes shop.`);
  if (a < AWAKEN_FLOOR - 1 && b >= AWAKEN_FLOOR - 1) out.push('Awakening: your class can rise to its second rank.');
  if (a < EMBODIMENT_FLOOR - 1 && b >= EMBODIMENT_FLOOR - 1) out.push('The demigods will lend you their aspect: Embodiment.');
  for (const [id, s] of Object.entries(SKILLS)) if (s.minFloor && a < s.minFloor && b >= s.minFloor && s.cls === 'adventurer') out.push(`${s.name} can be learnt in the Skills shop.`);
  if (a < POTION_TIER_FLOOR.rare && b >= POTION_TIER_FLOOR.rare) out.push('Rare potions in the Potion Store.');
  if (a < POTION_TIER_FLOOR.epic && b >= POTION_TIER_FLOOR.epic) out.push('Epic analeptics in the Potion Store.');
  if (a < POTION_TIER_FLOOR.godly && b >= POTION_TIER_FLOOR.godly) out.push('Godly elixirs in the Potion Store.');
  return out;
}

function offerPerks(save) {
  const pool = Object.keys(PERKS).filter((id) => perkRank(save, id) < PERKS[id].max);
  return rng.shuffle(pool.slice()).slice(0, 3);
}
function takePerk(save, id) {
  if (!save.pendingPerk || !save.pendingPerk.includes(id)) return false;
  save.perks[id] = (save.perks[id] || 0) + 1;
  save.pendingPerk = null;
  return true;
}

function randomPotionId(f) {
  const ids = Object.keys(POTIONS).filter((id) => POTION_TIER_FLOOR[POTIONS[id].tier] <= f);
  return rng.weighted(ids, (id) => ({ common: 10, rare: 3, epic: 0.8, godly: 0.25 }[POTIONS[id].tier]));
}

// ---------------------------------------------------------------------------------- inventory
// Put an item where it belongs: potions stack into quick slots, then the bag.
function stash(save, it) {
  if (it.kind === 'potion') {
    const max = POTIONS[it.id].stack;
    for (const arr of [save.quick, save.bag]) for (const q of arr) if (q && q.kind === 'potion' && q.id === it.id && q.n < max) {
      const k = Math.min(max - q.n, it.n);
      q.n += k; it.n -= k;
      if (it.n <= 0) return 'stack';
    }
    const qi = save.quick.indexOf(null);
    if (qi >= 0) { save.quick[qi] = it; return 'quick'; }
  }
  const bi = save.bag.indexOf(null);
  if (bi >= 0) { save.bag[bi] = it; return 'bag'; }
  return null;
}
const equippedItems = (save) => (save.equip || []).filter(Boolean);
const stashWeapon = (save) => save.equip[0];
const slotFits = (it, i) => (i === 0) === (it.slot === 'weapon');
function equip(save, bagIdx) {
  const it = save.bag[bagIdx];
  if (!it || it.kind !== 'gear') return false;
  const ei = save.equip.findIndex((x, i) => !x && slotFits(it, i));
  if (ei >= 0) { save.equip[ei] = it; save.bag[bagIdx] = null; return true; }
  return false;
}
function swapEquip(save, bagIdx, equipIdx) {
  const it = save.bag[bagIdx];
  if (!it || it.kind !== 'gear' || !slotFits(it, equipIdx)) return false;
  save.bag[bagIdx] = save.equip[equipIdx];
  save.equip[equipIdx] = it;
  return true;
}
function unequip(save, equipIdx) {
  const it = save.equip[equipIdx];
  const bi = save.bag.indexOf(null);
  if (!it || bi < 0) return false;
  save.bag[bi] = it; save.equip[equipIdx] = null;
  return true;
}
function toQuick(save, bagIdx) {
  const it = save.bag[bagIdx];
  if (!it || it.kind !== 'potion') return false;
  const qi = save.quick.indexOf(null);
  if (qi < 0) { const t = save.quick[0]; save.quick[0] = it; save.bag[bagIdx] = t; return true; }
  save.quick[qi] = it; save.bag[bagIdx] = null;
  return true;
}
function fromQuick(save, qi) {
  const it = save.quick[qi];
  const bi = save.bag.indexOf(null);
  if (!it || bi < 0) return false;
  save.bag[bi] = it; save.quick[qi] = null;
  return true;
}
function sellAt(save, where, idx) {
  const it = save[where][idx];
  if (!it) return 0;
  const v = Math.round(itemValue(it) * SELL_RATE * (it.kind === 'potion' ? it.n : 1));
  save[where][idx] = null;
  save.sc += v;
  return v;
}

// ---------------------------------------------------------------------------------- shops
function refreshShop(save) {
  const f = Math.max(1, save.best + 1);
  const armoury = [];
  const cap = SHOP_TIER_CAP(save.best);
  for (let i = 0; i < ARMOURY_STOCK; i++) armoury.push(makeItem(f, { boost: 0.2, cap, slot: i === 0 ? 'weapon' : undefined }));
  save.shop = { armoury, f };
}
function armouryPrice(it) { return Math.round(itemValue(it)); }
function buyArmoury(save, i) {
  const it = save.shop.armoury[i];
  if (!it) return 'Sold out';
  const price = armouryPrice(it);
  if (save.sc < price) return 'Not enough Soul Coins';
  if (save.bag.indexOf(null) < 0) return 'Your bag is full';
  save.sc -= price;
  stash(save, it);
  save.shop.armoury[i] = null;
  return null;
}
const REROLL_PRICE = (save) => Math.round(25 * priceScale(Math.max(1, save.best + 1)));
function rerollArmoury(save) {
  const p = REROLL_PRICE(save);
  if (save.sc < p) return 'Not enough Soul Coins';
  save.sc -= p;
  refreshShop(save);
  return null;
}
function potionStock(save) {
  const f = Math.max(1, save.best + 1);
  return Object.keys(POTIONS).filter((id) => POTION_TIER_FLOOR[POTIONS[id].tier] <= f);
}
function buyPotion(save, id) {
  const f = Math.max(1, save.best + 1);
  const price = potionPrice(id, f);
  if (save.sc < price) return 'Not enough Soul Coins';
  const it = makePotion(id, f, 1);
  const where = stash(save, it);
  if (!where) return 'No room (quick slots and bag are full, or the stack is at its limit)';
  save.sc -= price;
  return null;
}
function enchantItem(save, where, idx) {
  const it = save[where][idx];
  if (!it || it.kind !== 'gear') return { err: 'Nothing to enchant' };
  const price = enchantPrice(it);
  if (save.sc < price) return { err: 'Not enough Soul Coins' };
  save.sc -= price;
  it.enchant = rollEnchant(rng, { lvl: it.lvl });
  return { enchant: it.enchant };
}
// The Soulstream: trade Soul Coins and experience at the drifting rate, less a 15% toll.
const EXCHANGE_TOLL = 0.15;
function exchange(save, dir, amount) {
  amount = Math.floor(amount);
  if (amount <= 0) return 'Nothing to trade';
  if (dir === 'sc2xp') {
    if (save.sc < amount) return 'Not enough Soul Coins';
    save.sc -= amount; save.xp += Math.floor(amount * save.rate * (1 - EXCHANGE_TOLL));
  } else {
    if (save.xp < amount) return 'Not enough experience';
    save.xp -= amount; save.sc += Math.floor(amount / save.rate * (1 - EXCHANGE_TOLL));
  }
  return null;
}

// masteries (XP)
function masteryCost(save, id) { return MASTERY_COST((save.mastery[id] || 0), MASTERY_BY_ID[id].k); }
function buyMastery(save, id) {
  const m = MASTERY_BY_ID[id];
  const c = masteryCost(save, id);
  if (save.xp < c) return 'Not enough experience';
  save.xp -= c;
  save.mastery[id] = (save.mastery[id] || 0) + 1;
  if (m.stats) for (const k of m.stats) save.trained[k] += MASTERY_STEP;
  return null;
}

// skills: learn (Soul Coins) and rank up (Soul Coins + XP)
function skillAvailable(save, id) {
  const s = SKILLS[id];
  if (s.ult) return !!(save.awakened && save.awakened[s.cls]);
  if (s.cls !== 'adventurer') return !!save.classes[s.cls];
  return !s.minFloor || save.best >= s.minFloor - 1 || save.ranks[id] >= 0;
}
function learnPrice(save, id) { return Math.round(SKILLS[id].learn || 0); }
function learnSkill(save, id) {
  const s = SKILLS[id];
  if (save.ranks[id] >= 0) return 'Already learnt';
  if (!skillAvailable(save, id)) return 'Not available yet';
  const p = learnPrice(save, id);
  if (save.sc < p) return 'Not enough Soul Coins';
  save.sc -= p;
  save.ranks[id] = 0;
  autoKey(save, id);
  return null;
}
function rankUp(save, id) {
  const s = SKILLS[id];
  const r = save.ranks[id];
  if (r < 0) return 'Not learnt';
  const c = rankUpCost(s, r);
  if (!c) return `${s.name} is already rank 1`;
  if (save.sc < c.sc) return 'Not enough Soul Coins';
  if (save.xp < c.xp) return 'Not enough experience';
  save.sc -= c.sc; save.xp -= c.xp;
  save.ranks[id]++;
  return null;
}
function autoKey(save, id) {
  if (save.keys.includes(id)) return;
  const i = save.keys.indexOf(null);
  if (i >= 0) save.keys[i] = id;
}

// classes
function classUnlocked(save, id) { const c = CLASSES[id]; return !c.unlockFloor || save.best >= c.unlockFloor - 1; }
function buyClass(save, id) {
  const c = CLASSES[id];
  if (save.classes[id]) return 'Already yours';
  if (!classUnlocked(save, id)) return `Clear floor ${c.unlockFloor - 1} first`;
  if (save.sc < c.price.sc) return 'Not enough Soul Coins';
  if (save.xp < c.price.xp) return 'Not enough experience';
  save.sc -= c.price.sc; save.xp -= c.price.xp;
  save.classes[id] = true;
  // the class's first skill comes free (the Ranking Update priced it at 0)
  const first = c.skills[0];
  if (save.ranks[first] < 0) save.ranks[first] = 0;
  switchClass(save, id);
  return null;
}
function switchClass(save, id) {
  if (!save.classes[id]) return 'Not yours';
  save.cls = id;
  // skills of other classes leave the keys; this class's learnt skills take free keys
  save.keys = save.keys.map((k) => (k && classAllows(save, k) ? k : null));
  for (const sid of CLASSES[id].skills.concat(CLASSES[id].awaken && save.awakened[id] ? [CLASSES[id].awaken.ult] : [])) if (save.ranks[sid] >= 0) autoKey(save, sid);
  return null;
}
function awaken(save) {
  const c = CLASSES[save.cls];
  if (!c.awaken) return 'Adventurers cannot awaken';
  if (save.awakened[save.cls]) return 'Already awakened';
  if (save.best < AWAKEN_FLOOR - 1) return `Clear floor ${AWAKEN_FLOOR - 1} first`;
  const k = save.cls === 'luminous' ? 1.5 : 1;
  if (save.sc < AWAKEN_PRICE.sc * k || save.xp < AWAKEN_PRICE.xp * k) return 'Not enough Soul Coins or experience';
  save.sc -= AWAKEN_PRICE.sc * k; save.xp -= AWAKEN_PRICE.xp * k;
  save.awakened[save.cls] = true;
  save.ranks[c.awaken.ult] = Math.max(0, save.ranks[c.awaken.ult]);
  autoKey(save, c.awaken.ult);
  return null;
}
function embody(save, id) {
  if (save.best < EMBODIMENT_FLOOR - 1) return `Clear floor ${EMBODIMENT_FLOOR - 1} first`;
  const price = save.embodiment ? Math.round(EMBODIMENT_PRICE.sc / 4) : EMBODIMENT_PRICE.sc;
  if (save.embodiment === id) return 'Already embodied';
  if (save.sc < price) return 'Not enough Soul Coins';
  save.sc -= price;
  save.embodiment = id;
  return null;
}

// ---------------------------------------------------------------------------------- reference characters
// A character built up for a floor, the way a steady player would be there: used by the Codex's range
// and the ?test URL parameter. rank: skill rank for every skill (default: one rank per 7 floors).
function buildTestSave(f, cls = 'eweca', ability = 'mage', o = {}) {
  f = Math.max(1, f);
  const s = newSave(o.name || 'Tester', ability, { seed: 1 });
  s.test = true; // never saved, never on the leaderboard, earns no achievements
  s.best = f - 1; s.floor = f; s.sc = 5000 * f; s.xp = 5000 * f;
  for (const k of PRIMARY) s.trained[k] = Math.round(f * 5.5);
  s.mastery = { hp: Math.round(f / 3), df: Math.round(f / 4) };
  if (cls !== 'adventurer') { s.classes[cls] = true; s.cls = cls; }
  if ((f > 60 || o.awaken) && cls !== 'adventurer') s.awakened[cls] = true;
  const rank = o.rank != null ? o.rank : Math.min(14, Math.floor(f / 7));
  for (const id of Object.keys(SKILLS)) {
    const sk = SKILLS[id];
    const ok = o.allSkills ? (sk.cls === 'adventurer' || sk.cls === cls) : skillAvailable(s, id) && classAllows(s, id);
    if (ok) s.ranks[id] = rank;
  }
  s.keys = Object.keys(SKILLS).filter((id) => s.ranks[id] >= 0 && classAllows(s, id) && SKILLS[id].bd).sort((a, b) => SKILLS[b].bd * SKILLS[b].hits - SKILLS[a].bd * SKILLS[a].hits).slice(0, 6).concat(['hea', 'res']);
  if (o.gear !== false) s.equip = [makeItem(f, { slot: 'weapon', boost: 1 }), makeItem(f, { boost: 1, slot: 'acc' }), makeItem(f, { boost: 1, slot: 'acc' }), makeItem(f, { boost: 1, slot: 'acc' })];
  s.quick = [makePotion('hp', f, 3), makePotion(f > 30 ? 'elixir' : 'mp', f, 2)];
  refreshShop(s);
  return s;
}

// ---------------------------------------------------------------------------------- persistence
function saveGame(save) { if (!save.test) store.set(SAVE_KEY, save); }
function loadGame() {
  const s = store.get(SAVE_KEY);
  if (!s || s.v !== SAVE_VERSION) return null;
  // fill anything a later version added
  for (const id of Object.keys(SKILLS)) if (s.ranks[id] == null) s.ranks[id] = -1;
  s.stats = s.stats || {};
  while (s.equip.length < EQUIP_SLOTS) s.equip.push(null);
  return s;
}
function exportSave(save) { return btoa(unescape(encodeURIComponent(JSON.stringify(save)))); }
function importSave(str) {
  try {
    const s = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
    if (!s || s.v !== SAVE_VERSION || !s.ranks) return null;
    return s;
  } catch (e) { return null; }
}

// The leaderboard: the original's Official Leaderboard names as the standing records to beat.
const LEGENDS = [
  { name: 'Wolfe Lumi', floor: 100, legend: true }, { name: 'Moses', floor: 77, legend: true }, { name: 'Pherihelion', floor: 64, legend: true },
  { name: 'Wilson', floor: 41, legend: true }, { name: 'xAzureElectro', floor: 33, legend: true }, { name: 'Srbninja', floor: 25, legend: true },
];
function recordRun(save, note) {
  if (save.test) return;
  const lb = store.get('ss2.board', []);
  const i = lb.findIndex((r) => r.seed === save.seed);
  const row = { name: save.name, title: titleOf(save), floor: save.best, seed: save.seed, hardcore: save.hardcore, note: note || '', when: Date.now() };
  if (i >= 0) { if (lb[i].floor <= row.floor) lb[i] = row; } else lb.push(row);
  store.set('ss2.board', lb);
}
function leaderboard() {
  return LEGENDS.concat(store.get('ss2.board', [])).sort((a, b) => b.floor - a.floor);
}
