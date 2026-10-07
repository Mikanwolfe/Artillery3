'use strict';
// DOM layer: menu, character select, shop, round/game summaries and the small HUD bits.
// Most of the in-game HUD (labels, minimap, wind, charge/fuel bars) is drawn on the canvas.

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TYPE_LABELS = { human: 'Human', easy: 'CPU · Easy', normal: 'CPU · Normal', hard: 'CPU · Hard' };
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

const UI = {
  game: null,
  players: [],
  last: {},

  init(game) {
    this.game = game;
    game.ui = this;
    this.players = [
      { name: 'Player 1', type: 'human' },
      { name: 'Ace', type: 'normal' },
      { name: 'Rookie', type: 'easy' },
      { name: 'Sarge', type: 'hard' },
    ];
    // build stamp: the short git hash, written into js/version.js when the site is published
    const v = $('version');
    v.textContent = A3_VERSION === 'dev' ? 'dev build' : `build ${A3_VERSION}`;
    if (A3_VERSION !== 'dev') v.href = `https://github.com/Mikanwolfe/Artillery3/commit/${A3_VERSION}`;
    this.renderPlayers();
    $('add-player').onclick = () => {
      if (this.players.length >= 4) return;
      this.players.push({ name: AI_NAMES[this.players.length % AI_NAMES.length], type: 'normal' });
      this.renderPlayers();
    };
    $('rem-player').onclick = () => {
      if (this.players.length <= 2) return;
      this.players.pop();
      this.renderPlayers();
    };
    $('start').onclick = () => this.selectVehicles();
    $('load').onclick = () => {
      const d = Game.readSave();
      if (d) { $('menu').hidden = true; this.game.loadMatch(d); }
    };
    this.syncLoad();
    $('re-next').onclick = () => { $('roundend').hidden = true; game.afterRoundEnd(); };
    $('ge-again').onclick = () => { $('gameend').hidden = true; game.sfx.music('shop'); game.phase = 'menu'; $('menu').hidden = false; game.newEnvironment(); this.syncLoad(); };
    $('resume').onclick = () => game.togglePause();
    $('pause-end').onclick = () => game.endMatch();
    $('re-end').onclick = () => { $('roundend').hidden = true; game.endMatch(); };
    $('btn-pause').onclick = () => game.togglePause();
    $('btn-mute').onclick = () => game.toggleMute();
    $('btn-music').onclick = () => game.toggleMusic();
    // A3 UI_Button: a hover blip over buttons and a confirm click (shop buttons have their own sounds)
    const stage = $('stage');
    stage.addEventListener('pointerover', (e) => {
      const b = e.target.closest && e.target.closest('button, .veh');
      if (b && !b.disabled && !b.closest('#touch') && !b.contains(e.relatedTarget)) game.sfx.hover();
    });
    stage.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('.primary, #add-player, #rem-player, #load');
      if (b && !b.disabled) game.sfx.confirm();
    });
    this.syncMute();
    this.initTouch();
    window.addEventListener('keydown', (e) => {
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
        <select aria-label="Player ${i + 1} type">${Object.entries(TYPE_LABELS).map(([k, v]) => `<option value="${k}"${k === p.type ? ' selected' : ''}>${v}</option>`).join('')}</select>`;
      row.querySelector('input').oninput = (e) => { p.name = e.target.value; };
      row.querySelector('select').onchange = (e) => {
        p.type = e.target.value;
        if (p.type !== 'human' && /^Player \d$/.test(p.name)) { p.name = AI_NAMES[i % AI_NAMES.length]; this.renderPlayers(); }
      };
      box.appendChild(row);
    });
  },

  configs() {
    const seen = new Set();
    return this.players.map((p, i) => {
      let name = (p.name || '').trim() || `Player ${i + 1}`;
      while (seen.has(name)) name += '′';
      seen.add(name);
      return { name, type: p.type, vehicle: null };
    });
  },

  // A3 "Select a Character": each human picks a vehicle in turn; CPUs pick at random
  selectVehicles() {
    this.game.sfx.unlock();
    const cfgs = this.configs();
    for (const c of cfgs) if (c.type !== 'human') c.vehicle = rng.pick(VEHICLES).id;
    const queue = cfgs.filter((c) => c.type === 'human');
    const next = () => {
      const c = queue.shift();
      if (!c) { $('vehicles').hidden = true; this.game.startMatch(cfgs, +$('rounds').value, { balance: $('balance').value, events: $('events').value === 'on', map: $('map').value }); return; }
      $('menu').hidden = true;
      $('vehicles').hidden = false;
      $("veh-player").textContent = `${c.name}:`;
      $('veh-grid').innerHTML = VEHICLES.map((v) => {
        const w = v.weapon;
        return `<div class="veh" data-v="${v.id}"><canvas class="girl" width="160" height="150" data-g="${v.id}"></canvas><h3>${esc(v.name)}</h3><p>${esc(v.blurb)}</p>
          <div class="stats"><span>Health</span><span>${v.hp}</span><span>Armour</span><span>${v.armour}</span></div>
          <div class="veh-wpn">${this.badge(w, true)}<h3 style="font-size:1em;color:${RARITY[w.rarity].color}">${esc(w.name)}</h3></div><p>${esc(w.short)}</p>
          <div class="stats">${this.weaponStats(w)}</div></div>`;
      }).join('');
      // portraits: each turret girl in the player's colour, holding her starting gun
      const col = PLAYER_COLORS[cfgs.indexOf(c) % PLAYER_COLORS.length];
      $('veh-grid').querySelectorAll('canvas.girl').forEach((cv) => {
        const g = cv.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.scale(2.5, 2.5);
        const v = VEHICLES.find((x) => x.id === cv.dataset.g);
        const o = { id: v.id, x: 32, y: 56, facing: 1, color: col, state: 'ok', t: 0, walking: false, flash: 0 };
        drawGirl(g, o);
        const a = GIRL_ART[v.id] || GIRL_ART.gwt;
        drawGun(g, v.weapon, { x: o.x + a.pivot[0], y: o.y + a.pivot[1] }, { x: Math.cos(rad(30)), y: -Math.sin(rad(30)) }, 1, 0, shade(col, -0.5), 0);
        drawGirlMount(g, o);
      });
      $('veh-grid').querySelectorAll('.veh').forEach((el) => {
        el.onclick = () => { c.vehicle = el.dataset.v; this.game.sfx.confirm(); next(); };
      });
    };
    next();
  },

  // the original shop's badge: a square outlined in the rarity colour, two big letters and the word
  badge(w, small = false) {
    const r = RARITY[w.rarity];
    return `<span class="badge${small ? ' small' : ''}" style="--rc:${r.color}"><b>${badgeText(w)}</b>${small ? '' : `<i>${r.word}</i>`}</span>`;
  },

  weaponStats(w) {
    const rows = [['Damage', w.dmg], ['Radius', w.dmgR], ['Range', w.maxCharge], ['Spread', w.disp]];
    if (w.clip > 1) rows.push(['Autoloader', w.clip]);
    if (w.salvo > 1) rows.push(['Rounds', w.salvo]);
    rows.push(['Elevation', `${w.elevMin}°…${w.elevMax}°`]);
    if (w.sat) rows.push(['Satellite', 'MAIA']);
    if (w.kind !== 'shell') rows.push(['Type', w.kind[0].toUpperCase() + w.kind.slice(1)]);
    return rows.map(([k, v]) => `<span>${k}</span><span>${v}</span>`).join('');
  },

  // ------------------------------------------------------------ HUD
  showHud(on) {
    $('hud').hidden = !on;
    if (on) $('menu').hidden = true;
    $('chat').innerHTML = '';
    this.last = {};
  },

  syncMute() {
    $('btn-mute').textContent = this.game.sfx.muted ? '✕' : '♪';
    $('btn-music').classList.toggle('off', !this.game.sfx.musicOn);
  },
  showPause(on) { $('pause').hidden = !on; },

  turn(t) {
    const g = this.game;
    $('turn').innerHTML = `<span class="dot" style="background:${t.color}"></span>${esc(t.name)}`;
    if (g.phase === 'aim' && !t.firedThisTurn) {
      const b = $('banner');
      b.textContent = `${t.name}${t.isCpu ? '' : ', your move'}`;
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

  // a system line in the chat log (no speaker)
  notice(text) {
    const d = document.createElement('div');
    d.style.borderColor = '#5b4a8a';
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

  updateHud(g) {
    if ($('hud').hidden) return;
    const r = `Round ${g.round}${g.rounds ? '/' + g.rounds : ''}`;
    if (this.last.r !== r) { this.last.r = r; $('roundinfo').textContent = r; }
  },

  initTouch() {
    const g = this.game;
    document.querySelectorAll('#touch [data-k]').forEach((b) => {
      const k = b.dataset.k;
      const set = (v) => (e) => { e.preventDefault(); g.sfx.unlock(); g.input.ctl[k] = v; };
      b.addEventListener('pointerdown', set(true));
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, set(false)));
    });
    document.querySelectorAll('#touch [data-q]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); g.input.queue.push({ cycle: 1 }); });
    });
    document.querySelectorAll('#touch [data-rep]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (g.phase === 'aim') g.input.queue.push({ repair: true }); });
    });
    document.querySelectorAll('#touch [data-ab]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (g.phase === 'aim') g.input.queue.push({ ability: b.dataset.ab }); });
    });
    document.querySelectorAll('#touch [data-end]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (g.phase === 'aim') g.input.queue.push({ endTurn: true }); });
    });
  },

  // ------------------------------------------------------------ round / shop / end
  showRoundEnd({ round, winner, tanks, award }, last) {
    $('re-title').innerHTML = winner
      ? `Round ${round}: <span style="color:${winner.color}">${esc(winner.name)}</span> wins`
      : `Round ${round}: mutual destruction`;
    $('re-award').textContent = `Everyone is paid ${money(award)} for this round.`;
    $('re-table').className = 'data';
    $('re-table').innerHTML = '<tr><th>Tank</th><th>Vehicle</th><th>Damage</th><th>Wins</th><th>Money</th></tr>' + tanks.map((t) =>
      `<tr class="${t === winner ? 'win' : ''}"><td><span class="dot" style="background:${t.color}"></span>${esc(t.name)}</td>
       <td>${esc(t.vehicle.name)}</td><td>${Math.round(t.roundDealt)}</td><td>${t.wins}</td><td>${money(t.money)}</td></tr>`).join('');
    $('re-quips').innerHTML = '';
    $('re-next').textContent = last ? 'final results' : 'to the shop';
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
      $('shop-title').innerHTML = `<span class="dot" style="background:${tank.color}"></span>${esc(tank.name)} | ${esc(tank.vehicle.name)}`;
      $('shop-cash').textContent = 'Money : ' + money(tank.money);
      const full = tank.weapons.length >= 4;
      $('shop-grid').innerHTML = WEAPONS.slice().sort((a, b) => a.cost - b.cost).map((w) => {
        const r = RARITY[w.rarity];
        const owned = tank.weapons.includes(w.id);
        const can = !owned && !full && tank.money >= w.cost;
        return `<div class="card">${this.badge(w)}<div class="card-body">
          <h4 style="color:${r.color}">${esc(w.name)}</h4>
          <p>${esc(w.short)}</p><p><i>${esc(w.long)}</i></p>
          <div class="stats">${this.weaponStats(w)}</div>
          <div class="buyrow"><span class="cost">Price: ${money(w.cost)}</span>
          <button data-w="${w.id}" ${can ? '' : 'disabled'}>${owned ? 'owned' : full ? 'slots full' : 'buy'}</button></div></div></div>`;
      }).join('');
      $('shop-count').textContent = `(${tank.weapons.length}/4)`;
      $('shop-owned').innerHTML = tank.weapons.map((id) => {
        const w = WEAPON_BY_ID[id];
        return `<div class="owned">${this.badge(w, true)}<span>${esc(w.name)}</span>
          <button data-s="${id}" ${tank.weapons.length > 1 ? '' : 'disabled'}>sell ${money(g.sellValue(w))}</button></div>`;
      }).join('');
      $('shop-upg').innerHTML = [['hp', 'Health++', tank.maxHp], ['armour', 'Armour++', tank.maxArmour]].map(([id, label, cur]) => {
        const cost = g.upgradeCost(tank, id);
        return `<div class="upg"><span>${label}<br><small>${cur} &gt;&gt; ${Math.round(cur * 1.3)}</small></span>
          <button data-u="${id}" ${tank.money >= cost ? '' : 'disabled'}>${money(cost)}</button></div>`;
      }).join('') + VEHICLE_UPGRADES.map((u) => {
        const lvl = tank.upgrades[u.id] | 0;
        const maxed = lvl >= u.costs.length;
        const cost = u.costs[lvl];
        return `<div class="upg"><span>${esc(u.name)} <small>(${lvl}/${u.costs.length})</small><br><small>${esc(u.desc)}</small></span>
          <button data-v="${u.id}" ${!maxed && tank.money >= cost ? '' : 'disabled'}>${maxed ? 'max' : money(cost)}</button></div>`;
      }).join('');
      $('shop-upg').querySelectorAll('[data-v]').forEach((b) => { b.onclick = () => { g.buy(tank, 'vupg', b.dataset.v); render(); }; });
      $('shop-grid').querySelectorAll('[data-w]').forEach((b) => { b.onclick = () => { g.buy(tank, 'weapon', b.dataset.w); render(); }; });
      $('shop-owned').querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => { g.sell(tank, b.dataset.s); render(); }; });
      $('shop-upg').querySelectorAll('[data-u]').forEach((b) => { b.onclick = () => { g.buy(tank, 'upgrade', b.dataset.u); render(); }; });
      $('shop-kits').innerHTML = `<div class="upg"><span>Repair kit <small>(${tank.kits}/${REPAIR_MAX})</small><br>
        <small>Restores ${Math.round(REPAIR_FRAC * 100)}% health and armour. Using one (R) takes your turn.</small></span>
        <button data-k="1" ${tank.kits < REPAIR_MAX && tank.money >= REPAIR_COST ? '' : 'disabled'}>${money(REPAIR_COST)}</button></div>`;
      $('shop-kits').querySelector('[data-k]').onclick = () => { g.buy(tank, 'kit'); render(); };
      $('shop-abil').innerHTML = ABILITIES.map((a) => {
        const owned = tank.abilities[a.id] > 0;
        return `<div class="upg"><span>${esc(a.name)} <small>(key ${a.key})</small><br>
        <small>${esc(a.desc)} Recharges in ${a.cd} turns; ready at the start of every round.</small></span>
        <button data-a="${a.id}" ${!owned && tank.money >= a.cost ? '' : 'disabled'}>${owned ? 'owned' : money(a.cost)}</button></div>`;
      }).join('');
      $('shop-abil').querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => { g.buy(tank, 'ability', b.dataset.a); render(); }; });
    };
    render();
    $('shop-done').onclick = done;
    $('shop').hidden = false;
  },

  hideShop() { $('shop').hidden = true; },

  showGameEnd(st) {
    const champ = st[0];
    const tie = st[1] && st[1].wins === champ.wins;
    $('ge-quips').innerHTML = '';
    $('ge-title').innerHTML = tie ? 'A draw' : `<span style="color:${champ.color}">${esc(champ.name)}</span> takes the match`;
    $('ge-table').className = 'data';
    $('ge-table').innerHTML = '<tr><th>#</th><th>Tank</th><th>Rounds</th><th>Kills</th><th>Damage</th><th>Money</th></tr>' + st.map((t, i) =>
      `<tr class="${i === 0 ? 'win' : ''}"><td>${i + 1}</td><td><span class="dot" style="background:${t.color}"></span>${esc(t.name)}</td>
       <td>${t.wins}</td><td>${t.stats.kills}</td><td>${Math.round(t.stats.dealt)}</td><td>${money(t.money)}</td></tr>`).join('');
    $('gameend').hidden = false;
    this.game.sfx.win();
    this.game.sfx.music('shop');
  },
};
