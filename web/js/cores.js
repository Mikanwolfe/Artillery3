'use strict';
// Cores: one slot per girl (Upgrades → Core in the shop). A core adds health and armour, takes a
// flat amount off every hit she takes (never more than half of it), and boosts one kind of weapon:
// artillery shells, guns, rockets, flak, lasers, acid or aircraft. Six rarities of each, Common to
// Legendary. A bought core replaces the one she has (that one is refunded in full, like a gun).
// Hooks: Game.damage (boost and block), Game.buy / sellCore, UI.showShop, the CPU's shopping.

const CORE_KINDS = [['shell', 'Artillery'], ['gun', 'Gun'], ['rocket', 'Rocket'], ['flak', 'Flak'], ['laser', 'Laser'], ['acid', 'Acid'], ['air', 'Aviation']];
const CORE_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const CORE_HP = 12; // health and armour each, a rarity
const CORE_BLOCK = 2; // off every hit, a rarity
const CORE_BOOST = 0.05; // to its kind of weapon, a rarity
const CORE_BLOCK_MAX = 0.5; // never more than this share of a hit

const CORES = CORE_KINDS.flatMap(([kind, label]) => CORE_ROMAN.map((rn, i) => {
  const r = i + 1;
  return {
    id: `core_${kind}_${r}`, name: `${label} Core ${rn}`, coreKind: kind, coreLabel: label, rarity: r,
    cost: Math.round((700 * Math.pow(r, 1.9)) / 50) * 50,
    hp: CORE_HP * r, armour: CORE_HP * r, block: CORE_BLOCK * r, boost: CORE_BOOST * r,
    short: `+${Math.round(CORE_BOOST * r * 100)}% damage with ${label.toLowerCase()} weapons, +${CORE_HP * r} health and armour, −${CORE_BLOCK * r} off every hit.`,
  };
}));
const CORE_BY_ID = Object.fromEntries(CORES.map((c) => [c.id, c]));

function coreOf(t) { return t && t.core ? CORE_BY_ID[t.core] || null : null; }
// which core a hit counts for: planes' ordnance is aviation, flak's fragments are flak
function coreKindOf(def) {
  if (!def) return null;
  if (def.ord || def.air || def.fleet) return 'air';
  if (def.frag) return 'flak';
  return def.kind || null;
}

Object.assign(Game.prototype, {
  // put a core in (or take it out, id null): its health and armour come and go with it
  equipCore(t, id) {
    const old = coreOf(t);
    if (old) { t.hp = Math.max(1, t.hp - old.hp); t.armour = Math.max(0, t.armour - old.armour); }
    t.core = id || null; // (maxHp and maxArmour count it: Tank getters)
    const C = coreOf(t);
    if (C) { t.hp += C.hp; t.armour += C.armour; }
    t.hp = Math.min(t.hp, t.maxHp); t.armour = Math.min(t.armour, t.maxArmour);
  },

  buyCore(tank, id) {
    const C = CORE_BY_ID[id], old = coreOf(tank);
    const refund = old ? old.cost : 0;
    if (!C || tank.core === id || tank.money + refund < C.cost) { this.sfx.deny(); return false; }
    tank.money += refund - C.cost;
    this.equipCore(tank, id);
    this.sfx.buy();
    return true;
  },

  sellCore(tank) {
    const old = coreOf(tank);
    if (!old) { this.sfx.deny(); return false; }
    tank.money += old.cost;
    this.equipCore(tank, null);
    this.sfx.sell();
    return true;
  },

  // CPU: a core for the kind of gun it leans on most, the best its share of the money buys
  cpuBuyCore(t) {
    const share = { easy: 0.25, normal: 0.4, hard: 0.5 }[t.type] || 0.4;
    const by = {};
    for (const id of t.weapons) { const w = WEAPON_BY_ID[id], k = coreKindOf(w); if (k) by[k] = (by[k] || 0) + cpuValue(w, t); }
    const kind = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
    if (!kind) return;
    const cur = coreOf(t);
    const budget = t.money * share + (cur ? cur.cost : 0);
    const best = CORES.filter((c) => c.coreKind === kind[0] && c.cost <= budget).sort((a, b) => b.rarity - a.rarity)[0];
    if (!best || (cur && cur.coreKind === best.coreKind && cur.rarity >= best.rarity)) return;
    if (this.buyCore(t, best.id)) this.events.push(`${t.name} fits a ${best.name}.`);
  },
});
