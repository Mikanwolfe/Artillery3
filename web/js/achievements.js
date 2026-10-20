// Achievements: one-off awards for human players, kept in the browser (localStorage 'a3.ach') with a
// few running counts. A toast pops up when one is earned; the menu's Achievements screen lists them all.
// Nothing counts on the Codex range. Game code calls this.ach(id, t) / this.achCount(key, n, t) at
// the moment something happens (damage, endRound, useRepair, claimCrate, ...).

const ACHIEVEMENTS = [
  // the basics
  { id: 'round', name: 'Achievement Get!', desc: 'Win your first round.' },
  { id: 'graze', name: 'Just a Flesh Wound', desc: 'Hit a rival with the very edge of a blast.' },
  { id: 'direct', name: 'On Point!', desc: 'Hit a rival dead centre.' },
  { id: 'bear', name: 'Slew a bear at the age of 10!', desc: 'Do over 2,000 damage in one hit.' },
  { id: 'laser', name: "Don't look at it!", desc: 'Hit a rival dead centre with a laser.' },
  { id: 'demigod', name: "You're a Demigod now!", desc: 'Reach over 100,000 max health.' },
  { id: 'maia', name: 'Orbital Delivery', desc: 'Call a MAIA strike.' },
  { id: 'tower', name: 'Can You Hear Me Now?', desc: 'Bring down a radio tower.' },
  { id: 'timber', name: 'Timber!', desc: 'Bring down a big tree.' },
  { id: 'void', name: 'Into the Abyss', desc: 'Send a rival into the void.' },
  { id: 'danmaku', name: 'Danmaku!', desc: 'Use Barrage.' },
  // Doki Doki Literature Club
  { id: 'match', name: 'Okay, Everyone!', desc: 'Win a match.', tag: 'DDLC' },
  { id: 'monika', name: 'Just Monika.', desc: 'Win a round against three rivals.', tag: 'DDLC' },
  { id: 'self', name: 'Get Out of My Head', desc: 'Hit yourself.', tag: 'DDLC' },
  { id: 'poem', name: 'A Special Poem', desc: 'Claim a supply crate.', tag: 'DDLC' },
  // Mabinogi
  { id: 'erinn', name: 'Welcome to Erinn', desc: 'Finish the tutorial.', tag: 'Mabinogi' },
  { id: 'rest', name: 'Rest Skill Rank F', desc: 'Use a repair kit.', tag: 'Mabinogi' },
  { id: 'fomor', name: 'Fomor Hunter', desc: 'Destroy 25 hostiles (over all your matches).', tag: 'Mabinogi', count: 'mobs', need: 25 },
  { id: 'tuning', name: 'Fine Tuning', desc: 'Buy 5 Firepower levels for one character.', tag: 'Mabinogi' },
  { id: 'rebirth', name: 'Rebirth', desc: 'Win a round after dropping below 10% health in it.', tag: 'Mabinogi' },
  { id: 'milletian', name: 'Milletian', desc: 'Unlock every character.', tag: 'Mabinogi' },
  // KanColle and the rest
  { id: 'airsup', name: 'Air Superiority', desc: 'Shoot down 10 planes (over all your matches).', tag: 'KanColle', count: 'planes', need: 10 },
  // a round won with each girl
  { id: 'win_gwt', name: 'Panzer Vor!', desc: 'Win a round as G.W. Tiger.', girl: 'gwt' },
  { id: 'win_obj', name: 'Sloped and Proud', desc: 'Win a round as Object 15X.', girl: 'obj' },
  { id: 'win_nxi', name: 'Triple Redundancy', desc: 'Win a round as November.', girl: 'nxi' },
  { id: 'win_int', name: "MAIA's Favourite", desc: 'Win a round as Innocentia.', girl: 'int' },
  { id: 'win_alb', name: 'Alban Knight', desc: 'Win a round as Alban Eiler.', girl: 'alb', tag: 'Mabinogi' },
  { id: 'win_zui', name: 'Tamagoyaki, Want Some?', desc: 'Win a round as Zuihou.', girl: 'zui', tag: 'KanColle' },
  { id: 'win_ang', name: 'Uranus Queen', desc: 'Win a round as Ikaros.', girl: 'ang', tag: 'Sora no Otoshimono' },
  // one for each Legendary: do damage with it
  { id: 'leg_laser15x', name: 'Neko Neko Beam', desc: "Do damage with the 90mm Neko-15X Laser.", leg: 'laser15x' },
  { id: 'leg_acid220', name: 'Bone Dry', desc: "Do damage with the 220mm 'KARAKARA' Acid.", leg: 'acid220' },
  { id: 'leg_cls770', name: "Don't Call Me Cute!", desc: "Do damage with the 770mm 'Natsuki'.", leg: 'cls770', tag: 'DDLC' },
  { id: 'leg_sanshiki', name: 'Sanshikidan, Fire!', desc: "Do damage with the 46cm 'Sanshikidan' Type 3 Shell.", leg: 'sanshiki', tag: 'KanColle' },
  { id: 'leg_nxiaeria', name: 'By Royal Decree', desc: "Do damage with the 'Aeria Charlotte' Royal Battery.", leg: 'nxiaeria' },
  { id: 'leg_avalon', name: 'The Gate Opens', desc: "Do damage with the 'Avalon Gate' Carpet Rocket.", leg: 'avalon' },
  { id: 'leg_kikka', name: 'Comet Debut', desc: "Do damage with the 'Comet Idol' Jet Bomber.", leg: 'kikka' },
  { id: 'leg_thunder', name: 'BRRRRRT', desc: "Do damage with the 'Thundercloud' Rotary Battery.", leg: 'thunder' },
  { id: 'leg_shiden', name: 'Clockwork Precision', desc: "Do damage with the 'Clockwork Warden' Fighter.", leg: 'shiden' },
];
const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
const ACH_LEG = Object.fromEntries(ACHIEVEMENTS.filter((a) => a.leg).map((a) => [a.leg, a.id]));
const ACH_GRAZE = 0.2, ACH_DIRECT = 0.95, ACH_BEAR = 2000, ACH_DEMIGOD = 100000, ACH_TUNING = 5;

// the store: { got: { id: time }, counts: { key: n } }
const ACH = {
  _d: null,
  get data() {
    if (!this._d) {
      try { this._d = JSON.parse(localStorage.getItem('a3.ach') || '{}'); } catch (e) { this._d = {}; }
      this._d.got = this._d.got || {};
      this._d.counts = this._d.counts || {};
    }
    return this._d;
  },
  save() { try { localStorage.setItem('a3.ach', JSON.stringify(this.data)); } catch (e) { /* (private window: this session only) */ } },
  has(id) { return !!this.data.got[id]; },
  total() { return Object.keys(this.data.got).filter((id) => ACH_BY_ID[id]).length; },
};

Object.assign(Game.prototype, {
  // award one, if a human earned it (t: the girl it is for; none: whoever's turn it is)
  ach(id, t = this.active) {
    if (this.range || this.phase === 'intro' || !t || t.isCpu || t.isMob || !ACH_BY_ID[id] || ACH.has(id)) return; // (not on the range, nor in the tutorial's tour)
    ACH.data.got[id] = Date.now();
    ACH.save();
    this.ui.achToast(ACH_BY_ID[id]);
    this.events.push(`Achievement: ${ACH_BY_ID[id].name}`);
  },

  // a running count (over all matches); its achievements come when it gets there
  achCount(key, n = 1, t = this.active) {
    if (this.range || !t || t.isCpu || t.isMob) return;
    const c = (ACH.data.counts[key] = (ACH.data.counts[key] || 0) + n);
    ACH.save();
    for (const a of ACHIEVEMENTS) if (a.count === key && c >= a.need) this.ach(a.id, t);
  },

  // a hit on anything (from damage(), after her own modifiers): the hit-shaped ones
  achHit(t, amt, owner, def, hit) {
    if (!owner || owner.isCpu || owner.isMob || this.range) return;
    if (def && ACH_LEG[def.id]) this.ach(ACH_LEG[def.id], owner);
    if (def && amt > ACH_BEAR) this.ach('bear', owner); // (a weapon's hit: not a fall into the void)
    if (t === owner) { this.ach('self', owner); return; }
    if (t.isMob || t.isPlane || t.isSat || !hit) return; // (the rest: hits on rivals)
    if (hit.q < ACH_GRAZE) this.ach('graze', owner);
    if (hit.q >= ACH_DIRECT) this.ach('direct', owner);
    if (hit.q >= ACH_DIRECT && def && def.kind === 'laser') this.ach('laser', owner);
  },

  // the round is over: wins, and the health checks
  achRound(winner) {
    for (const t of this.tanks) if (t.maxHp > ACH_DEMIGOD) this.ach('demigod', t);
    if (!winner || winner.isCpu) return;
    this.ach('round', winner);
    this.ach(`win_${winner.vehicle.id}`, winner);
    if (this.tanks.length >= 4) this.ach('monika', winner);
    if (winner.achLow) this.ach('rebirth', winner);
    if (VEHICLES.every((v) => PROG.girlOk(v.id))) this.ach('milletian', winner);
  },
});

Object.assign(UI, {
  // "Achievement Get!": a toast at the top of the screen, a few seconds
  achToast(a) {
    const d = document.createElement('div');
    d.className = 'achtoast';
    d.innerHTML = `<span class="mgh">Achievement unlocked</span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small>`;
    $('ach-toasts').appendChild(d);
    this.game.sfx.buy();
    setTimeout(() => d.remove(), 5200);
  },

  // the Achievements screen: every one, earned ones lit, counts shown on the running ones
  renderAchievements() {
    const tag = (a) => a.tag || (a.leg ? 'Legendary' : a.girl ? 'Character' : '');
    $('ach-sum').textContent = `${ACH.total()} / ${ACHIEVEMENTS.length}`;
    $('ach-list').innerHTML = ACHIEVEMENTS.map((a) => {
      const got = ACH.has(a.id), n = a.count ? Math.min(a.need, ACH.data.counts[a.count] || 0) : 0;
      return `<div class="ach${got ? ' got' : ''}"><b>${esc(a.name)}</b><span>${esc(a.desc)}${a.count && !got ? ` (${n}/${a.need})` : ''}</span>${tag(a) ? `<i>${esc(tag(a))}</i>` : ''}</div>`;
    }).join('');
  },
  openAchievements() {
    $('menu').hidden = true;
    this.renderAchievements();
    $('achieve').hidden = false;
  },
});
