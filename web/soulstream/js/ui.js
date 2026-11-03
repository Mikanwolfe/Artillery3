'use strict';
// Screens, dialogs and the small things they share. The Sanctum is in hub.js, the arena in fight.js.

const UI = {
  save: null,
  screen: null,
  keyHandlers: [],

  init() {
    this.save = loadGame();
    $('ver').textContent = 'build ' + (typeof SS_VERSION !== 'undefined' ? SS_VERSION : 'dev');
    $('tb-sound').classList.toggle('off', !SFX.on);
    $('tb-sound').onclick = () => { $('tb-sound').classList.toggle('off', !SFX.toggle()); };
    $('tb-menu').onclick = () => this.menu();
    document.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('pointerdown', () => SFX.init(), { once: true });
    document.addEventListener('mouseover', (e) => this.onTipOver(e));
    document.addEventListener('mouseout', (e) => { if (e.target.closest && e.target.closest('[data-tip]')) $('tip').hidden = true; });
    window.addEventListener('beforeunload', () => { if (this.save && !Fight.active) saveGame(this.save); });
    this.title();
  },

  // ------------------------------------------------------------------ screens
  show(id) {
    for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== 'scr-' + id;
    $('topbar').hidden = id === 'title' || id === 'new';
    this.screen = id;
    if (id !== 'title') Title.stop();
    this.refreshTop();
  },
  refreshTop() {
    const s = this.save;
    if (!s) return;
    const info = floorInfo(s.floor);
    $('tb-floor').textContent = `Floor ${s.floor}` + (s.best ? `  ·  best ${s.best}` : '');
    $('tb-stratum').textContent = stratumName(info);
    $('tb-sc').textContent = `${fmt(s.sc)} SC`;
    $('tb-xp').textContent = `${fmt(s.xp)} XP`;
  },

  // ------------------------------------------------------------------ keys
  onKey(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      if (e.key === 'Enter' && this.screen === 'new') $('ng-go').click();
      return;
    }
    const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (!$('modal').hidden) {
      if (k === 'Escape' && this.modalClose) { this.closeModal(); e.preventDefault(); return; }
      const btn = document.querySelector(`#modal [data-key="${CSS.escape(k)}"]`);
      if (btn && !btn.disabled) { btn.click(); e.preventDefault(); }
      return;
    }
    if (k === 'M') { $('tb-sound').click(); return; }
    if (this.screen === 'battle') { if (Fight.onKey(k)) e.preventDefault(); return; }
    if (k === 'Escape' && this.screen !== 'title') { this.menu(); e.preventDefault(); return; }
    const btn = document.querySelector(`#scr-${this.screen} [data-key="${CSS.escape(k)}"]`);
    if (btn && !btn.disabled && btn.offsetParent) { btn.click(); e.preventDefault(); }
  },

  // ------------------------------------------------------------------ dialogs
  modal(html, o = {}) {
    $('modal-card').innerHTML = html;
    $('modal').hidden = false;
    this.modalClose = o.closable !== false;
    $('modal').onclick = (e) => { if (e.target.id === 'modal' && this.modalClose) this.closeModal(); };
    for (const b of $('modal-card').querySelectorAll('[data-close]')) b.onclick = () => this.closeModal();
    return $('modal-card');
  },
  closeModal() { $('modal').hidden = true; $('modal-card').innerHTML = ''; if (this.onModalClose) { const f = this.onModalClose; this.onModalClose = null; f(); } },
  toast(title, body, tag = '', err = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (err ? ' err' : '');
    t.innerHTML = (tag ? `<span class="mgh">${esc(tag)}</span>` : '') + `<b>${esc(title)}</b>${body ? `<div class="dim">${esc(body)}</div>` : ''}`;
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 4200);
  },
  err(msg) { if (msg) { SFX.play('nope'); this.toast(msg, '', '', true); } return !!msg; },
  onTipOver(e) {
    const el = e.target.closest && e.target.closest('[data-tip]');
    const tip = $('tip');
    if (!el) return;
    tip.innerHTML = el.dataset.tip;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = r.left, y = r.top - th - 6;
    if (y < 4) y = r.bottom + 6;
    x = clamp(x, 4, innerWidth - tw - 4);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  },

  // ------------------------------------------------------------------ shared bits of HTML
  artHTML(a, o = {}) {
    if (!a) return '';
    const { rows, mask } = artRows(a);
    const pal = { '.': a.color, ' ': a.color, a: a.accent || a.color, b: a.accent2 || a.accent || a.color, d: a.color, h: '#ffffff' };
    let out = '';
    rows.forEach((line, r) => {
      let cur = null, run = '';
      const flush = () => { if (run) out += cur ? `<span style="color:${cur.c}${cur.d ? ';opacity:.5' : ''}">${esc(run)}</span>` : esc(run); run = ''; };
      for (let c = 0; c < line.length; c++) {
        const m = (mask && mask[r] && mask[r][c]) || '.';
        const style = line[c] === ' ' ? null : { c: o.tint || pal[m] || a.color, d: m === 'd' };
        if (!cur || !style || cur.c !== style.c || cur.d !== style.d) { flush(); cur = style; }
        run += line[c];
      }
      flush();
      out += '\n';
    });
    return `<pre class="art"${o.style ? ` style="${o.style}"` : ''}>${out}</pre>`;
  },
  badge(thing, small = false) {
    const b = badgeOf(thing);
    const R = RARITY_BY_ID[b.rarity];
    return `<span class="badge${small ? ' small' : ''}${b.rarity === 'luminous' || b.rarity === 'godly' ? ' glow' : ''}" style="--rc:${R.color}"><b>${esc(b.text)}</b>${small ? '' : `<i>${R.name}</i>`}</span>`;
  },
  rarityName(id) { const R = RARITY_BY_ID[id]; return `<span style="color:${R.color}">${R.name}</span>`; },
  itemTip(it) {
    if (!it) return '';
    if (it.kind === 'potion') {
      const P = POTIONS[it.id];
      return `<b>${esc(P.name)}</b> <span class="dim">x${it.n}</span><br>${this.rarityName(POTION_RARITY[P.tier])} potion · stacks to ${P.stack}<br>${esc(P.desc)}`;
    }
    const T = itemType(it);
    const lines = [];
    if (it.slot === 'weapon') {
      const fav = T.fav.includes(this.save ? this.save.cls : '');
      lines.push(`+${(it.dmg * 100 * (fav ? 1.25 : 1) * (T.dmg.length > 1 ? 0.75 : 1)).toFixed(0)}% ${T.dmg.map((k) => STAT_LINES[k].name).join(' & ')}${fav ? ' <span class="cool">(favoured)</span>' : ''}`);
    }
    for (const [k, v] of Object.entries(it.stats)) lines.push(fmtMod(k, v));
    if (it.enchant) {
      const E = ENCHANTS[it.enchant];
      const parts = E.mods ? Object.entries(E.mods).map(([k, v]) => fmtMod(k, v)) : [`item stats x${E.scaleStats}`];
      lines.push(`<span class="${E.neg ? 'hot' : 'sc'}">${E.name}: ${parts.join(', ')}</span>`);
    }
    return `<b>${esc(itemName(it))}</b><br>${this.rarityName(it.rarity)} ${T.name.toLowerCase()} · item level ${it.lvl}<br>${lines.join('<br>')}<br><span class="dim">Favoured by: ${it.slot === 'weapon' ? T.fav.map((c) => CLASSES[c].name).join(', ') : 'everyone'}</span>`;
  },
  itemLine(it) {
    if (!it) return '';
    if (it.kind === 'potion') return `${esc(POTIONS[it.id].desc)}`;
    const parts = [];
    if (it.slot === 'weapon') parts.push(`+${Math.round(it.dmg * 100)}% ${itemType(it).dmg.map((k) => STAT_LINES[k].name).join('/')}`);
    for (const [k, v] of Object.entries(it.stats)) parts.push(fmtMod(k, v));
    if (it.enchant) parts.push(`<span class="${ENCHANTS[it.enchant].neg ? 'hot' : 'sc'}">${ENCHANTS[it.enchant].name}</span>`);
    return parts.join(' · ');
  },

  // ------------------------------------------------------------------ title
  title() {
    this.show('title');
    this.save = loadGame();
    const has = !!this.save;
    const items = [
      has && ['C', 'Continue', () => { Hub.open(); }],
      ['N', 'New game', () => this.newGame()],
      ['L', 'Leaderboard', () => this.leaderboard()],
      ['A', 'Achievements', () => this.achievements()],
      ['H', 'Help', () => this.help()],
      ['B', 'About', () => this.about()],
    ].filter(Boolean);
    const nav = $('title-menu');
    nav.innerHTML = items.map(([k, label], i) => `<button data-key="${k}" data-i="${i}"><kbd>${k}</kbd><span>${label}</span>${i === 0 && has ? `<span class="dim" style="margin-left:auto">${esc(this.save.name)} · floor ${this.save.floor}</span>` : ''}</button>`).join('');
    nav.querySelectorAll('button').forEach((b) => { b.onclick = () => { SFX.init(); SFX.play('click'); items[+b.dataset.i][2](); }; });
    Title.start();
  },

  // ------------------------------------------------------------------ new game
  newGame() {
    if (this.save && !confirm(`Start a new soul? ${this.save.name}'s save (floor ${this.save.floor}) will be replaced. Its best floor stays on the leaderboard.`)) return;
    if (this.save) recordRun(this.save, 'retired');
    this.show('new');
    let pick = 'sniper';
    const name = $('ng-name');
    name.value = rng.pick(SS_NAMES);
    $('ng-roll').onclick = () => { name.value = rng.pick(SS_NAMES); };
    const grid = $('ng-abilities');
    const draw = () => {
      grid.innerHTML = Object.values(ABILITIES).map((a) => `
        <div class="card ab-card${a.id === pick ? ' sel' : ''}" data-ab="${a.id}" data-key="${ABILITY_KEYS[a.id]}">
          <span class="key">${ABILITY_KEYS[a.id]}</span>
          <div class="card-body"><h4>${a.name}</h4>
            <p><span class="plus">${a.plus.join('  ')}</span><br><span class="minus">${a.minus.join('  ')}</span><br><span class="trait">${esc(a.trait)}</span></p>
          </div></div>`).join('');
      grid.querySelectorAll('.ab-card').forEach((c) => { c.onclick = () => { pick = c.dataset.ab; SFX.play('click'); draw(); }; });
    };
    draw();
    $('ng-back').onclick = () => this.title();
    $('ng-go').onclick = () => {
      const nm = name.value.trim().slice(0, 16) || rng.pick(SS_NAMES);
      this.save = newSave(nm, pick, { hardcore: $('ng-hard').checked });
      rng.seed(this.save.seed);
      saveGame(this.save);
      SFX.play('win');
      Hub.open();
      this.modal(`<h2>Wolfe Lumi presents</h2>
        <p class="sub"><b>Soulstream II</b>. ${esc(titleOf(this.save))}.</p>
        <p class="sub">The original was a duel: two players, a <b>+</b> and a <b>-</b>, taking turns on a black console. This one is a climb. Every floor of the arena is one fight, every tenth a boss, and past the hundredth the stream comes round again, stronger, without end.</p>
        <p class="sub">Between fights you are in the <b>Sanctum</b>: masteries, skills, classes, the Emporium. In a fight, the keys are the original's: <kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><kbd>F</kbd><kbd>Z</kbd><kbd>X</kbd><kbd>C</kbd><kbd>V</kbd>, with <kbd>G</kbd> to guard and <kbd>1</kbd><kbd>2</kbd> for potions. Watch what your foe is about to do: it shows above its head.</p>
        <div class="row end"><button class="primary" data-close data-key="Enter">Begin</button></div>`);
    };
  },

  // ------------------------------------------------------------------ menu (Esc)
  menu() {
    const inFight = this.screen === 'battle';
    const card = this.modal(`<h2>Menu</h2>
      <div class="list" style="margin-top:1em">
        <button data-a="resume" data-key="Escape">Resume</button>
        <button data-a="help" data-key="H">Help</button>
        <button data-a="speed">Animation speed: ${FX.speed}x</button>
        <button data-a="ach">Achievements (${ACH.count()}/${ACHIEVEMENTS.length})</button>
        <button data-a="board">Leaderboard</button>
        ${inFight ? `<button data-a="abandon" class="danger">${Fight.b && Fight.b.mode === 'train' ? 'Leave training' : 'Abandon the fight (counts as a death)'}</button>` : ''}
        ${!inFight ? '<button data-a="export">Export / import save</button>' : ''}
        ${!inFight ? '<button data-a="title">Save and quit to title</button>' : ''}
      </div>`);
    card.querySelectorAll('[data-a]').forEach((b) => {
      b.onclick = () => {
        const a = b.dataset.a;
        if (a === 'resume') this.closeModal();
        if (a === 'help') this.help();
        if (a === 'ach') this.achievements();
        if (a === 'board') this.leaderboard();
        if (a === 'speed') { FX.speed = FX.speed >= 4 ? 1 : FX.speed * 2; store.set('ss2.speed', FX.speed); this.menu(); }
        if (a === 'abandon') { this.closeModal(); Fight.abandon(); }
        if (a === 'title') { saveGame(this.save); this.closeModal(); this.title(); }
        if (a === 'export') this.exportSave();
      };
    });
  },
  exportSave() {
    const code = exportSave(this.save);
    const card = this.modal(`<h2>Save code</h2><p class="sub">Copy this somewhere safe, or paste a code to load it.</p>
      <textarea id="sv-code" style="width:100%;height:9em;background:var(--bg0);color:var(--fg);border:1px solid var(--line);font:inherit;font-size:0.75em">${esc(code)}</textarea>
      <div class="row end gap"><button data-close>Close</button><button class="primary" id="sv-load">Load this code</button></div>`);
    card.querySelector('#sv-load').onclick = () => {
      const s = importSave($('sv-code').value);
      if (!s) return this.err('That code is not a Soulstream II save.');
      this.save = s; saveGame(s); this.closeModal(); Hub.open(); this.toast('Save loaded', `${s.name}, floor ${s.floor}`);
    };
  },

  // ------------------------------------------------------------------ boards
  leaderboard() {
    const rows = leaderboard();
    const me = this.save;
    this.modal(`<h2 class="gold">Official leaderboard</h2>
      <p class="note">The original's leaderboard (Wolfe Lumi, Moses, Pherihelion, Wilson, xAzureElectro, Srbninja) stands as the records to beat. Your characters join it by their deepest floor.</p>
      <table class="board"><tr><th>Rank</th><th>Name</th><th>Deepest floor</th><th></th></tr>
      ${rows.slice(0, 20).map((r, i) => `<tr class="${r.legend ? 'legend' : ''}${me && r.seed === me.seed ? ' me' : ''}"><td>${i + 1}</td><td>${esc(r.name)}${r.title && !r.legend ? `<div class="note" style="margin:0">${esc(r.title)}</div>` : ''}</td><td>${r.floor}</td><td class="dim">${r.legend ? 'legend' : r.hardcore ? 'hardcore' : esc(r.note || '')}</td></tr>`).join('')}
      </table><div class="row end"><button data-close>Close</button></div>`);
  },
  achievements() {
    this.modal(`<h2>Achievements <span class="dim">${ACH.count()}/${ACHIEVEMENTS.length}</span></h2>
      <div class="list" style="margin-top:0.8em">${ACHIEVEMENTS.map((a) => `<div class="lrow${ACH.has(a.id) ? '' : ' dis'}"><span class="badge small" style="--rc:${ACH.has(a.id) ? '#f2c45a' : '#3a3550'}"><b>${ACH.has(a.id) ? '*' : '-'}</b></span><div><div class="nm">${esc(a.name)}</div><div class="meta">${esc(a.desc)}${a.tag ? ` · ${esc(a.tag)}` : ''}</div></div><span></span></div>`).join('')}</div>
      <div class="row end"><button data-close>Close</button></div>`);
  },
  about() {
    this.modal(`<h2>About</h2>
      <p class="sub"><b>Soulstream II</b> was a turn-based ASCII RPG written in Windows batch by Wolfe Lumi in 2014: two players, a <b>+</b> and a <b>-</b>, on an 80 x 55 console, choosing skills with ASDFZXCV. It had the twelve starting abilities, fourteen masteries, skill ranks from F to 1, the Eweca, Laceda and Luminous skill sets, Soul Coins and experience, and the beginnings of the Emporium.</p>
      <p class="sub">This rebuild keeps its systems and its names, finishes what its design notes planned (items, potions, enchants, classes, perks, the Gods' Concept) and turns the duel into an endless arena against foes that grow more arcane and mythical with every stratum. Equipment and skills use Artillery 3's rank system and badges. All of the art is new, apart from the Emporium's sword.</p>
      <p class="note">"Soulstream II is still in development. This means that there will be a lot of bugs and/or glitches. Please be mindful of that. Thanks. Wolfe." (the original's intro)</p>
      <div class="sec">Changelog<span class="grip"></span></div>
      <div class="list">${CHANGELOG.map(([d, t]) => `<div class="lrow"><span class="dim">${d}</span><div class="meta" style="margin:0">${esc(t)}</div><span></span></div>`).join('')}</div>
      <p class="note">Font: Cascadia Mono (SIL OFL). No trackers; your save lives in this browser.</p>
      <div class="row end"><button data-close>Close</button></div>`);
  },
  help() {
    const R = RARITIES;
    this.modal(`<h2>How it works</h2><div class="help">
      <h3>The climb</h3>
      <p>Each floor is one fight. Floors 5, 15, 25... hold a <b>champion</b> (a foe with affixes); floors 10, 20, 30... a <b>boss</b>. There are ten strata to floor 100, then the <b>Beyond</b>, where they come round again Ascended, harder every floor.</p>
      <p>Win and you choose: <b>press on</b> (keep your wounds, recover 20%, and earn +12% for every fight in the streak) or <b>return to the Sanctum</b> (full health, streak over). Lose and the stream scatters a quarter of your Soul Coins and carries you back to the last floor after a multiple of five. For the next three fights you earn 50% more (the original's loss calculator). <b>Training</b> fights a foe from three floors back for 60% pay, at no risk.</p>
      <h3>A turn</h3>
      <p>Use a skill (<kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><kbd>F</kbd><kbd>Z</kbd><kbd>X</kbd><kbd>C</kbd><kbd>V</kbd>) or <kbd>G</kbd>uard (half damage until your next turn, and 10% mana back). A potion (<kbd>1</kbd> <kbd>2</kbd>) is free, once a turn. The foe's next move shows above it: a <span class="hot">charge</span> means a heavy blow next turn. Guard it, shield it, or stun the foe to break it. Past round 20 the foe hits 15% harder every round.</p>
      <h3>The numbers (the original's formulas)</h3>
      <p>Damage: <code>max = skill x rank x (1 + STR/100)</code> (INT for magic), <code>min = max x (BAL + skill BAL) / (100 + BAL + skill BAL)</code>, then <code>x 100 / (100 + DEF - DFP)</code>, less protection. Hit chance: the skill's accuracy plus up to 30 for your ACC against their AVD, from 15% to 95%. Crit chance from LUK, never over 50%; crit multiplier never over 3.0x.</p>
      <p><b>STR</b> physical damage, defence. <b>DEX</b> balance, accuracy, defence penetration. <b>INT</b> magic damage, mana, avoidance. <b>LUK</b> critical rate and multiplier. <b>WIL</b> health, balance.</p>
      <h3>Ranks and badges</h3>
      <p>Skills rank from F to A, then 9 down to 1 (F is 1.0x, 1 is 4.7x). Weapons, accessories, potions and skills carry Artillery 3's tiers and badges: ${R.map((r) => `<span style="color:${r.color}">${r.name}</span>`).join(', ')}. A badge is the tier's initial and a type letter: weapons <b>s</b>word, s<b>p</b>ear, bo<b>w</b>, scythe <b>y</b>, staff <b>t</b>, tome <b>m</b>; accessories <b>r</b>ing, <b>n</b>ecklace, <b>a</b>ttire, <b>g</b>love, g<b>l</b>asses, r<b>u</b>ne, bane <b>x</b>, wings <b>v</b>, <b>c</b>harm; potions <b>q</b>; skills <b>k</b> physical, <b>e</b> magic, <b>h</b> hybrid, <b>+</b> heal, <b>z</b> rest, <b>b</b> buff. Deeper tiers open as you go deeper.</p>
      <h3>Growing</h3>
      <p><b>Masteries</b> (experience) raise two stats each, without limit. <b>Skills</b> are learnt with Soul Coins and ranked with both. <b>Blessings</b> (classes) open after floor 10: Eweca (magic that keeps going), Laceda (constant, huge damage), Falias (survival); Luminous after floor 40. Each boss offers a <b>perk</b>. Past floor 60 a class can <b>awaken</b>; past 70, a demigod lends you their aspect.</p>
      <p class="note">Keys: <kbd>Esc</kbd> menu · <kbd>M</kbd> sound · <kbd>Enter</kbd> confirms.</p>
    </div><div class="row end"><button data-close>Close</button></div>`);
  },
};

// ------------------------------------------------------------------ the title screen's console
const Title = {
  raf: 0,
  start() {
    const cv = $('title-cv');
    const T = new Term(cv);
    const fit = () => {
      const w = cv.clientWidth, h = cv.clientHeight;
      const cols = w > 900 ? 110 : w > 600 ? 96 : 64;
      T.setSize(cols, 10);
      T.resize(w);
      T.setSize(cols, Math.max(20, Math.floor(h / T.ch)));
      T.resize(w);
    };
    fit();
    this.fit = fit;
    window.addEventListener('resize', fit);
    const flow = [];
    for (let i = 0; i < 70; i++) flow.push({ x: Math.random() * 120, y: Math.random(), v: 4 + Math.random() * 10, c: '~-=.'[i % 4] });
    let last = performance.now(), t = 0;
    const intro = !this.seen;
    this.seen = true;
    const colors = ['#7fe3ff', '#c3b0ff', '#f2c45a', '#7fe08a', '#ff9ad5'];
    const introC = colors[Math.floor(Math.random() * colors.length)]; // the original coloured its intro at random
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      T.clear();
      const midY = Math.floor(T.rows * 0.36);
      // the stream
      for (const f of flow) {
        f.x += f.v * dt; if (f.x > T.cols + 2) { f.x = -2; f.y = Math.random(); }
        const y = Math.round(midY + 5 + Math.sin(f.x / 8 + t) * 2 + (f.y - 0.5) * 4);
        T.put(f.x, y, f.c, '#3f6f8a', { a: 0.6 });
      }
      if (intro && t < 2.2) {
        const a = Math.min(1, t * 2, (2.2 - t) * 2);
        T.ctext(T.cols / 2, midY - 2, 'Wolfe Lumi', introC, { a });
        T.ctext(T.cols / 2, midY, 'Presents', introC, { a });
        T.ctext(T.cols / 2, midY + 2, 'Soulstream II', introC, { a, bold: true });
      } else {
        const a = intro ? Math.min(1, (t - 2.2) * 2) : 1;
        const logo = ART.logo;
        if (logo && artRows(logo).w <= T.cols - 2) {
          const r = artRows(logo);
          T.art(logo, Math.round(T.cols / 2 - r.w / 2), Math.max(1, midY - r.h), { a, glow: 0.8 });
        } else T.ctext(T.cols / 2, midY - 2, 'S O U L S T R E A M   I I', '#7fe3ff', { a, bold: true });
        const sig = ART.sigil;
        if (sig && T.cols >= 96) {
          const r = artRows(sig);
          T.art(sig, 3, T.rows - r.h - 3, { a: a * 0.35 });
          T.art(sig, T.cols - r.w - 3, T.rows - r.h - 3, { a: a * 0.35 });
        }
      }
      T.render();
      this.raf = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(loop);
    $('title-menu').style.opacity = intro ? 0 : 1;
    $('title-menu').style.transition = 'opacity .6s';
    if (intro) setTimeout(() => { $('title-menu').style.opacity = 1; }, 2300);
  },
  stop() { cancelAnimationFrame(this.raf); if (this.fit) window.removeEventListener('resize', this.fit); },
};
