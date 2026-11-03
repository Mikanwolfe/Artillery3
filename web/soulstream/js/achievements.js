'use strict';
// Achievements: kept in the browser across characters (localStorage 'ss2.ach'). Game code calls
// ACH.grant(id) when something happens; a toast announces each one the first time.
const ACHIEVEMENTS = [
  { id: 'first', name: 'Achievement Get!', desc: 'Win your first fight.' },
  { id: 'grell', name: 'Red Hand, Cut', desc: 'Defeat Captain Grell (floor 10).' },
  { id: 'barrowking', name: 'Long Live the King', desc: 'Put the Barrow King down. Twice.' },
  { id: 'archon', name: 'Unsealed', desc: 'Defeat the Spire Archon (floor 30).' },
  { id: 'balor', name: 'Eye for an Eye', desc: 'Defeat Balor of the Evil Eye (floor 40).' },
  { id: 'hydra', name: 'Cauterised', desc: 'Defeat the Hydra (floor 50).' },
  { id: 'phoenix', name: 'Ashes to Ashes', desc: 'Defeat the Phoenix, both times (floor 60).' },
  { id: 'morrigan', name: 'Embodiment', desc: 'Defeat the Morrigan (floor 70).' },
  { id: 'twinmoons', name: 'Eclipse', desc: 'Defeat Eweca and Laceda (floor 80).' },
  { id: 'leviathan', name: 'From the Deep', desc: 'Defeat the Leviathan (floor 90).' },
  { id: 'luminous', name: 'End Luminous', desc: 'Defeat Luminous, the Final Light (floor 100).' },
  { id: 'beyond', name: 'The Beyond', desc: 'Reach floor 101.' },
  { id: 'beyond2', name: 'Cycle II', desc: 'Reach floor 201.' },
  { id: 'finalhit', name: 'Final Hit', desc: 'Take a foe from full to nothing in one blow.' },
  { id: 'overkill', name: 'Overkill', desc: 'Land a hit worth over half a foe’s health.' },
  { id: 'streak5', name: 'Press On', desc: 'Win 5 fights in a row without resting.' },
  { id: 'streak10', name: 'The Gauntlet', desc: 'Win 10 fights in a row without resting.' },
  { id: 'brokewind', name: 'Not So Fast', desc: 'Stun a foe while it winds up.' },
  { id: 'cleanse', name: 'Not Today', desc: 'Lift a Doom before it falls.' },
  { id: 'heads', name: 'Off With Their Heads', desc: 'Keep the Hydra from growing a head with fire.' },
  { id: 'gilded', name: 'Gilded Age', desc: 'Defeat a Gilded foe.' },
  { id: 'stolen', name: 'Stolen Back', desc: 'Win a fight after a foe picked your pocket.' },
  { id: 'attackonly', name: 'Back to Basics', desc: 'Win a fight on floor 10 or deeper using only Attack.' },
  { id: 'rest', name: 'Rest Skill Rank F', desc: 'Use Rest.', tag: 'Mabinogi' },
  { id: 'rank1', name: 'Rank 1', desc: 'Raise a skill to rank 1.' },
  { id: 'mastery25', name: 'Mastery', desc: 'Raise a mastery to rank 25.' },
  { id: 'blessing', name: 'Blessed', desc: 'Take a blessing: Eweca, Laceda or Falias.' },
  { id: 'allblessings', name: 'Hybrid Classes?', desc: 'Own every blessing.', tag: 'Other Ideas.txt' },
  { id: 'luminousclass', name: 'Admin Class', desc: 'Become Luminous.' },
  { id: 'awaken', name: 'Second Rank', desc: 'Awaken a class.' },
  { id: 'embody', name: 'Embodiment of Morrighan', desc: 'Take a demigod’s aspect.' },
  { id: 'mythical', name: 'Mythical', desc: 'Own a Mythical item.' },
  { id: 'godly', name: 'Godly', desc: 'Own a Godly item.' },
  { id: 'luminousitem', name: 'Above Godly', desc: 'Own a Luminous item.' },
  { id: 'enchant', name: 'Magnanimous', desc: 'Enchant an item in the Enchanting Room.' },
  { id: 'kydos', name: 'Kydos!', desc: 'Drink a Kydos Elixir.' },
  { id: 'stone', name: 'Stone Cold', desc: 'Drink a Stone Tonic.' },
  { id: 'exchange', name: 'Into the Stream', desc: 'Trade at the Soulstream.' },
  { id: 'death', name: 'Deaths More Generous', desc: 'Die. (The original’s changelog: "Deaths more generous - gives more xp and sc".)' },
  { id: 'top12', name: 'Top 12', desc: 'Pass Srbninja on the leaderboard (floor 25).' },
  { id: 'ranked1', name: 'Ranked 1', desc: 'Pass Wolfe Lumi on the leaderboard (floor 100).' },
  { id: 'hardcore30', name: 'One Soul', desc: 'Reach floor 30 in Hardcore.' },
];
const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
const ACH = {
  get data() { if (!this._d) this._d = store.get('ss2.ach', { got: {} }); return this._d; },
  has(id) { return !!this.data.got[id]; },
  grant(id) {
    if (!ACH_BY_ID[id] || this.has(id)) return false;
    if (typeof UI !== 'undefined' && UI.save && UI.save.test) return false; // test characters earn nothing
    this.data.got[id] = Date.now();
    store.set('ss2.ach', this.data);
    if (typeof UI !== 'undefined') UI.toast(ACH_BY_ID[id].name, ACH_BY_ID[id].desc, 'Achievement');
    return true;
  },
  count() { return Object.keys(this.data.got).length; },
};
