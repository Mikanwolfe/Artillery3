'use strict';
// DOM layer: menu, character select, shop, round/game summaries and the small HUD bits.
// Most of the in-game HUD (labels, minimap, wind, charge/fuel bars) is drawn on the canvas.

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TYPE_LABELS = { human: 'Human', easy: 'CPU · Easy', normal: 'CPU · Normal', hard: 'CPU · Hard' };
const money = (n) => '¢' + Math.round(n).toLocaleString('en-US'); // credits
// match options picked on the menu's segmented controls, remembered between visits
const OPT_DEFAULTS = { rounds: '0', balance: 'rebalanced', events: 'on', map: 'random' };
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('a3.' + k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('a3.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};

const UI = {
  game: null,
  players: [],
  last: {},
  opts: { ...OPT_DEFAULTS },
  shopFilter: 'all',
  humanTurns: 0,

  init(game) {
    this.game = game;
    game.ui = this;
    this.players = [
      { name: 'P-Chan', type: 'human' },
      { name: '', type: 'normal' },
      { name: '', type: 'easy' },
      { name: '', type: 'hard' },
    ];
    for (const p of this.players) if (!p.name) p.name = cpuName(this.players.map((q) => q.name));
    // build stamp: the short git hash, written into js/version.js when the site is published
    const v = $('version');
    v.textContent = A3_VERSION === 'dev' ? 'dev build' : `build ${A3_VERSION}`;
    if (A3_VERSION !== 'dev') v.href = `https://github.com/Mikanwolfe/Artillery3/commit/${A3_VERSION}`;
    this.renderPlayers();
    $('add-player').onclick = () => {
      if (this.players.length >= 4) return;
      this.players.push({ name: cpuName(this.players.map((q) => q.name)), type: 'normal' });
      this.renderPlayers();
    };
    // segmented controls for the match options
    Object.assign(this.opts, store.get('opts') || {});
    document.querySelectorAll('#menu .seg').forEach((seg) => {
      const key = seg.dataset.opt;
      const sync = () => seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === this.opts[key]));
      seg.querySelectorAll('button').forEach((b) => {
        b.onclick = () => { this.opts[key] = b.dataset.v; store.set('opts', this.opts); sync(); game.sfx.hover(); };
      });
      sync();
    });
    $('how').onclick = () => this.toggleHelp(true);
    $('help-close').onclick = () => this.toggleHelp(false);
    $('help').onclick = (e) => { if (e.target === $('help')) this.toggleHelp(false); };
    $('btn-keys').onclick = () => this.toggleHelp();
    document.querySelectorAll('#help .help-tabs button').forEach((b) => { b.onclick = () => this.helpTab(b.dataset.tab); });
    $('pause-keys').onclick = () => this.toggleHelp(true);
    $('veh-back').onclick = () => { $('vehicles').hidden = true; $('menu').hidden = false; this.pick = null; };
    $('start').onclick = () => this.selectVehicles();
    $('load').onclick = () => {
      const d = Game.readSave();
      if (d) { $('menu').hidden = true; this.game.loadMatch(d); }
    };
    this.syncLoad();
    $('re-next').onclick = () => { $('roundend').hidden = true; game.afterRoundEnd(); };
    $('ge-again').onclick = () => { $('gameend').hidden = true; this.renderProgCard(); game.sfx.music('shop'); game.phase = 'menu'; $('menu').hidden = false; game.newEnvironment(); this.syncLoad(); };
    $('resume').onclick = () => game.togglePause();
    $('pause-end').onclick = () => game.endMatch();
    $('pause-turn').onclick = () => { game.togglePause(); if (game.phase === 'aim') game.input.queue.push({ endTurn: true }); };
    $('re-end').onclick = () => { $('roundend').hidden = true; game.endMatch(); };
    $('btn-pause').onclick = () => game.togglePause();
    $('btn-mute').onclick = () => game.toggleMute();
    $('btn-music').onclick = () => game.toggleMusic();
    // the air-defence range rings: off by default (remembered in this browser)
    try { game.showAARange = localStorage.getItem('a3.aaRange') === '1'; } catch (e) { game.showAARange = false; }
    $('btn-aa').classList.toggle('off', !game.showAARange);
    $('btn-aa').onclick = () => {
      game.showAARange = !game.showAARange;
      $('btn-aa').classList.toggle('off', !game.showAARange);
      try { localStorage.setItem('a3.aaRange', game.showAARange ? '1' : '0'); } catch (e) { /* (private window: just this session) */ }
    };
    // A3 UI_Button: a hover blip over buttons and a confirm click (shop buttons have their own sounds)
    const stage = $('stage');
    stage.addEventListener('pointerover', (e) => {
      const b = e.target.closest && e.target.closest('button, .veh');
      if (b && !b.disabled && !b.closest('#touch') && !b.contains(e.relatedTarget)) game.sfx.hover();
    });
    stage.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('.primary, #add-player, .prow .icon, #load');
      if (b && !b.disabled) game.sfx.confirm();
    });
    this.syncMute();
    this.initTouch();
    this.rackClicks();
    this.initCodex();
    this.initProgress();
    window.addEventListener('keydown', (e) => {
      // character select: 1-4 picks a card
      if (this.pick && !$('vehicles').hidden && /^Digit[1-9]$/.test(e.code)) {
        const el = $('veh-grid').children[+e.code.slice(5) - 1];
        if (el) { el.click(); e.preventDefault(); }
        return;
      }
      if (e.code !== 'Enter' || /^(INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(e.target.tagName)) return;
      for (const id of ['re-next', 'shop-done', 'ge-again']) {
        const b = $(id);
        if (b.offsetParent) { b.click(); e.preventDefault(); return; }
      }
    });
    document.addEventListener('pointerdown', () => game.sfx.unlock(), { once: true });
  },

  // ------------------------------------------------------------ menu
  renderPlayers() {
    const box = $('players');
    box.innerHTML = '';
    this.players.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'prow';
      row.innerHTML = `<span class="swatch" style="background:${PLAYER_COLORS[i]}"></span>
        <input type="text" maxlength="14" value="${esc(p.name)}" aria-label="Player ${i + 1} name">
        <select aria-label="Player ${i + 1} type">${Object.entries(TYPE_LABELS).map(([k, v]) => `<option value="${k}"${k === p.type ? ' selected' : ''}>${v}</option>`).join('')}</select>
        <button class="icon" title="Remove" aria-label="Remove player ${i + 1}" ${this.players.length > 2 ? '' : 'disabled'}>✕</button>`;
      row.querySelector('button').onclick = () => {
        if (this.players.length <= 2) return;
        this.players.splice(i, 1);
        this.renderPlayers();
      };
      row.querySelector('input').oninput = (e) => { p.name = e.target.value; };
      row.querySelector('select').onchange = (e) => {
        p.type = e.target.value;
        if (p.type !== 'human' && /^Player \d$/.test(p.name)) { p.name = cpuName(this.players.map((q) => q.name)); this.renderPlayers(); }
      };
      box.appendChild(row);
    });
    $('add-player').hidden = this.players.length >= 4;
  },

  // the controls / how-to-play sheet (menu link, H or ? in game, pause menu)
  toggleHelp(on = $('help').hidden, tab = 'play') {
    $('help').hidden = !on;
    if (on) this.helpTab(tab);
    return true;
  },
  helpOpen() { return !$('help').hidden; },
  helpTab(tab) {
    if (tab === 'changes' && !$('changelog').childElementCount) {
      $('changelog').innerHTML = `<table class="keys cl">${CHANGELOG.map(([h, txt]) => `<tr><td><a href="${CHANGELOG_REPO}${h}" target="_blank" rel="noopener">${esc(h)}</a></td><td>${esc(txt)}</td></tr>`).join('')}</table>`;
    }
    document.querySelectorAll('#help .help-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    document.querySelectorAll('#help .tab').forEach((d) => { d.hidden = d.dataset.tab !== tab; });
  },

  configs() {
    const seen = new Set();
    return this.players.map((p, i) => {
      let name = (p.name || '').trim() || (i ? `Player ${i + 1}` : 'P-Chan');
      while (seen.has(name)) name += '′';
      seen.add(name);
      return { name, type: p.type, vehicle: null };
    });
  },

  // the girls on offer: those her tier has unlocked, in roster order (progress.js)
  roster() { return VEHICLES.filter((v) => PROG.girlOk(v.id)); },

  // ------------------------------------------------------------ progression (progress.js)
  initProgress() {
    const g = this.game;
    $('wel-new').onclick = () => { this.welcomed(); this.startTutorial(); };
    $('wel-old').onclick = () => this.welcomed();
    $('wel-all').onclick = () => { PROG.unlockAll(); this.welcomed(); };
    $('prog-close').onclick = () => { $('progress').hidden = true; $('menu').hidden = false; };
    $('prog-tut').onclick = () => { $('progress').hidden = true; this.startTutorial(); };
    $('prog-all').onclick = () => { PROG.unlockAll(); this.renderProgress(); };
    $('prog-reset').onclick = () => { if (confirm('Reset your progress to Tier 0?')) { PROG.reset(); this.renderProgress(); } };
    $('coach-skip').onclick = () => g.tutEnd(false);
    this.renderProgCard();
    if (!PROG.data.asked && !new URLSearchParams(location.search).has('auto')) { $('menu').hidden = true; $('welcome').hidden = false; }
  },
  welcomed() { PROG.data.asked = true; PROG.save(); $('welcome').hidden = true; $('menu').hidden = false; this.renderProgCard(); },

  // the menu's card: tier, rounds to the next, who comes next
  renderProgCard() {
    const i = PROG.tier(), n = PROG.next(), c = PROG.data.cleared;
    const prev = PROG_TIERS[i].at;
    const pct = n ? Math.round((100 * (c - prev)) / (n.at - prev)) : 100;
    $('prog-card').innerHTML = `<div class="progcard"><div class="pc-top"><b>Tier ${i}</b><span class="mgh">${PROG.data.all ? 'everything unlocked' : `${c} round${c === 1 ? '' : 's'} cleared`}</span></div>
      <span class="meter"><i style="width:${pct}%;--c:var(--gold)"></i></span>
      <span class="pc-next">${n ? `Next, at ${n.at}: <b>${esc(girlName(n.girl))}</b> · ${esc(n.foes)}` : 'Every girl, hostile and gun is unlocked.'}</span>
      <div class="pc-row"><button id="prog-open" class="ghost">Progress tree</button>${PROG.data.tut ? '' : '<button id="prog-tut2" class="ghost">Tutorial</button>'}</div></div>`;
    $('prog-open').onclick = () => { $('menu').hidden = true; this.renderProgress(); $('progress').hidden = false; };
    if ($('prog-tut2')) $('prog-tut2').onclick = () => this.startTutorial();
  },

  // the tier tree: each tier's girl (a silhouette until it unlocks), hostiles and gear
  renderProgress() {
    const now = PROG.tier(), c = PROG.data.cleared;
    $('prog-sum').textContent = PROG.data.all ? 'Everything unlocked' : `Tier ${now} · ${c} cleared`;
    $('prog-tree').innerHTML = PROG_TIERS.map((T, i) => {
      const st = i <= now ? 'got' : i === now + 1 ? 'next' : 'locked';
      return `<div class="tier ${st}"><div class="t-girl"><canvas width="84" height="100" data-g="${T.girl}"></canvas></div>
        <div class="t-body"><span class="t-n">Tier ${i} · ${i === 0 ? 'start' : st === 'got' ? 'unlocked' : `at ${T.at} cleared`}</span><h3>${esc(girlName(T.girl))}</h3>
        <p><b>Hostiles</b> ${esc(T.foes)}</p><p><b>Shop</b> ${esc(T.gear)}</p></div></div>`;
    }).join('');
    $('prog-tree').querySelectorAll('canvas').forEach((cv, i) => {
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.scale(1.3, 1.3);
      const v = VEHICLES.find((x) => x.id === cv.dataset.g);
      const o = { id: v.id, x: 30, y: 70, facing: 1, color: PLAYER_COLORS[0], state: 'ok', t: 0, walking: false, flash: 0 };
      drawGirl(g, o);
      const a = GIRL_ART[v.id] || GIRL_ART.gwt;
      drawGun(g, v.weapon, { x: o.x + a.pivot[0], y: o.y + a.pivot[1] }, { x: Math.cos(rad(30)), y: -Math.sin(rad(30)) }, 1, 0, shade(PLAYER_COLORS[0], -0.5), 0);
      drawGirlMount(g, o);
      if (i > now) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#14121c'; g.fillRect(0, 0, cv.width, cv.height); }
    });
  },

  // the round-end screen: a tier reached, or how far to the next
  addUnlock(i) {
    const d = document.createElement('div');
    d.className = 'quip lore unlock';
    d.innerHTML = `<b>Tier ${i} unlocked</b> ${esc(tierLine(i).replace(/^Tier \d+: /, ''))}`;
    $('re-quips').prepend(d);
    this.notice(`Tier ${i} unlocked: ${girlName(PROG_TIERS[i].girl)} joins the roster.`);
    this.renderProgCard();
  },
  addUnlockHint(left, i) {
    const d = document.createElement('div');
    d.className = 'quip lore';
    d.textContent = `${left} more round${left === 1 ? '' : 's'} cleared to Tier ${i}: ${girlName(PROG_TIERS[i].girl)}.`;
    $('re-quips').prepend(d);
    this.renderProgCard();
  },

  // the tutorial: a two-round match, G.W. Tiger against an Easy G.W. Tiger, with the coach box
  startTutorial() {
    this.game.sfx.unlock();
    const me = (this.players.find((p) => p.type === 'human') || {}).name || 'P-Chan';
    $('menu').hidden = true;
    this.game.startMatch([{ name: me, type: 'human', vehicle: 'gwt' }, { name: cpuName([me]), type: 'easy', vehicle: 'gwt' }], 2, { balance: 'rebalanced', events: false, map: 'forest', prog: true });
    this.game.tutStart();
  },
  coach(T) {
    const box = $('coach');
    if (!T) { box.hidden = true; return; }
    const S = TUTORIAL[T.i];
    $('coach-title').textContent = `Tutorial ${T.i + 1}/${TUTORIAL.length} · ${S.title}`;
    $('coach-text').textContent = S.text;
    box.hidden = false;
  },
  tutDone() {
    const d = document.createElement('div');
    d.className = 'quip lore unlock';
    d.innerHTML = '<b>Tutorial complete</b> Back on the menu, pick from the girls you have unlocked. Clear rounds to unlock the rest (Progress tree).';
    $('ge-quips').prepend(d);
  },

  // A3 "Select a Character": each human picks a vehicle in turn; CPUs pick at random
  selectVehicles() {
    this.game.sfx.unlock();
    const cfgs = this.configs();
    for (const c of cfgs) if (c.type !== 'human') c.vehicle = rng.pick(this.roster()).id;
    const queue = cfgs.filter((c) => c.type === 'human');
    const next = () => {
      const c = queue.shift();
      if (!c) {
        this.pick = null;
        $('vehicles').hidden = true;
        const o = this.opts;
        this.game.startMatch(cfgs, +o.rounds, { balance: o.balance, events: o.events === 'on', map: o.map, prog: true });
        return;
      }
      this.pick = c;
      $('menu').hidden = true;
      $('vehicles').hidden = false;
      const col = PLAYER_COLORS[cfgs.indexOf(c) % PLAYER_COLORS.length];
      $('veh-player').innerHTML = `<span class="dot" style="background:${col}"></span>${esc(c.name)}`;
      const meter = (label, v, max, color) => `<span class="mgh">${label}</span><span class="meter"><i style="width:${Math.round(100 * Math.min(1, v / max))}%;--c:${color}"></i></span><span class="n">${v}</span>`;
      $('veh-grid').classList.toggle('many', this.roster().length > 5);
      $('veh-n').textContent = this.roster().length;
      const nx = PROG.next();
      $('veh-next').textContent = nx ? ` · next: ${girlName(nx.girl)} at ${nx.at} rounds cleared (${PROG.data.cleared} so far)` : '';
      $('veh-grid').innerHTML = this.roster().map((v, i) => {
        const w = v.weapon;
        const fuel = Math.round(100 * (v.fuel || 1));
        return `<div class="veh" tabindex="0" data-v="${v.id}"><span class="key">${i + 1}</span>
          <div class="stage"><canvas class="girl" width="168" height="200" data-g="${v.id}"></canvas></div>
          <div><span class="maker${MAKER_CLASS[v.id] || ''}">${MAKERS[v.id] || ''}</span><h3>${esc(v.name)}</h3></div>
          <p>${esc(v.blurb)}</p>
          <ul class="traits">${(v.traits || []).map((id) => `<li><b>${esc(TRAITS[id].name)}</b> ${esc(TRAITS[id].desc)}</li>`).join('')}</ul>
          <div class="meters">${meter('Health', v.hp, 200, 'var(--cool)')}${meter('Armour', v.armour, 200, 'var(--accent)')}${meter('Fuel', fuel, 100, 'var(--gold)')}</div>
          <div class="veh-wpn">${this.badge(w, true)}<h4 style="color:${RARITY[w.rarity].ui}">${esc(w.name)}</h4></div>
          <div class="stats">${this.weaponStats(w)}</div></div>`;
      }).join('');
      // portraits: each turret girl in the player's colour, holding her starting gun
      $('veh-grid').querySelectorAll('canvas.girl').forEach((cv) => {
        const g = cv.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.scale(2.6, 2.6);
        const v = VEHICLES.find((x) => x.id === cv.dataset.g);
        const o = { id: v.id, x: 34, y: 74, facing: 1, color: col, state: 'ok', t: 0, walking: false, flash: 0 };
        drawGirl(g, o);
        const a = GIRL_ART[v.id] || GIRL_ART.gwt;
        drawGun(g, v.weapon, { x: o.x + a.pivot[0], y: o.y + a.pivot[1] }, { x: Math.cos(rad(30)), y: -Math.sin(rad(30)) }, 1, 0, shade(col, -0.5), 0);
        drawGirlMount(g, o);
      });
      $('veh-grid').querySelectorAll('.veh').forEach((el) => {
        el.onclick = () => { c.vehicle = el.dataset.v; this.game.sfx.confirm(); next(); };
        el.onkeydown = (e) => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); el.click(); } };
      });
    };
    next();
  },

  // the original shop's badge: a square outlined in the rarity colour, two big letters and the word
  badge(w, small = false) {
    const r = RARITY[w.rarity];
    return `<span class="badge${small ? ' small' : ''}" style="--rc:${r.ui}"><b>${w.role ? r.word[0] + 'd' : badgeText(w)}</b>${small ? '' : `<i>${r.word}</i>`}</span>`;
  },

  weaponStats(w) {
    if (w.air) { // planes: what a squad is, and how often it flies
      const A = w.air, F = w.fleet;
      const rows = [['Dmg', `${w.dmg}${A.ord > 1 ? '×' + A.ord : ''}`], ['Rad', w.dmgR], ['Planes', F ? F.dive + F.torpedo + F.fighter : A.planes], ['Squads', A.squads || 1], ['Passes', F ? '2–6' : AIR_PASSES[A.type]],
        ['Rearm', F ? `${reloadOf(w)} turns` : `${reloadOf(w)} (+${vtolRearm(w)} VTOL)`], ['Type', F ? 'fleet' : A.type], ['Zone', airZone(w)], ['Plane HP', A.hp]];
      if (A.armour) rows.push(['Armour', A.armour]);
      if (A.jet) rows.push(['Jet', 'AA ½']);
      if (w.guide) rows.push(['Seek', w.guide.range]);
      return rows.map(([k, v]) => `<span>${k}</span><span>${v}</span>`).join('');
    }
    if (w.role) { // an air-defence mount
      const rows = [['Role', w.role === 'missile' ? 'point defence' : 'anti-air'], ['Range', w.range]];
      if (w.role === 'missile') rows.push(['Stops', `${Math.round(w.stop * 100)}%`], ['vs air', `${w.dmg}×${w.perTurn}`]);
      else rows.push(['Burst', w.dmg], ['Hit', `${Math.round(w.acc * 100)}%`], ['Bursts', `${w.perTurn}/turn`], ['vs missiles', `${Math.round(w.stop * 100)}%`]);
      if (w.splash) rows.push(['Splash', w.splash]);
      return rows.map(([k, v]) => `<span>${k}</span><span>${v}</span>`).join('');
    }
    const rows = [['Dmg', w.salvo > 1 ? `${w.dmg}×${w.salvo}` : w.dmg], ['Rad', w.dmgR], ['Rng', w.maxCharge], ['Spr', w.disp], ['Elev', `${w.elevMin}…${w.elevMax}°`]];
    if (w.clip > 1) rows.push(['Load', `${w.clip}/turn`]);
    if (reloadOf(w)) rows.push(['Rld', `${reloadOf(w)} turn${reloadOf(w) > 1 ? 's' : ''}`]);
    if (w.drift !== 1) rows.push(['Wind', `${Math.round(w.drift * 100)}%`]);
    if (w.guide) rows.push(['Seek', w.guide.range]);
    if (w.carpet) rows.push(['Carpet', `${w.carpet.n} bomblets`]);
    if (w.split) rows.push(['Split', `${w.split.n} seekers`]);
    if (w.sat) rows.push(['Sat', 'MAIA']);
    if (w.kind !== 'shell') rows.push(['Type', w.kind]);
    return rows.map(([k, v]) => `<span>${k}</span><span>${v}</span>`).join('');
  },

  // ------------------------------------------------------------ HUD
  showHud(on) {
    $('hud').hidden = !on;
    if (on) $('menu').hidden = true;
    $('chat').innerHTML = '';
    this.last = {};
    if (on) { this.humanTurns = 0; $('hints').classList.remove('quiet'); }
  },

  syncMute() {
    $('btn-mute').textContent = this.game.sfx.muted ? '✕' : '♪';
    $('btn-music').classList.toggle('off', !this.game.sfx.musicOn);
  },
  showPause(on) {
    const g = this.game;
    $('pause').hidden = !on;
    $('pause-turn').hidden = !(g.phase === 'aim' && g.active && !g.active.isCpu && !g.cpu); // (Enter on a keyboard)
  },

  turn(t) {
    const g = this.game;
    $('turn').innerHTML = `<span class="dot" style="background:${t.color}"></span>${esc(t.name)}`;
    if (g.phase === 'aim' && !t.firedThisTurn && !g.range) {
      const b = $('banner');
      b.innerHTML = `<span>${esc(t.name)}${t.isCpu ? '' : ' · your turn'}</span>`;
      if (!t.isCpu && ++this.humanTurns === 4) $('hints').classList.add('quiet');
      b.classList.remove('show');
      void b.offsetWidth;
      b.classList.add('show');
    }
  },

  // the menu's load button appears when there is an autosaved match to resume
  syncLoad() {
    const d = Game.readSave();
    const b = $('load');
    b.hidden = !d;
    if (d) b.textContent = `load (round ${d.completed + 1}${d.rounds ? '/' + d.rounds : ''}: ${d.tanks.map((t) => t.name).join(', ')})`;
  },

  // a story transmission card (fades by itself)
  dispatch(title, text) {
    if (!text) return;
    const d = $('dispatch');
    $('dispatch-title').textContent = title;
    $('dispatch-text').textContent = text;
    d.hidden = true;
    void d.offsetWidth;
    d.hidden = false;
    clearTimeout(this.dispatchTimer);
    this.dispatchTimer = setTimeout(() => { d.hidden = true; }, 7000);
  },

  // a system line in the chat log (no speaker)
  notice(text) {
    const d = document.createElement('div');
    d.className = 'sys';
    d.textContent = text;
    const box = $('chat');
    box.appendChild(d);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => d.remove(), 14000);
  },

  chat(tank, text) {
    const d = document.createElement('div');
    d.style.borderColor = tank.color;
    d.innerHTML = `<b style="color:${tank.color};font-weight:normal">${esc(tank.name)}</b> ${esc(text)}`;
    const box = $('chat');
    box.appendChild(d);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => d.remove(), 14000);
  },

  // the rack: the active vehicle's guns (loaded, in hand, or reloading with turns left) and its
  // abilities and repair kits (ready, armed or recharging). Click to pick; keys shown on each.
  rackClicks() {
    $('rack').onclick = (e) => {
      const b = e.target.closest('button');
      const g = this.game;
      if (!b || g.cpu || g.phase !== 'aim') return;
      if (b.dataset.i !== undefined) g.input.queue.push({ select: +b.dataset.i });
      else if (b.dataset.ab) g.input.queue.push({ ability: b.dataset.ab });
      else if (b.dataset.rep) g.input.queue.push({ repair: true });
      else if (b.dataset.recall) g.input.queue.push({ recall: true });
      else if (b.dataset.jump) g.input.queue.push({ jump: b.dataset.jump === 'leap' ? 'leap' : true });
    };
  },

  renderRack(g) {
    const t = g.active;
    const show = t && t.alive && (g.phase === 'aim' || g.phase === 'resolve');
    const sig = show ? JSON.stringify([t.name, t.weapons, t.weaponIdx, t.reload, t.wings, t.aa, t.shotsLeft, t.firedThisTurn, t.abilities, t.cooldown, t.armed, t.shield, !!t.barrier, t.kits, t.core, !!t.uplink, t.uplinkTurns || 0, !!g.cpu, g.phase, BALANCE, t.fuel >= Math.ceil(t.maxFuel * JUMP_FUEL), t.fuel >= Math.ceil(t.maxFuel * LEAP_FUEL * (hasTrait(t, 'wings') ? 0.5 : 1)), !!t.falling]) : '';
    if (sig === this.last.rack) return;
    this.last.rack = sig;
    $('rack').hidden = !show;
    if (!show) return;
    $('rack').classList.toggle('cpu', !!g.cpu);
    $('rack').style.setProperty('--pc', t.color);
    $('rack-w').innerHTML = `<span class="rk">Q·E</span>` + t.weapons.map((id, i) => {
      const w = WEAPON_BY_ID[id];
      const on = i === t.weaponIdx;
      const left = t.reloadLeft(id);
      const total = reloadOf(w) + 1;
      let st;
      if (on && t.firedThisTurn && t.shotsLeft > 0 && !w.air) st = `${t.shotsLeft} left`;
      else if (left > 0) st = `↻ ${left} turn${left > 1 ? 's' : ''}`;
      else if (w.air) { // planes: her squads, by where they are
        const sq = t.wing(w), n = (f) => sq.filter(f).length, rearm = sq.filter((q) => q.state === 'rearm');
        const parts = [[n((q) => !q.tasked && q.state === 'deck'), 'ready'], [n((q) => !q.tasked && q.state === 'out'), 'out'], [n((q) => q.tasked && q.state === 'out'), 'sent'], [n((q) => q.state === 'home'), 'returning'],
          [rearm.length, `rearming${rearm.length ? ` (${Math.min(...rearm.map((q) => q.turns))})` : ''}`]].filter(([k]) => k > 0);
        st = parts.map(([k, s]) => `${k} ${s}`).join(' · ');
      }
      else st = on ? (w.clip > 1 ? `${w.clip} shots` : 'selected') : 'loaded';
      const reloadNote = w.air ? `${w.air.squads} squad${w.air.squads > 1 ? 's' : ''}, one laser dot each a turn. A squad on deck takes off. If none is on deck, a squad that is out goes to the new dot. A squad that returns or is lost rearms for ${reloadOf(w) + (w.fleet || hasTrait(t, 'flightdeck') || (t.upgrades && t.upgrades.deck) ? 0 : vtolRearm(w))} turns${w.fleet || hasTrait(t, 'flightdeck') || (t.upgrades && t.upgrades.deck) ? '' : ' (lift-fan launch: a flight deck saves ' + vtolRearm(w) + ' turns)'}` : reloadOf(w) ? `Reloads for ${reloadOf(w)} turn${reloadOf(w) > 1 ? 's' : ''} after firing` : 'Never reloads';
      const pips = w.air ? `<span class="pips">${t.wing(w).map((q) => `<i class="${q.state === 'rearm' || q.state === 'home' ? 'r' : q.tasked ? '' : q.state === 'out' ? 'o' : 'f'}"></i>`).join('')}</span>` : on && w.clip > 1 ? `<span class="pips">${Array.from({ length: w.clip }, (_, k) => `<i class="${k < (t.firedThisTurn || w.air ? t.shotsLeft : w.clip) ? 'f' : ''}"></i>`).join('')}</span>` : '';
      return `<button class="slot w${on ? ' on' : ''}${left > 0 ? ' rl' : ''}" data-i="${i}" title="${esc(w.name)} · ${reloadNote}" ${left > 0 || !t.weaponReady(id) || (t.firedThisTurn && !on) ? 'disabled' : ''}>
        ${this.badge(w, true)}<span class="txt"><span class="nm">${esc(w.name)}</span><span class="st">${st}</span></span>${pips}
        ${left > 0 ? `<span class="rlbar"><i style="width:${Math.round(100 * (1 - left / total))}%"></i></span>` : ''}</button>`;
    }).join('');
    const ab = ABILITIES.filter((a) => t.abilities[a.id] > 0).map((a) => {
      const armed = t.armed[a.id] || (a.id === 'shield' && t.shield) || (a.id === 'barrier' && t.barrier);
      const cd = t.cooldown[a.id];
      const st = armed ? (a.id === 'shield' || a.id === 'barrier' ? 'active' : 'armed') : cd > 0 ? `↻ ${cd}` : 'ready';
      return `<button class="slot a${armed ? ' armed' : ''}${cd > 0 && !armed ? ' rl' : ''}" data-ab="${a.id}" title="${esc(a.name)}: ${esc(a.desc)}" ${cd > 0 && !armed ? 'disabled' : ''}>
        <span class="kb">${a.key}</span><span class="txt"><span class="nm">${esc(a.name)}</span><span class="st">${st}</span></span></button>`;
    });
    const jumpCost = Math.ceil(t.maxFuel * JUMP_FUEL);
    ab.push(`<button class="slot a" data-jump="1" title="Jump: jump in the direction you face. Uses ${Math.round(JUMP_FUEL * 100)}% of a full fuel tank." ${t.fuel >= jumpCost && !t.falling ? '' : 'disabled'}><span class="kb">W</span><span class="txt"><span class="nm">Jump</span><span class="st">${Math.round(JUMP_FUEL * 100)}% fuel</span></span></button>`);
    const leapCost = Math.ceil(t.maxFuel * LEAP_FUEL * (hasTrait(t, 'wings') ? 0.5 : 1));
    ab.push(`<button class="slot a" data-jump="leap" title="Leap: jump far in the direction you face, with no fall damage. Uses ${Math.round(LEAP_FUEL * 100)}% of a full fuel tank." ${t.fuel >= leapCost && !t.falling && !t.upgrades.deck ? '' : 'disabled'}><span class="kb">L</span><span class="txt"><span class="nm">Leap</span><span class="st">${Math.round(LEAP_FUEL * 100)}% fuel</span></span></button>`);
    if (t.kits > 0) ab.push(`<button class="slot a" data-rep="1" title="Repair kit: restores ${Math.round(REPAIR_FRAC * 100)}% of health and armour, health first. Uses your turn." ${t.firedThisTurn ? 'disabled' : ''}><span class="kb">R</span><span class="txt"><span class="nm">Repair kit</span><span class="st">× ${t.kits}</span></span></button>`);
    const rc = g.recallable ? g.recallable(t, t.weapon.air && g.recallable(t, t.weapon).length ? t.weapon : null) : [];
    if (rc.length) ab.push(`<button class="slot a" data-recall="1" title="Recall: send ${rc.length > 1 ? 'these squads' : 'this squad'} home now, with the loadout unspent. Then rivals cannot shoot ${rc.length > 1 ? 'them' : 'it'} over the zone. ${rc.length > 1 ? 'They rearm' : 'It rearms'} as usual. Does not use your turn."><span class="kb">X</span><span class="txt"><span class="nm">Recall</span><span class="st">${rc.length > 1 ? rc.length + ' squads' : esc(shortName(rc[0].w))}</span></span></button>`);
    for (const id of t.aa || []) {
      const a = AA_BY_ID[id];
      if (a) ab.push(`<span class="slot a passive" title="${esc(a.name)}: ${esc(a.long)}"><span class="kb">AA</span><span class="txt"><span class="nm">${esc(a.name.replace(/^(SI|NXi|LFS|Kotona) /, ''))}</span><span class="st">${a.role === 'missile' ? 'point defence' : 'anti-air'} · auto</span></span></span>`);
    }
    if (t.uplinkTurns > 0) ab.push(`<span class="slot a armed uplink" title="Golden uplink: the first shot of each turn calls MAIA"><span class="kb">◆</span><span class="txt"><span class="nm">MAIA uplink</span><span class="st">${t.uplinkTurns} turn${t.uplinkTurns > 1 ? 's' : ''}</span></span></span>`);
    else if (t.uplink) ab.push(`<span class="slot a armed uplink" title="Satellite uplink: your next shot calls MAIA"><span class="kb">◆</span><span class="txt"><span class="nm">MAIA uplink</span><span class="st">next shot</span></span></span>`);
    const C = coreOf(t); // her core: its own slot on the rack
    $('rack-c').innerHTML = C
      ? `<span class="slot core passive" style="--rc:${RARITY[C.rarity].ui}" title="${esc(C.name)}: ${esc(C.short)}">${`<span class="badge small" style="--rc:${RARITY[C.rarity].ui}"><b>${RARITY[C.rarity].word[0]}c</b></span>`}<span class="txt"><span class="nm">${esc(C.name)}</span><span class="st">+${Math.round(C.boost * 100)}% ${esc(C.coreLabel.toLowerCase())} · −${C.block}/hit</span></span></span>`
      : '<span class="slot core passive empty" title="No core: buy one in the shop"><span class="kb">◇</span><span class="txt"><span class="nm">No core</span><span class="st">empty slot</span></span></span>';
    $('rack-a').innerHTML = ab.join('');
    $('rack-a').hidden = !ab.length;
  },

  updateHud(g) {
    if ($('hud').hidden) return;
    this.renderRack(g);
    const r = `Round ${g.round}${g.rounds ? '/' + g.rounds : ''}`;
    if (this.last.r !== r) { this.last.r = r; $('roundinfo').textContent = r.replace('Round', 'Rnd'); }
  },

  initTouch() {
    const g = this.game;
    document.querySelectorAll('#touch [data-k]').forEach((b) => {
      const k = b.dataset.k;
      const set = (v) => (e) => { e.preventDefault(); g.sfx.unlock(); g.input.ctl[k] = v; };
      b.addEventListener('pointerdown', set(true));
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, set(false)));
    });
    // MENU: the pause menu (resume, end turn, end match), at a size a thumb can hit
    document.querySelectorAll('#touch [data-menu]').forEach((b) => {
      b.addEventListener('click', (e) => { e.preventDefault(); if (!g.paused) g.togglePause(); });
    });
  },

  // ------------------------------------------------------------ round / shop / end
  showRoundEnd({ round, winner, tanks, award }, last) {
    $('re-kicker').textContent = `Round ${round} complete`;
    $('re-title').innerHTML = winner
      ? `<span style="color:${winner.color}">${esc(winner.name)}</span> wins the round`
      : 'No winner';
    $('re-award').innerHTML = `Each player gets <b>${money(award)}</b>. Each player also gets credits for their damage to rivals. The last two players alive get a bonus.`;
    $('re-table').className = 'data';
    $('re-table').innerHTML = '<tr><th>Player</th><th>Character</th><th>Damage</th><th>Pay</th><th>Wins</th><th>Money</th></tr>' + tanks.map((t) => {
      const P = t.roundPayParts || { own: 0, bonus: 0 };
      return `<tr class="${t === winner ? 'win' : ''}"><td><span class="dot" style="background:${t.color}"></span>${esc(t.name)}</td>
       <td>${esc(t.vehicle.name)}</td><td>${Math.round(t.roundDealt)}</td><td title="base ${money(award)} · own damage ${money(P.own)} · placement ${money(P.bonus)}">${money(t.roundPay || award)}</td><td>${t.wins}</td><td>${money(t.money)}</td></tr>`;
    }).join('');
    $('re-quips').innerHTML = '';
    $('re-next').textContent = last ? 'Final results ▸' : 'To the shop ▸';
    $('re-end').hidden = last;
    $('roundend').hidden = false;
  },

  addQuip(tank, line, boxId = 're-quips') {
    if (!line) return;
    const d = document.createElement('div');
    d.className = 'quip';
    d.style.borderColor = tank.color;
    d.innerHTML = `<span style="color:${tank.color}">${esc(tank.name)}:</span> “${esc(line)}”`;
    $(boxId).appendChild(d);
  },

  addEndQuip(tank, line) { this.addQuip(tank, line, 'ge-quips'); },

  showShop(tank, done) {
    const g = this.game;
    const render = () => {
      $('shop-title').innerHTML = `<span class="dot" style="background:${tank.color}"></span>${esc(tank.name)}<small>${esc(tank.vehicle.name)}</small>`;
      $('shop-cash').innerHTML = `<span class="mgh">Credits</span><b>${money(tank.money)}</b>`;
      const full = tank.weapons.length >= MAX_WEAPONS;
      if (!g.shopFilterOk(this.shopFilter)) this.shopFilter = 'all';
      const f = this.shopFilter;
      $('shop-filter').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.f === f));
      const sold = g.ownStarters(tank).filter((w) => !tank.weapons.includes(w.id)); // (her own, sold: she can have them back)
      // (what her tier has not unlocked yet stays out of the shop: progress.js)
      $('shop-filter').querySelectorAll('button').forEach((b) => { b.hidden = !g.shopFilterOk(b.dataset.f); });
      const list = [...sold, ...WEAPONS.slice().sort((a, b) => a.cost - b.cost)].filter((w) => forVehicle(w, tank.vehicle.id) && g.itemOk(w)).filter((w) =>
        f === 'all' ? true : f === 'buy' ? !tank.weapons.includes(w.id) && tank.money >= g.costOf(w) : f === 'NXi' ? makerOf(w) === 'NXi' : f === 'hybrid' ? w.hybrid : f === 'Sengoku' ? makerOf(w).includes('Sengoku') : w.kind === f);
      if (f === 'aa') { // air-defence mounts: their own slots
        const freeSlot = aaSlotFor(tank);
        $('shop-grid').innerHTML = AA_WEAPONS.filter((a) => g.itemOk(a)).map((a) => {
          const r = RARITY[a.rarity], owned = tank.aa.includes(a.id), afford = tank.money >= a.cost;
          const can = !owned && freeSlot >= 0 && afford;
          return `<div class="card${owned ? ' owned-w' : ''}">${this.badge(a)}<div class="card-body">
            <span class="maker">${esc(aaMaker(a))} · ${a.role === 'missile' ? 'point defence' : 'anti-air'}</span>
            <h4 style="color:${r.ui}">${esc(a.name)}</h4>
            <p title="${esc(a.long)}">${esc(a.short)}</p>
            <div class="stats">${this.weaponStats(a)}</div>
            <div class="buyrow"><span class="cost${afford || owned ? '' : ' short'}">${money(a.cost)}</span>
            <button data-aa="${a.id}" ${can ? '' : 'disabled'}>${owned ? 'Owned' : freeSlot < 0 ? 'Slots full' : afford ? 'Buy' : 'Need ' + money(a.cost - tank.money)}</button></div></div></div>`;
        }).join('');
        $('shop-grid').querySelectorAll('[data-aa]').forEach((b) => { b.onclick = () => { g.buy(tank, 'aa', b.dataset.aa); render(); }; });
      } else if (f === 'core') { // cores: one slot; a new one replaces hers (refunded in full)
        const cur = coreOf(tank), refund = coreValue(tank);
        $('shop-grid').innerHTML = CORES.filter((C) => g.itemOk(C)).map((C) => {
          const r = RARITY[C.rarity], owned = tank.core === C.id, afford = tank.money + refund >= C.cost;
          return `<div class="card${owned ? ' owned-w' : ''}"><span class="badge" style="--rc:${r.ui}"><b>${r.word[0]}c</b><i>${r.word}</i></span><div class="card-body">
            <span class="maker">Core · ${esc(C.coreLabel)}</span>
            <h4 style="color:${r.ui}">${esc(C.name)}</h4>
            <p>${esc(C.short)}</p>
            <div class="stats"><span>Boost</span><span>+${Math.round(C.boost * 100)}% ${esc(C.coreLabel.toLowerCase())}</span><span>Health</span><span>+${C.hp}</span><span>Armour</span><span>+${C.armour}</span><span>Block</span><span>−${C.block} a hit</span></div>
            <div class="buyrow"><span class="cost${afford || owned ? '' : ' short'}">${money(C.cost)}</span>
            <button data-core="${C.id}" ${!owned && afford ? '' : 'disabled'}>${owned ? 'Fitted' : afford ? (cur ? 'Swap' : 'Buy') : 'Need ' + money(C.cost - tank.money - refund)}</button></div></div></div>`;
        }).join('');
        $('shop-grid').querySelectorAll('[data-core]').forEach((b) => { b.onclick = () => { g.buyCore(tank, b.dataset.core); render(); }; });
      } else $('shop-grid').innerHTML = list.map((w) => {
        const r = RARITY[w.rarity];
        const owned = tank.weapons.includes(w.id);
        const cost = g.costOf(w), afford = tank.money >= cost;
        const can = !owned && !full && afford;
        const maker = makerOf(w);
        const nxi = maker === 'NXi';
        return `<div class="card${nxi ? ' nxi' : ''}${owned ? ' owned-w' : ''}">${this.badge(w)}<div class="card-body">
          ${maker ? `<span class="maker${nxi ? ' nxi' : maker.includes('Sengoku') ? ' sgk' : ''}">${nxi ? 'NXi · November Division' : esc(maker)}</span>` : ''}
          <h4 style="color:${r.ui}">${esc(w.name)}</h4>
          <p title="${esc(w.long)}">${esc(w.short)}</p>
          <div class="stats">${this.weaponStats(w)}</div>
          <div class="buyrow"><span class="cost${afford || owned ? '' : ' short'}">${money(cost)}</span>
          <button data-w="${w.id}" ${can ? '' : 'disabled'}>${owned ? 'Owned' : full ? 'Slots full' : afford ? (w.starter ? 'Buy back' : 'Buy') : 'Need ' + money(cost - tank.money)}</button></div></div></div>`;
      }).join('') || '<div class="none">Nothing here. Try another filter.</div>';
      if (g.prog && PROG.next()) $('shop-grid').insertAdjacentHTML('beforeend', `<div class="none lockline">More items unlock at Tier ${PROG.tier() + 1} (${PROG.next().at} rounds cleared): ${esc(PROG.next().gear)}</div>`);
      $('shop-count').textContent = `${tank.weapons.length}/${MAX_WEAPONS}`;
      $('shop-note').textContent = BALANCE === 'rebalanced'
        ? 'After a bought gun fires, it reloads for 1–3 of your turns (by rarity). Your starting gun never reloads. Planes fly their squads, then rearm; starting planes also rearm. Own several guns to fire a large one every turn.'
        : '';
      $('shop-note').hidden = BALANCE !== 'rebalanced';
      $('shop-owned').innerHTML = tank.weapons.map((id) => {
        const w = WEAPON_BY_ID[id];
        return `<div class="owned">${this.badge(w, true)}<span>${esc(w.name)}</span>
          <button data-s="${id}" ${g.canSell(tank, id) ? '' : 'disabled'} title="Sell">${g.canSell(tank, id) ? 'Sell ' + money(g.sellValue(w)) : 'Last gun'}</button></div>`;
      }).join('');
      $('shop-aa').innerHTML = tank.aa.map((id, i) => {
        const a = AA_BY_ID[id];
        if (!a) return `<div class="owned empty"><span class="badge small" style="--rc:#556"><b>—</b></span><span>Empty AA slot: buy a mount under AA</span></div>`;
        const st = this.game.canSellAA(tank, id);
        return `<div class="owned">${this.badge(a, true)}<span>${esc(a.name)}</span>
          <button data-sa="${id}" ${st ? '' : 'disabled'} title="Sell">${st ? 'Sell ' + money(this.game.aaSellValue(tank, id)) : 'Built-in'}</button></div>`;
      }).join('');
      const myCore = coreOf(tank);
      $('shop-core').innerHTML = myCore
        ? `<div class="coreslot" style="--rc:${RARITY[myCore.rarity].ui}"><span class="badge" style="--rc:${RARITY[myCore.rarity].ui}"><b>${RARITY[myCore.rarity].word[0]}c</b><i>${RARITY[myCore.rarity].word}</i></span>
          <div class="cs-body"><span class="maker">Core · ${esc(myCore.coreLabel)}</span><h4 style="color:${RARITY[myCore.rarity].ui}">${esc(myCore.name)}</h4>
          <div class="stats"><span>Boost</span><span>+${Math.round(myCore.boost * 100)}%</span><span>Block</span><span>−${myCore.block}/hit</span><span>Health</span><span>+${myCore.hp}</span><span>Armour</span><span>+${myCore.armour}</span></div>
          <div class="cs-row"><button data-cf="1">Browse cores</button><button data-sc="1" title="Sell">Sell ${money(coreValue(tank))}</button></div></div></div>`
        : '<div class="coreslot empty"><span class="badge" style="--rc:#556"><b>—</b></span><div class="cs-body"><h4>Empty core slot</h4><p class="note">A core gives health and armour. It reduces the damage of each hit, and it adds damage to its type of gun.</p><div class="cs-row"><button data-cf="1">Browse cores</button></div></div></div>';
      const sc = $('shop-core').querySelector('[data-sc]'); if (sc) sc.onclick = () => { g.sellCore(tank); render(); };
      $('shop-core').querySelector('[data-cf]').onclick = () => { this.shopFilter = 'core'; render(); $('shop-grid').scrollTop = 0; };
      $('shop-aa').querySelectorAll('[data-sa]').forEach((b) => { b.onclick = () => { g.sellAA(tank, b.dataset.sa); render(); }; });
      $('shop-upg').innerHTML = [['hp', 'Health', tank.maxHp], ['armour', 'Armour', tank.maxArmour]].map(([id, label, cur]) => {
        const cost = g.upgradeCost(tank, id);
        return `<div class="upg"><span>${label} <small>${cur} → ${Math.round(cur * 1.3)}</small></span>
          <button data-u="${id}" ${tank.money >= cost ? '' : 'disabled'}>${money(cost)}</button></div>`;
      }).join('') + VEHICLE_UPGRADES.filter((u) => (!u.notFor || !hasTrait(tank, u.notFor)) && (u.id !== 'deck' || g.has('deck'))).map((u) => {
        const lvl = tank.upgrades[u.id] | 0;
        const maxed = lvl >= u.costs.length;
        const cost = u.costs[lvl];
        return `<div class="upg"><span>${esc(u.name)} <small class="lvl">${'■'.repeat(lvl)}${'□'.repeat(u.costs.length - lvl)}</small><br><small>${esc(u.desc)}</small></span>
          <button data-v="${u.id}" ${!maxed && tank.money >= cost ? '' : 'disabled'}>${maxed ? 'Max' : money(cost)}</button></div>`;
      }).join('');
      $('shop-upg').querySelectorAll('[data-v]').forEach((b) => { b.onclick = () => { g.buy(tank, 'vupg', b.dataset.v); render(); }; });
      $('shop-grid').querySelectorAll('[data-w]').forEach((b) => { b.onclick = () => { g.buy(tank, 'weapon', b.dataset.w); render(); }; });
      $('shop-owned').querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => { g.sell(tank, b.dataset.s); render(); }; });
      $('shop-upg').querySelectorAll('[data-u]').forEach((b) => { b.onclick = () => { g.buy(tank, 'upgrade', b.dataset.u); render(); }; });
      $('shop-kits').innerHTML = `<div class="upg"><span>Repair kit <small class="lvl">${'■'.repeat(tank.kits)}${'□'.repeat(Math.max(0, REPAIR_MAX - tank.kits))}</small><br>
        <small>Restores ${Math.round(REPAIR_FRAC * 100)}% of health and armour, health first. Press R to use one. It uses your turn.</small></span>
        <button data-k="1" ${tank.kits < REPAIR_MAX && tank.money >= REPAIR_COST ? '' : 'disabled'}>${money(REPAIR_COST)}</button></div>`;
      $('shop-kits').querySelector('[data-k]').onclick = () => { g.buy(tank, 'kit'); render(); };
      $('shop-abil').innerHTML = ABILITIES.map((a) => {
        const owned = tank.abilities[a.id] > 0;
        const locked = !g.abilityUnlocked(tank, a), tierLocked = !g.abilityTierOk(a);
        const cost = g.abilityCost(tank, a);
        return `<div class="upg"><span>${esc(a.name)} <small class="lvl">[${a.key}]</small><br>
        <small>${esc(a.desc)} Recharges in ${a.cd} turns.</small></span>
        <button data-a="${a.id}" ${!owned && !locked && tank.money >= cost ? '' : 'disabled'}>${owned ? 'Owned' : tierLocked ? `Tier ${FEAT_TIER[a.id === 'barrier' ? 'barrier' : 'abilities']}` : locked ? 'Late game' : money(cost)}</button></div>`;
      }).join('');
      $('shop-abil').querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => { g.buy(tank, 'ability', b.dataset.a); render(); }; });
    };
    $('shop-filter').querySelectorAll('button').forEach((b) => { b.onclick = () => { this.shopFilter = b.dataset.f; render(); $('shop-grid').scrollTop = 0; }; });
    render();
    $('shop-done').onclick = done;
    $('shop').hidden = false;
  },

  hideShop() { $('shop').hidden = true; },

  showGameEnd(st) {
    const champ = st[0];
    const tie = st[1] && st[1].wins === champ.wins;
    $('ge-quips').innerHTML = '';
    $('ge-title').innerHTML = tie ? 'A draw' : `<span style="color:${champ.color}">${esc(champ.name)}</span> wins the match`;
    if (!tie) {
      const q = document.createElement('div');
      q.className = 'quip';
      q.classList.add('lore');
      q.textContent = STORY.ending(champ);
      $('ge-quips').appendChild(q);
    }
    $('ge-table').className = 'data';
    $('ge-table').innerHTML = '<tr><th>#</th><th>Player</th><th>Rounds</th><th>Kills</th><th>Damage</th><th>Money</th></tr>' + st.map((t, i) =>
      `<tr class="${i === 0 ? 'win' : ''}"><td>${i + 1}</td><td><span class="dot" style="background:${t.color}"></span>${esc(t.name)}</td>
       <td>${t.wins}</td><td>${t.stats.kills}</td><td>${Math.round(t.stats.dealt)}</td><td>${money(t.money)}</td></tr>`).join('');
    $('gameend').hidden = false;
    this.game.sfx.win();
    this.game.sfx.music('shop');
  },
};
