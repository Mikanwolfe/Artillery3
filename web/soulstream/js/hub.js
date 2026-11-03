'use strict';
// The Sanctum: the original's Store screen (Stats / Skills / Classes / Emporium / Next) grown up.

const Hub = {
  tab: 'arena', sub: 'armoury', keySel: null,
  get s() { return UI.save; },

  open(tab) {
    if (tab) this.tab = tab;
    UI.show('hub');
    this.render();
    if (this.s.pendingPerk) this.perkPick();
  },
  render() {
    UI.refreshTop();
    this.renderChar();
    this.renderTabs();
    this.renderBody();
  },
  // run a shop action: it returns an error string or null
  act(fn, okMsg) {
    const err = fn();
    if (UI.err(err)) return false;
    SFX.play('buy');
    saveGame(this.s);
    this.checkAch();
    if (okMsg) UI.toast(okMsg);
    this.render();
    return true;
  },
  checkAch() {
    const s = this.s;
    if (Object.values(s.ranks).some((r) => r >= RANKS.length - 1)) ACH.grant('rank1');
    if (Object.values(s.mastery).some((r) => r >= 25)) ACH.grant('mastery25');
    if (['eweca', 'laceda', 'falias'].some((c) => s.classes[c])) ACH.grant('blessing');
    if (['eweca', 'laceda', 'falias', 'luminous'].every((c) => s.classes[c])) ACH.grant('allblessings');
    if (s.classes.luminous) ACH.grant('luminousclass');
    if (Object.keys(s.awakened).length) ACH.grant('awaken');
    if (s.embodiment) ACH.grant('embody');
    const all = s.bag.concat(s.equip).filter((x) => x && x.kind === 'gear');
    if (all.some((x) => RARITY_BY_ID[x.rarity].i >= RARITY_BY_ID.mythical.i)) ACH.grant('mythical');
    if (all.some((x) => RARITY_BY_ID[x.rarity].i >= RARITY_BY_ID.godly.i)) ACH.grant('godly');
    if (all.some((x) => x.rarity === 'luminous')) ACH.grant('luminousitem');
  },

  // ------------------------------------------------------------------ the character sheet
  renderChar() {
    const s = this.s, st = computeStats(s);
    const cls = CLASSES[s.cls];
    const row = (k, v, k2, v2) => `<span class="k">${k}</span><span class="v">${v}</span><span class="k">${k2 || ''}</span><span class="v">${v2 ?? ''}</span>`;
    const perks = Object.entries(s.perks).map(([id, r]) => `<span class="pill gold" data-tip="<b>${PERKS[id].name} ${toRoman(r)}</b><br>${esc(PERKS[id].desc)}">${PERKS[id].name} ${toRoman(r)}</span>`).join('');
    $('hub-char').innerHTML = `
      <div class="charname">+ ${esc(s.name)} ${s.hardcore ? '<span class="pill hot">Hardcore</span>' : ''}</div>
      <div class="chartitle">${esc(titleOf(s))}</div>
      <div class="sec">Stats<span class="grip"></span></div>
      <div class="statgrid">
        ${row('HP', fmt(st.hpMax), 'MP', fmt(st.mpMax))}
        ${row('STR', fmt(st.str), 'DEX', fmt(st.dex))}
        ${row('INT', fmt(st.int), 'LUK', fmt(st.luk))}
        ${row('WIL', fmt(st.wil), 'BAL', fmt(st.bal))}
        ${row('DEF', fmt(st.def), 'DFP', fmt(st.dfp))}
        ${row('ACC', fmt(st.acc), 'AVD', fmt(st.avd))}
        ${row('Crit', Math.min(CRIT_CAP, st.crit).toFixed(1) + '%', 'Crit x', st.critMult.toFixed(2))}
        ${row('Prot', pct(st.prot), 'MP/turn', pct(st.mpRegen, 1))}
        ${st.dmgPct || st.physPct || st.magPct ? row('Dmg', '+' + pct(st.dmgPct), 'Phys/Mag', `+${pct(st.physPct)}/+${pct(st.magPct)}`) : ''}
        ${st.hpRegen ? row('HP/turn', pct(st.hpRegen, 1), 'Lifesteal', pct(st.lifesteal)) : ''}
      </div>
      <div class="sec">Equipped<span class="grip"></span></div>
      <div class="list">${s.equip.map((it, i) => it ? `<div class="lrow" data-tip="${esc(UI.itemTip(it))}">${UI.badge(it, true)}<div><div class="nm rc" style="--rc:${RARITY_BY_ID[it.rarity].color}">${esc(itemName(it))}</div></div><span></span></div>`
        : `<div class="lrow dis"><span class="badge small" style="--rc:#3a3550"><b>-</b></span><div class="meta">${i === 0 ? 'No weapon' : 'Empty accessory slot'}</div><span></span></div>`).join('')}</div>
      ${perks ? `<div class="sec">Perks<span class="grip"></span></div><div>${perks}</div>` : ''}
      <div class="sec">Record<span class="grip"></span></div>
      <div class="statgrid">${row('Best', s.best, 'Kills', s.kills)}${row('Deaths', s.deaths, 'Biggest', fmt(s.stats.biggest || 0))}</div>`;
  },

  // ------------------------------------------------------------------ tabs
  renderTabs() {
    const tabs = [['arena', 'Arena', 'E'], ['masteries', 'Masteries', 'T'], ['skills', 'Skills', 'K'], ['keys', 'Keys', 'Y'], ['classes', 'Classes', 'L'],
      ['emporium', 'Emporium', 'P'], ['inventory', 'Inventory', 'I'], ['codex', 'Codex', 'O']];
    $('hub-tabs').innerHTML = tabs.map(([id, label, k]) => `<button class="${this.tab === id ? 'on' : ''}" data-tab="${id}" data-key="${k}" title="${k}">${label}${id === 'classes' && this.classNews() ? '<span class="dot"></span>' : ''}</button>`).join('');
    $('hub-tabs').querySelectorAll('button').forEach((b) => { b.onclick = () => { this.tab = b.dataset.tab; SFX.play('click'); this.render(); }; });
  },
  classNews() {
    const s = this.s;
    return Object.values(CLASSES).some((c) => c.unlockFloor && !s.classes[c.id] && classUnlocked(s, c.id)) ||
      (s.best >= AWAKEN_FLOOR - 1 && s.cls !== 'adventurer' && !s.awakened[s.cls]) || (s.best >= EMBODIMENT_FLOOR - 1 && !s.embodiment);
  },
  renderBody() {
    const body = $('hub-body');
    const html = this['tab_' + this.tab]();
    body.innerHTML = html;
    body.querySelectorAll('[data-do]').forEach((el) => { el.onclick = (e) => { e.stopPropagation(); this.handle(el.dataset.do, el.dataset); }; });
  },
  handle(what, d) {
    const s = this.s;
    switch (what) {
      case 'perk': return this.perkPick();
      case 'fight': return Fight.start('climb');
      case 'train': return Fight.start('train');
      case 'rest': restAtSanctum(s); saveGame(s); SFX.play('heal'); UI.toast('You rest at the shrine', 'Full health and mana. The streak is over.'); return this.render();
      case 'mastery': { let n = d.n === '5' ? 5 : 1; let ok = false; while (n-- > 0 && !buyMastery(s, d.id)) ok = true; if (!ok) return UI.err('Not enough experience'); SFX.play('buy'); saveGame(s); this.checkAch(); return this.render(); }
      case 'learn': return this.act(() => learnSkill(s, d.id), `${SKILLS[d.id].name} learnt`);
      case 'rank': return this.act(() => rankUp(s, d.id), `${SKILLS[d.id].name}: rank ${rankName(s.ranks[d.id] + 1)}`);
      case 'keysel': this.keySel = +d.i; return this.renderBody();
      case 'keyset': if (this.keySel == null) return; { const i = s.keys.indexOf(d.id); if (i >= 0) s.keys[i] = s.keys[this.keySel]; s.keys[this.keySel] = d.id || null; this.keySel = Math.min(7, this.keySel + 1); saveGame(s); return this.renderBody(); }
      case 'keyclear': if (this.keySel == null) return; s.keys[this.keySel] = null; saveGame(s); return this.renderBody();
      case 'buyclass': return this.act(() => buyClass(s, d.id), `The ${CLASSES[d.id].name} blessing is yours`);
      case 'switchclass': return this.act(() => switchClass(s, d.id), `You walk as ${CLASSES[d.id].name}`);
      case 'awaken': return this.act(() => awaken(s), 'Awakened');
      case 'embody': return this.act(() => embody(s, d.id), `Embodiment of ${EMBODIMENTS[d.id].name}`);
      case 'sub': this.sub = d.sub; return this.renderBody();
      case 'buyitem': return this.act(() => buyArmoury(s, +d.i), 'Bought');
      case 'reroll': return this.act(() => rerollArmoury(s));
      case 'buypotion': return this.act(() => buyPotion(s, d.id));
      case 'enchant': { const r = enchantItem(s, d.where, +d.i); if (UI.err(r.err)) return; SFX.play('buff'); ACH.grant('enchant'); saveGame(s); UI.toast(`${ENCHANTS[r.enchant].name}`, ENCHANTS[r.enchant].neg ? 'A poor roll.' : 'The verb takes hold.', 'Enchanting Room'); return this.render(); }
      case 'exchange': { const amt = Math.floor(+$('ex-amt').value || 0); if (this.act(() => exchange(s, d.dir, amt))) ACH.grant('exchange'); return; }
      case 'equip': return this.act(() => (equip(s, +d.i) ? null : 'No free slot of that kind: swap with one below'));
      case 'swap': return this.act(() => (swapEquip(s, +d.i, +d.e) ? null : 'That does not fit there'));
      case 'unequip': return this.act(() => (unequip(s, +d.i) ? null : 'Your bag is full'));
      case 'toquick': return this.act(() => (toQuick(s, +d.i) ? null : 'Not a potion'));
      case 'fromquick': return this.act(() => (fromQuick(s, +d.i) ? null : 'Your bag is full'));
      case 'sell': { const it = s[d.where][+d.i]; if (it && it.kind === 'gear' && RARITY_BY_ID[it.rarity].i >= 4 && !confirm(`Sell ${itemName(it)}?`)) return; const v = sellAt(s, d.where, +d.i); SFX.play('buy'); saveGame(s); UI.toast(`Sold for ${fmt(v)} Soul Coins`); return this.render(); }
    }
  },

  // ------------------------------------------------------------------ Arena
  tab_arena() {
    const s = this.s;
    const info = floorInfo(s.floor);
    const kind = info.kind === 'boss' ? `<span class="pill hot">Boss</span> ${esc(enemyName(info.stratum.boss))}` : info.kind === 'elite' ? '<span class="pill gold">Champion</span> a foe with affixes' : '<span class="pill">Regular</span>';
    const st = computeStats(s);
    const carry = s.carry ? `<p class="sub">You are still bleeding from the last fight: <b class="hot">${Math.round(s.carry.hp * 100)}%</b> health, <b class="mpc">${Math.round(s.carry.mp * 100)}%</b> mana. Streak <b class="sc">${s.streak}</b>: the next win pays <b class="sc">+${Math.round(STREAK_BONUS * Math.min(STREAK_MAX, s.streak) * 100)}%</b>.</p>` : `<p class="sub">Rested: full health (${fmt(st.hpMax)}) and mana (${fmt(st.mpMax)}).</p>`;
    const next = LEGENDS.slice().reverse().find((l) => l.floor > s.best);
    return `
      ${s.pendingPerk ? `<div class="perk-banner">A perk waits for you. <button class="mini" data-do="perk">Choose</button></div>` : ''}
      <div class="next-fight">
        <div>
          <div class="mgh">Next</div>
          <h3 style="color:var(--bright);margin:0.2em 0">Floor ${s.floor}</h3>
          <div style="color:${info.stratum.color}">${esc(stratumName(info))}</div>
          <div style="margin-top:0.4em">${kind}</div>
          <p class="note" style="margin-top:0.8em">${esc(info.stratum.intro)}</p>
        </div>
      </div>
      ${carry}
      ${s.pity ? `<p class="sub">The stream pities you: <b class="sc">+50%</b> rewards for ${s.pity} more fight${s.pity > 1 ? 's' : ''}.</p>` : ''}
      <div class="bigbtns">
        <button class="primary" data-do="fight" data-key="Enter">Enter the arena · floor ${s.floor}</button>
        <button data-do="train" data-key="R">Train · floor ${Math.max(1, s.floor - 3)} (60% pay, no risk)</button>
        ${s.carry ? '<button data-do="rest" data-key="B">Rest at the shrine</button>' : ''}
      </div>
      ${next ? `<p class="note" style="margin-top:1.4em">Next on the leaderboard: <span class="sc">${esc(next.name)}</span>, floor ${next.floor}.</p>` : '<p class="note" style="margin-top:1.4em">You stand above every legend on the board.</p>'}`;
  },

  // ------------------------------------------------------------------ Masteries (the original's Stats shop)
  tab_masteries() {
    const s = this.s;
    return `<div class="sec">Masteries<span class="grip"></span></div>
      <p class="sub">Experience: <b class="xp">${fmt(s.xp)}</b>. Masteries start off cheap but get expensive, and have no limit. Each rank adds +${MASTERY_STEP} to both of its stats.</p>
      <div class="list">${MASTERIES.map((m) => {
        const r = s.mastery[m.id] || 0, c = masteryCost(s, m.id);
        let now;
        if (m.stats) now = m.stats.map((k) => `+${r * MASTERY_STEP} ${STAT_NAMES[k]}`).join(' ');
        else if (m.regen) now = `${pct(regenPct(r), 1)} ${m.regen.toUpperCase()}/turn → ${pct(regenPct(r + 1), 1)}`;
        else if (m.pct) now = `+${Math.round(r * m.step * 100)}% max ${m.pct.toUpperCase()}`;
        else now = `+${r * m.step} DEF`;
        return `<div class="lrow"><span class="rank" style="min-width:2.4em">${r}</span><div><div class="nm">${m.name} Mastery</div><div class="meta">${esc(m.desc)} Now: ${now}</div></div>
          <div class="acts"><span class="price xp">${fmt(c)} XP</span><button class="mini" data-do="mastery" data-id="${m.id}" ${s.xp < c ? 'disabled' : ''}>+1</button><button class="mini" data-do="mastery" data-id="${m.id}" data-n="5" ${s.xp < c ? 'disabled' : ''}>+5</button></div></div>`;
      }).join('')}</div>`;
  },

  // ------------------------------------------------------------------ Skills
  tab_skills() {
    const s = this.s, st = computeStats(s);
    const groups = ['adventurer', ...Object.keys(CLASSES).filter((c) => c !== 'adventurer' && s.classes[c])];
    let html = `<p class="sub">Soul Coins <b class="sc">${fmt(s.sc)}</b> · Experience <b class="xp">${fmt(s.xp)}</b>. Learn with Soul Coins; rank up with both. Ranks: ${RANKS.join(' ')}. Adventurer skills work in every class; a blessing's skills only in that class.</p>`;
    for (const g of groups) {
      const C = CLASSES[g];
      const ids = Object.keys(SKILLS).filter((id) => SKILLS[id].cls === g && (!SKILLS[id].ult || s.awakened[g]));
      html += `<div class="sec">${C.name}${g === s.cls ? ' <span class="pill acc">active</span>' : ''}<span class="grip"></span></div><div class="list">`;
      for (const id of ids) {
        const k = SKILLS[id], r = s.ranks[id];
        const avail = skillAvailable(s, id);
        const rng_ = skillRange(k, Math.max(0, r), st);
        const facts = [];
        if (rng_) facts.push(`${fmt(rng_[0])}-${fmt(rng_[1])}${k.hits > 1 ? ` x${k.hits}` : ''}`);
        if (k.mp) facts.push(`<span class="mpc">${skillMp(k, Math.max(0, r), st)} MP</span>`);
        if (k.hpCost) facts.push(`<span class="hot">${Math.round(k.hpCost * 100)}% HP</span>`);
        if (k.cd) facts.push(`cooldown ${k.cd}`);
        if (k.acc < 100) facts.push(`${k.acc}% acc`);
        if (k.pierce) facts.push(`pierce ${k.pierce}`);
        let acts = '';
        if (r < 0) {
          if (avail) acts = `<span class="price sc">${fmt(learnPrice(s, id))} SC</span><button class="mini" data-do="learn" data-id="${id}" ${s.sc < learnPrice(s, id) ? 'disabled' : ''}>Learn</button>`;
          else acts = `<span class="price dim">${k.minFloor ? `clear floor ${k.minFloor - 1}` : 'locked'}</span>`;
        } else {
          const c = rankUpCost(k, r);
          acts = c ? `<span class="price"><span class="sc">${fmt(c.sc)}</span> <span class="xp">${fmt(c.xp)}</span></span><button class="mini" data-do="rank" data-id="${id}" ${s.sc < c.sc || s.xp < c.xp ? 'disabled' : ''}>Rank ${rankName(r + 1)}</button>` : '<span class="pill gold">max</span>';
        }
        html += `<div class="lrow${r < 0 && !avail ? ' dis' : ''}">${UI.badge({ kind: 'skill', id }, true)}<div><div class="nm">${k.name}<span class="rank">${rankName(r)}</span>${r >= 0 ? ` <span class="dim">${RANK_MULT[r].toFixed(2)}x</span>` : ''}</div>
          <div class="meta">${esc(k.desc)}<br>${facts.join(' · ')}</div></div><div class="acts">${acts}</div></div>`;
      }
      html += '</div>';
    }
    return html;
  },

  // ------------------------------------------------------------------ Keys (the original's Assign Skills)
  tab_keys() {
    const s = this.s;
    const usable = Object.keys(SKILLS).filter((id) => s.ranks[id] >= 0 && classAllows(s, id));
    return `<div class="sec">Assigned skills<span class="grip"></span></div>
      <p class="sub">The original's keys: A S D F Z X C V. Pick a key, then a skill. <kbd>G</kbd> (Guard) and <kbd>1</kbd> <kbd>2</kbd> (potions) are fixed.</p>
      <div class="keys">${SKILL_KEYS.map((k, i) => { const id = s.keys[i]; return `<div class="keyslot${this.keySel === i ? ' on' : ''}" data-do="keysel" data-i="${i}"><kbd>${k}</kbd>${id ? UI.badge({ kind: 'skill', id }, true) + `<span>${SKILLS[id].name}</span>` : '<span class="dim">empty</span>'}</div>`; }).join('')}</div>
      <div class="sec">Available<span class="grip"></span>${this.keySel != null ? `<button class="mini" data-do="keyclear">Clear ${SKILL_KEYS[this.keySel]}</button>` : ''}</div>
      <div class="slots">${usable.map((id) => `<div class="slot" data-do="keyset" data-id="${id}" style="cursor:${this.keySel == null ? 'default' : 'pointer'}">${UI.badge({ kind: 'skill', id }, true)}<div><div>${SKILLS[id].name} <span class="rank">${rankName(s.ranks[id])}</span></div><div class="label">${s.keys.includes(id) ? 'on ' + SKILL_KEYS[s.keys.indexOf(id)] : ''}</div></div></div>`).join('')}</div>`;
  },

  // ------------------------------------------------------------------ Classes
  tab_classes() {
    const s = this.s;
    let html = `<div class="sec">Blessings<span class="grip"></span></div><p class="sub">Your Adventurer skills stay with you. A blessing adds its own five skills (its first one free), its health, mana and stats. Switch freely between those you own.</p><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(19em,1fr))">`;
    for (const C of Object.values(CLASSES)) {
      const owned = s.classes[C.id], open = classUnlocked(s, C.id);
      const stats = Object.entries(C.stats).map(([k, v]) => `+${v} ${STAT_NAMES[k]}`).join(' ');
      let act;
      if (s.cls === C.id) act = '<span class="pill acc">active</span>';
      else if (owned) act = `<button class="mini" data-do="switchclass" data-id="${C.id}">Walk as ${C.name}</button>`;
      else if (!open) act = `<span class="pill">clear floor ${C.unlockFloor - 1}</span>`;
      else act = `<span class="price"><span class="sc">${fmt(C.price.sc)} SC</span> <span class="xp">${fmt(C.price.xp)} XP</span></span> <button class="mini" data-do="buyclass" data-id="${C.id}" ${s.sc < C.price.sc || s.xp < C.price.xp ? 'disabled' : ''}>Take the blessing</button>`;
      html += `<div class="card${!open && !owned ? ' dis' : ''}"><div class="card-body"><h4>${s.cls === C.id ? '> ' : ''}${C.name} <span class="dim">${C.role}</span></h4>
        <p>${esc(C.blurb)}</p><p class="dim">HP ${C.hp} · MP ${C.mp} · DEF ${C.def} · DFP ${C.dfp} · BAL ${C.bal} · ${stats}</p>
        <p class="dim">Skills: ${C.skills.map((id) => SKILLS[id].name).join(', ')}</p><div class="acts">${act}</div></div></div>`;
    }
    html += '</div>';
    // awakening
    const C = CLASSES[s.cls];
    html += `<div class="sec">Awakening<span class="grip"></span></div>`;
    if (!C.awaken) html += '<p class="sub">An Adventurer has nothing to awaken. Take a blessing first.</p>';
    else if (s.awakened[s.cls]) html += `<p class="sub">You are ${esc(C.name)} "${C.awaken.title}". ${SKILLS[C.awaken.ult].name} is yours.</p>`;
    else {
      const k = s.cls === 'luminous' ? 1.5 : 1;
      const open = s.best >= AWAKEN_FLOOR - 1;
      html += `<div class="card${open ? '' : ' dis'}"><div class="card-body"><h4>${C.name}-type "${C.awaken.title}"</h4><p>The Class Modes Update: the second rank. Health x${C.awaken.hpMult}, mana x${C.awaken.mpMult}, ${Object.entries(C.awaken.stats).map(([a, v]) => `+${v} ${STAT_NAMES[a]}`).join(' ')}, and the ultimate <b>${SKILLS[C.awaken.ult].name}</b>: ${esc(SKILLS[C.awaken.ult].desc)}</p>
        <div class="acts">${open ? `<span class="price"><span class="sc">${fmt(AWAKEN_PRICE.sc * k)} SC</span> <span class="xp">${fmt(AWAKEN_PRICE.xp * k)} XP</span></span><button class="mini" data-do="awaken" ${s.sc < AWAKEN_PRICE.sc * k || s.xp < AWAKEN_PRICE.xp * k ? 'disabled' : ''}>Awaken</button>` : `<span class="pill">clear floor ${AWAKEN_FLOOR - 1}</span>`}</div></div></div>`;
    }
    // embodiment
    const eOpen = s.best >= EMBODIMENT_FLOOR - 1;
    const price = s.embodiment ? Math.round(EMBODIMENT_PRICE.sc / 4) : EMBODIMENT_PRICE.sc;
    html += `<div class="sec">Embodiment<span class="grip"></span></div><p class="sub">The Gods' Concept: "Wolfe, Alchemist of the Luminous, Embodiment of Morrighan." ${eOpen ? `Take an aspect for ${fmt(price)} Soul Coins${s.embodiment ? ' (changing is cheaper)' : ''}.` : `Opens once the Morrigan falls (floor ${EMBODIMENT_FLOOR - 1}).`}</p><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(13em,1fr))">`;
    for (const [id, E] of Object.entries(EMBODIMENTS)) {
      html += `<div class="card${s.embodiment === id ? ' sel' : ''}${eOpen ? '' : ' dis'}"><div class="card-body"><h4>${E.name}</h4><p>${esc(E.desc)}</p><div class="acts">${s.embodiment === id ? '<span class="pill acc">yours</span>' : eOpen ? `<button class="mini" data-do="embody" data-id="${id}" ${s.sc < price ? 'disabled' : ''}>Embody</button>` : ''}</div></div></div>`;
    }
    return html + '</div>';
  },

  // ------------------------------------------------------------------ the Emporium
  tab_emporium() {
    const s = this.s;
    const subs = [['armoury', 'Armoury'], ['potions', 'Potion Store'], ['enchant', 'Enchanting Room'], ['stream', 'Soulstream']];
    let html = `<div class="split" style="grid-template-columns:auto 1fr;align-items:start"><div>${UI.artHTML(ART.origsword, { style: 'font-size:0.8em' })}</div><div>
      <h3 style="color:var(--bright)">T  H  E     E  M  P  O  R  I  U  M</h3>
      <p class="sub">Soul Coins <b class="sc">${fmt(s.sc)}</b> · Experience <b class="xp">${fmt(s.xp)}</b> · Bag ${s.bag.filter(Boolean).length}/${BAG_SIZE}</p>
      <nav class="tabs subtabs">${subs.map(([id, l]) => `<button class="${this.sub === id ? 'on' : ''}" data-do="sub" data-sub="${id}">${l}</button>`).join('')}</nav>`;
    if (this.sub === 'armoury') {
      const cap = SHOP_TIER_CAP(s.best);
      html += `<p class="sub">New stock after every fight. Up to ${UI.rarityName(cap)} here; deeper tiers only drop from foes. Tiers open as you go: ${RARITIES.map((r) => `<span style="color:${r.color}" data-tip="${r.name}: from floor ${TIER_FLOOR[r.id] + 1}">${r.name[0]}</span>`).join(' ')}.</p><div class="list">`;
      s.shop.armoury.forEach((it, i) => {
        if (!it) { html += '<div class="lrow dis"><span class="badge small" style="--rc:#3a3550"><b>-</b></span><div class="meta">Sold</div><span></span></div>'; return; }
        const p = armouryPrice(it);
        html += `<div class="lrow" data-tip="${esc(UI.itemTip(it))}">${UI.badge(it)}<div><div class="nm" style="color:${RARITY_BY_ID[it.rarity].color}">${esc(itemName(it))}</div><div class="meta">${UI.itemLine(it)}</div></div>
          <div class="acts"><span class="price sc">${fmt(p)} SC</span><button class="mini" data-do="buyitem" data-i="${i}" ${s.sc < p ? 'disabled' : ''}>Buy</button></div></div>`;
      });
      html += `</div><div class="row end"><button class="mini" data-do="reroll" ${s.sc < REROLL_PRICE(s) ? 'disabled' : ''}>New stock · ${fmt(REROLL_PRICE(s))} SC</button></div>`;
    } else if (this.sub === 'potions') {
      html += `<p class="sub">Potions go to your quick slots (<kbd>1</kbd> <kbd>2</kbd> in a fight), then your bag. Drinking one is free, once a turn. Rarer brews appear deeper down.</p><div class="list">`;
      for (const id of Object.keys(POTIONS)) {
        const P = POTIONS[id], open = POTION_TIER_FLOOR[P.tier] <= s.best + 1;
        const price = potionPrice(id, Math.max(1, s.best + 1));
        html += `<div class="lrow${open ? '' : ' dis'}">${UI.badge({ kind: 'potion', id }, true)}<div><div class="nm">${P.name} <span class="dim">stack ${P.stack}</span></div><div class="meta">${esc(P.desc)}</div></div>
          <div class="acts">${open ? `<span class="price sc">${fmt(price)} SC</span><button class="mini" data-do="buypotion" data-id="${id}" ${s.sc < price ? 'disabled' : ''}>Buy</button>` : `<span class="price dim">floor ${POTION_TIER_FLOOR[P.tier]}</span>`}</div></div>`;
      }
      html += '</div>';
    } else if (this.sub === 'enchant') {
      html += `<p class="sub">Enchants SS2: the verbs. Pay to roll a new verb onto an item. Most are blessings (Magnanimous, Deadly, Staunch...); about one roll in five is a curse (Clumsy, Fragile, Broken...). Roll again to replace it.</p><div class="list">`;
      const rows = [];
      s.equip.forEach((it, i) => it && rows.push(['equip', i, it]));
      s.bag.forEach((it, i) => it && it.kind === 'gear' && rows.push(['bag', i, it]));
      if (!rows.length) html += '<p class="note">Nothing to enchant.</p>';
      for (const [where, i, it] of rows) {
        const p = enchantPrice(it);
        html += `<div class="lrow" data-tip="${esc(UI.itemTip(it))}">${UI.badge(it, true)}<div><div class="nm" style="color:${RARITY_BY_ID[it.rarity].color}">${esc(itemName(it))}</div><div class="meta">${where === 'equip' ? 'equipped' : 'in the bag'} · ${it.enchant ? `<span class="${ENCHANTS[it.enchant].neg ? 'hot' : 'sc'}">${ENCHANTS[it.enchant].name}</span>` : 'no enchant'}</div></div>
          <div class="acts"><span class="price sc">${fmt(p)} SC</span><button class="mini" data-do="enchant" data-where="${where}" data-i="${i}" ${s.sc < p ? 'disabled' : ''}>Enchant</button></div></div>`;
      }
      html += '</div>';
    } else {
      html += `<p class="sub">The Soulstream trades Soul Coins and experience at a rate that drifts after every fight, less a ${Math.round(EXCHANGE_TOLL * 100)}% toll. (The original's ssii.rate, which it rolled at every load and never used.)</p>
        <p style="font-size:1.2em">1 SC → <b class="xp">${(s.rate * (1 - EXCHANGE_TOLL)).toFixed(2)} XP</b> · 1 XP → <b class="sc">${(1 / s.rate * (1 - EXCHANGE_TOLL)).toFixed(2)} SC</b></p>
        <div class="row gap"><input id="ex-amt" value="${Math.floor(Math.max(s.sc, s.xp) / 4)}" style="width:10em"><button data-do="exchange" data-dir="sc2xp">Soul Coins → XP</button><button data-do="exchange" data-dir="xp2sc">XP → Soul Coins</button></div>`;
    }
    return html + '</div></div>';
  },

  // ------------------------------------------------------------------ Inventory (the original's Inventory screen)
  tab_inventory() {
    const s = this.s;
    const slot = (it, label, acts, tip = true) => it
      ? `<div class="slot" ${tip ? `data-tip="${esc(UI.itemTip(it))}"` : ''}>${UI.badge(it, true)}<div style="min-width:0;flex:1"><div class="label">${label}</div><div style="color:${it.kind === 'gear' ? RARITY_BY_ID[it.rarity].color : 'var(--fg)'}">${esc(itemName(it))}${it.kind === 'potion' ? ` <span class="dim">x${it.n}</span>` : ''}</div><div class="note" style="margin:0.2em 0">${UI.itemLine(it)}</div><div class="acts" style="display:flex;gap:0.3em;flex-wrap:wrap">${acts}</div></div></div>`
      : `<div class="slot empty"><div><div class="label">${label}</div>empty</div></div>`;
    let html = `<div class="sec">Equipment<span class="grip"></span></div><div class="slots">`;
    s.equip.forEach((it, i) => { html += slot(it, i === 0 ? 'Weapon' : `Accessory ${i}`, it ? `<button class="mini" data-do="unequip" data-i="${i}">Unequip</button>` : ''); });
    html += `</div><div class="sec">Quick slots<span class="grip"></span></div><div class="slots">`;
    s.quick.forEach((it, i) => { html += slot(it, `Quick ${i + 1}`, it ? `<button class="mini" data-do="fromquick" data-i="${i}">To bag</button><button class="mini" data-do="sell" data-where="quick" data-i="${i}">Sell</button>` : ''); });
    html += `</div><div class="sec">Bag<span class="grip"></span></div><div class="slots">`;
    s.bag.forEach((it, i) => {
      let acts = '';
      if (it && it.kind === 'gear') {
        const free = s.equip.some((x, k) => !x && slotFits(it, k));
        acts += free ? `<button class="mini" data-do="equip" data-i="${i}">Equip</button>` : s.equip.map((x, k) => slotFits(it, k) ? `<button class="mini" data-do="swap" data-i="${i}" data-e="${k}">${k === 0 ? 'Swap weapon' : 'Swap ' + k}</button>` : '').join('');
      }
      if (it && it.kind === 'potion') acts += `<button class="mini" data-do="toquick" data-i="${i}">To quick slot</button>`;
      if (it) acts += `<button class="mini" data-do="sell" data-where="bag" data-i="${i}">Sell ${fmt(Math.round(itemValue(it) * SELL_RATE * (it.kind === 'potion' ? it.n : 1)))}</button>`;
      html += slot(it, `Bag ${i + 1}`, acts);
    });
    return html + '</div>';
  },

  // ------------------------------------------------------------------ Codex
  tab_codex() {
    const s = this.s;
    const cx = s.codex || {};
    const seen = Object.keys(cx).length;
    let html = `<p class="sub">Every foe you have met, by stratum. ${seen}/${Object.keys(ENEMIES).length} seen. Affixes make each one different again.</p>`;
    STRATA.forEach((S) => {
      html += `<div class="sec" style="color:${S.color}">${S.n}. ${esc(S.name)}<span class="grip"></span></div><div class="codex">`;
      for (const id of S.regulars.concat([S.boss])) {
        const c = cx[id];
        const T = ENEMIES[id];
        html += c ? `<div class="cx">${UI.artHTML(ART[id])}<div class="nm">${esc(enemyName(id))}${T.boss ? ' <span class="pill hot">boss</span>' : ''}</div><div class="note" style="margin:0">Met ${c.seen} · defeated ${c.kills}<br>${T.moves.concat(...(T.phases || []).map((p) => (p.set || []).concat(p.add || [])), ...((T.passive && T.passive.cycle) ? T.passive.cycle.sets.map((x) => x.moves) : [])).map((m) => m.name).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</div></div>`
          : `<div class="cx unseen">???</div>`;
      }
      html += '</div>';
    });
    html += `<div class="sec">Affixes<span class="grip"></span></div><div class="list">${Object.values(AFFIXES).map((a) => `<div class="lrow"><span class="pill">${a.name}</span><div class="meta" style="margin:0">${esc(a.desc)}</div><span></span></div>`).join('')}</div>`;
    return html;
  },

  // ------------------------------------------------------------------ perks
  perkPick() {
    const s = this.s;
    if (!s.pendingPerk) return;
    const card = UI.modal(`<h2 class="gold">A perk</h2><p class="sub">The boss's soul settles into yours. Choose one.</p>
      <div class="perks3">${s.pendingPerk.map((id, i) => `<div class="card" data-perk="${id}" data-key="${i + 1}"><h4>${PERKS[id].name} ${toRoman(perkRank(s, id) + 1)} <kbd>${i + 1}</kbd></h4><p>${esc(PERKS[id].desc)}</p></div>`).join('')}</div>`, { closable: false });
    card.querySelectorAll('[data-perk]').forEach((c) => {
      c.onclick = () => { takePerk(s, c.dataset.perk); saveGame(s); SFX.play('buff'); UI.closeModal(); this.render(); };
    });
  },
};
