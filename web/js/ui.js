'use strict';
// DOM layer: menu, HUD, shop, round/game summaries and the LLM settings box.

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TYPE_LABELS = { human: 'Human', easy: 'CPU · Easy', normal: 'CPU · Normal', hard: 'CPU · Hard', llm: 'CPU · LLM' };

const UI = {
  game: null,
  players: [],
  hudKey: '',
  weaponKey: '',
  last: {},

  init(game) {
    this.game = game;
    game.ui = this;
    this.players = [
      { name: 'Player 1', type: 'human' },
      { name: AI_NAMES[0], type: 'normal' },
    ];
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
    $('start').onclick = () => this.startMatch();
    $('re-next').onclick = () => { $('roundend').hidden = true; game.afterRoundEnd(); };
    $('ge-again').onclick = () => { $('gameend').hidden = true; game.phase = 'menu'; $('menu').hidden = false; game.newEnvironment(); };
    $('resume').onclick = () => game.togglePause();
    $('btn-pause').onclick = () => game.togglePause();
    $('btn-mute').onclick = () => game.toggleMute();
    this.syncMute();
    this.initLlmBox();
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
        this.llmStatus();
      };
      box.appendChild(row);
    });
    this.llmStatus();
  },

  startMatch() {
    const seen = new Set();
    const cfgs = this.players.map((p, i) => {
      let name = (p.name || '').trim() || `Player ${i + 1}`;
      while (seen.has(name)) name += '′';
      seen.add(name);
      return { name, type: p.type };
    });
    this.game.startMatch(cfgs, +$('rounds').value);
  },

  initLlmBox() {
    const cfg = LlmBrain.load();
    $('llm-key').value = cfg.key;
    $('llm-model').value = cfg.model;
    $('llm-base').value = cfg.base;
    $('llm-taunts').checked = cfg.taunts;
    const read = () => ({ key: $('llm-key').value.trim(), model: $('llm-model').value.trim() || 'gpt-5-mini', base: $('llm-base').value.trim() || 'https://api.openai.com/v1', taunts: $('llm-taunts').checked });
    const msg = (t, cls = '') => { $('llm-msg').textContent = t; $('llm-msg').className = 'note ' + cls; };
    $('llm-save').onclick = () => { LlmBrain.save(read()); msg('Saved to this browser.', 'ok'); this.llmStatus(); };
    $('llm-forget').onclick = () => {
      LlmBrain.save({ ...read(), key: '' });
      $('llm-key').value = '';
      msg('Key removed from this browser.', 'ok');
      this.llmStatus();
    };
    $('llm-test').onclick = async () => {
      LlmBrain.save(read());
      msg('Asking…');
      try {
        const d = await LlmBrain.chat([{ role: 'user', content: 'Reply with {"reply":"ready"} as JSON.' }],
          { type: 'object', additionalProperties: false, required: ['reply'], properties: { reply: { type: 'string' } } }, 20000);
        msg('Connected: ' + JSON.stringify(d), 'ok');
      } catch (e) {
        const hint = /Failed to fetch|NetworkError|Load failed/i.test(e.message) ? ' (network or CORS: browsers may block direct calls; point Base URL at a proxy)' : '';
        msg('Failed: ' + e.message + hint, 'err');
      }
      this.llmStatus();
    };
  },

  llmStatus() {
    const anyLlm = this.players.some((p) => p.type === 'llm');
    const on = LlmBrain.enabled();
    $('llm-badge').textContent = on ? '· key saved' : anyLlm ? '· no key: LLM players will play as hard CPUs' : '';
    const el = $('llmstat');
    if (LlmBrain.lastError && this.game && this.game.tanks.some((t) => t.type === 'llm')) {
      el.hidden = false;
      el.textContent = 'LLM uplink: ' + LlmBrain.lastError;
    } else el.hidden = true;
  },

  // ------------------------------------------------------------ HUD
  showHud(on) {
    $('hud').hidden = !on;
    if (on) $('menu').hidden = true;
    this.hudKey = this.weaponKey = '';
    $('chat').innerHTML = '';
    this.llmStatus();
  },

  syncMute() { $('btn-mute').textContent = this.game.sfx.muted ? '✕' : '♪'; },
  showPause(on) { $('pause').hidden = !on; },

  turn(t) {
    const g = this.game;
    $('turn').innerHTML = `<span class="dot" style="background:${t.color}"></span>${esc(t.name)}${g.phase === 'resolve' ? '' : "'s turn"}`;
    if (g.phase === 'aim') {
      const b = $('banner');
      b.textContent = `${t.name}${t.isCpu ? ' is thinking…' : ', your move'}`;
      b.style.color = t.color;
      b.classList.remove('show');
      void b.offsetWidth;
      b.classList.add('show');
    }
  },

  chat(tank, text) {
    const d = document.createElement('div');
    d.style.borderColor = tank.color;
    d.innerHTML = `<b style="color:${tank.color}">${esc(tank.name)}</b> ${esc(text)}`;
    const box = $('chat');
    box.appendChild(d);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => d.remove(), 14000);
  },

  updateHud(g) {
    if ($('hud').hidden) return;
    const key = g.tanks.map((t) => [Math.ceil(t.hp), Math.round(t.cash), t.wins, t.alive, t === g.active].join()).join('|') + g.round;
    if (key !== this.hudKey) {
      this.hudKey = key;
      $('roster').innerHTML = g.tanks.map((t) => `<div class="chip${t === g.active ? ' active' : ''}${t.alive ? '' : ' dead'}">
        <span class="dot" style="background:${t.color};margin:0"></span><span class="nm">${esc(t.name)}</span>
        <span class="meta">$${Math.round(t.cash)} ${'★'.repeat(t.wins)}</span>
        <div class="hpbar"><i style="width:${(100 * Math.max(0, t.hp)) / t.maxHp}%"></i></div></div>`).join('');
      $('roundinfo').textContent = `Round ${g.round}/${g.rounds}`;
    }
    const w = g.wind * 1000;
    const arrows = Math.min(4, Math.ceil(Math.abs(w) / 3));
    this.set('wind-arrow', Math.abs(w) < 0.4 ? '·' : (w > 0 ? '▶' : '◀').repeat(arrows));
    this.set('wind-val', `wind ${Math.abs(w).toFixed(1)}`);

    const t = g.active;
    if (!t) return;
    this.set('a-elev', Math.round(t.elev) + '°');
    $('a-power').style.width = t.power + '%';
    $('a-last').style.left = t.lastPower + '%';
    $('a-last').style.display = t.lastPower > 0 && !t.isCpu ? '' : 'none';
    $('a-fuel').style.width = (100 * t.fuel) / t.maxFuel + '%';
    $('a-hp').style.width = (100 * Math.max(0, t.hp)) / t.maxHp + '%';

    const wk = t.name + t.weaponId + WEAPONS.map((x) => t.ammo[x.id]).join() + g.phase;
    if (wk !== this.weaponKey) {
      this.weaponKey = wk;
      const bar = $('weaponbar');
      bar.innerHTML = '';
      t.ownedWeapons().forEach((wp, i) => {
        const d = document.createElement('div');
        d.className = 'wslot' + (wp.id === t.weaponId ? ' sel' : '');
        d.innerHTML = `<kbd>${i + 1}</kbd>${esc(wp.name.replace(/^\d+mm\s*/, ''))}<small>${wp.infinite ? '∞' : '×' + t.ammo[wp.id]} · ${wp.tag}</small>`;
        d.onclick = () => { if (g.phase === 'aim' && !t.isCpu) { t.selectWeapon(wp.id); g.sfx.click(); } };
        bar.appendChild(d);
      });
    }
  },

  set(id, text) {
    if (this.last[id] !== text) { this.last[id] = text; $(id).textContent = text; }
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
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); g.input.queue.push({ cycle: +b.dataset.q }); });
    });
  },

  // ------------------------------------------------------------ round / shop / end
  showRoundEnd({ round, winner, tanks }, last) {
    $('re-title').innerHTML = winner
      ? `Round ${round}: <span style="color:${winner.color}">${esc(winner.name)}</span> wins`
      : `Round ${round}: mutual destruction`;
    $('re-table').className = 'data';
    $('re-table').innerHTML = `<tr><th>Tank</th><th>Damage</th><th>Earned</th><th>Wins</th><th>Cash</th></tr>` + tanks.map((t) =>
      `<tr class="${t === winner ? 'win' : ''}"><td><span class="dot" style="background:${t.color}"></span>${esc(t.name)}</td>
       <td>${Math.round(t.roundDealt)}</td><td>+$${Math.round(t.roundEarned)}</td><td>${t.wins}</td><td>$${Math.round(t.cash)}</td></tr>`).join('');
    $('re-quips').innerHTML = '';
    $('re-next').textContent = last ? 'Final results' : 'To the shop';
    $('roundend').hidden = false;
  },

  addQuip(tank, line) {
    if ($('roundend').hidden) return;
    const d = document.createElement('div');
    d.className = 'quip';
    d.style.borderColor = tank.color;
    d.innerHTML = `<b style="color:${tank.color}">${esc(tank.name)}:</b> “${esc(line)}”`;
    $('re-quips').appendChild(d);
  },

  showShop(tank, done) {
    const g = this.game;
    const render = () => {
      $('shop-title').innerHTML = `<span class="dot" style="background:${tank.color}"></span>${esc(tank.name)}'s shop`;
      $('shop-cash').textContent = '$' + Math.round(tank.cash);
      const stat = (label, v, max) => `<div class="stat">${label}<i style="width:${clamp((100 * v) / max, 4, 100)}%"></i></div>`;
      $('shop-grid').innerHTML = WEAPONS.filter((w) => w.cost > 0).map((w) => {
        const dmg = w.kind === 'cluster' ? w.sub.dmg * w.sub.count : w.dmg;
        const blast = w.kind === 'cluster' ? w.sub.blast : w.blast || w.beamHalf;
        return `<div class="card"><span class="tag">${w.tag}</span><h3>${esc(w.name)}</h3><p>${esc(w.desc)}</p>
          ${stat('Damage', dmg, 150)}${stat('Blast', blast, 60)}${stat('Wind', w.wind * 100, 100)}
          <div class="buyrow"><span class="owned">${tank.ammo[w.id] ? 'owned ×' + tank.ammo[w.id] : ''}</span>
          <button data-w="${w.id}" ${tank.cash < w.cost ? 'disabled' : ''}>+${w.pack} · $${w.cost}</button></div></div>`;
      }).join('');
      $('shop-upg').innerHTML = UPGRADES.map((u) => {
        const lv = tank.upgrades[u.id];
        return `<div class="card"><h3>${u.name} <small>lv ${lv}/${u.max}</small></h3><p>${u.desc}</p>
          <div class="buyrow"><span></span><button data-u="${u.id}" ${tank.cash < u.cost || lv >= u.max ? 'disabled' : ''}>${lv >= u.max ? 'maxed' : '$' + u.cost}</button></div></div>`;
      }).join('');
      $('shop-grid').querySelectorAll('[data-w]').forEach((b) => { b.onclick = () => { g.buy(tank, 'weapon', b.dataset.w); render(); }; });
      $('shop-upg').querySelectorAll('[data-u]').forEach((b) => { b.onclick = () => { g.buy(tank, 'upgrade', b.dataset.u); render(); }; });
    };
    render();
    $('shop-done').onclick = done;
    $('shop').hidden = false;
  },

  hideShop() { $('shop').hidden = true; },

  showGameEnd(st) {
    const champ = st[0];
    const tie = st[1] && st[1].wins === champ.wins && st[1].cash === champ.cash;
    $('ge-title').innerHTML = tie ? 'A draw' : `<span style="color:${champ.color}">${esc(champ.name)}</span> takes the match`;
    $('ge-table').className = 'data';
    $('ge-table').innerHTML = `<tr><th>#</th><th>Tank</th><th>Rounds</th><th>Kills</th><th>Damage</th><th>Cash</th></tr>` + st.map((t, i) =>
      `<tr class="${i === 0 ? 'win' : ''}"><td>${i + 1}</td><td><span class="dot" style="background:${t.color}"></span>${esc(t.name)}</td>
       <td>${t.wins}</td><td>${t.stats.kills}</td><td>${Math.round(t.stats.dealt)}</td><td>$${Math.round(t.cash)}</td></tr>`).join('');
    $('gameend').hidden = false;
    this.game.sfx.win();
  },
};
