'use strict';
// The arena screen: plays a Battle's events back as animation on the console, and takes your turns.

const Fight = {
  b: null, A: null, T: null, busy: false, active: false, raf: 0, disp: null, used: null,

  start(mode) {
    const s = UI.save;
    if (s.pendingPerk) return Hub.perkPick();
    this.b = startFight(s, mode);
    this.used = new Set();
    this.active = true;
    UI.show('battle');
    document.body.classList.add('in-battle');
    const T = this.T = new Term($('arena-cv'));
    const A = this.A = new Arena(T);
    this.fit();
    this._fit = () => this.fit();
    window.addEventListener('resize', this._fit);
    const e = this.b.e;
    const info = floorInfo(e.floor);
    const aura = e.affixes.includes('ascended') ? '#ffd866' : e.affixes.includes('gilded') ? '#f2c45a' : e.kind === 'elite' ? '#ff5a7a' : e.boss ? '#ff3355' : null;
    A.setFighters({ art: ART[CLASSES[s.cls].art] }, { art: ART[e.id], aura });
    if (e.affixes.includes('spectral')) A.fighters.e.a = 0.6;
    A.backdrop = makeBackdrop(info.sIdx, T.cols);
    this.disp = { php: this.b.p.hp, pmp: this.b.p.mp, psh: 0, ehp: e.hp, esh: e.shield, show: { php: this.b.p.hp, pmp: this.b.p.mp, ehp: e.hp } };
    $('battle-log').innerHTML = '';
    if (info.step === 1 && mode === 'climb') this.log(`<span style="color:${info.stratum.color}">${esc(stratumName(info))}.</span> ${esc(info.stratum.intro)}`);
    this.log(`<b>${esc(e.name)}</b> ${e.boss ? 'bars the way.' : 'appears.'}${e.affixes.length ? ` <span class="dim">${e.affixes.map((a) => AFFIXES[a].name + ': ' + AFFIXES[a].desc).join(' ')}</span>` : ''}`);
    A.banner = { text: mode === 'train' ? `Training · ${e.baseName}` : e.boss ? `Floor ${e.floor} · ${e.baseName}` : `Floor ${e.floor} · ${stratumName(info)}`, color: e.boss ? '#ff5a7a' : '#7fe3ff', life: 2.2 };
    s.codex = s.codex || {};
    (s.codex[e.id] = s.codex[e.id] || { seen: 0, kills: 0 }).seen++;
    if (e.boss) SFX.play('phase');
    this.renderBar();
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      A.update(dt * FX.speed);
      for (const k of ['php', 'pmp', 'ehp']) this.disp.show[k] = lerp(this.disp.show[k], this.disp[k], Math.min(1, dt * 10));
      A.draw((T2) => this.hud(T2));
      T.render();
      this.raf = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(loop);
    const first = this.b.flush();
    if (first.length) { this.busy = true; this.play(first).then(() => { this.busy = false; this.renderBar(); }); }
  },
  fit() {
    const T = this.T;
    const wrap = $('arena-wrap');
    const W = wrap.clientWidth - 12;
    const cols = W >= 820 ? 100 : 72;
    const rows = 32;
    const short = innerHeight <= 520;
    const availH = Math.max(200, innerHeight - (short ? 0 : ($('topbar').offsetHeight || 40)) - (short ? 92 : innerWidth < 900 ? 230 : 190));
    const cw = Math.min(W / cols, availH / (rows * 1.98));
    T.setSize(cols, rows);
    $('arena-cv').style.width = (cw * cols) + 'px';
    $('arena-cv').style.margin = '0 auto';
    T.resize(cw * cols);
    if (this.A) { this.A.layout(); if (this.b) this.A.backdrop = makeBackdrop(floorInfo(this.b.e.floor).sIdx, T.cols); }
  },
  stop() {
    this.active = false;
    document.body.classList.remove('in-battle');
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._fit);
  },

  // ------------------------------------------------------------------ the console HUD
  hud(T) {
    const b = this.b, A = this.A, s = UI.save;
    if (!b) return;
    const st = b.stats(), e = b.e;
    const G = A.GROUND;
    const W = T.cols >= 90 ? 30 : 15;
    const bar = (x, y, label, v, max, col, w = W) => {
      const n = Math.max(0, Math.round(w * clamp(v / Math.max(1, max), 0, 1)));
      T.text(x, y, label, DIM);
      T.put(x + 3, y, '[', DIM);
      for (let i = 0; i < w; i++) T.put(x + 4 + i, y, i < n ? '#' : '.', i < n ? col : '#3a3550', { a: i < n ? 1 : 0.8 });
      T.put(x + 4 + w, y, ']', DIM);
      T.text(x + 6 + w, y, `${fmt(Math.max(0, v))}/${fmt(max)}`, INK);
    };
    // header
    T.text(1, 0, b.mode === 'train' ? 'TRAINING' : `FLOOR ${e.floor}`, '#7fe3ff');
    const rt = `ROUND ${b.round}`;
    T.text(T.cols - rt.length - 1, 0, rt, b.round > ENRAGE_ROUND ? '#ff5a7a' : DIM);
    // player block
    const px = 1, ex = T.cols >= 90 ? 52 : 37;
    T.text(px, G + 2, `+ ${s.name}`, '#ffffff', { bold: true });
    T.text(px + s.name.length + 3, G + 2, ` ${CLASSES[s.cls].name}`, DIM);
    bar(px, G + 3, 'HP', this.disp.show.php, st.hpMax, this.disp.php < st.hpMax * 0.25 ? '#ff6a6a' : '#7fe08a');
    bar(px, G + 4, 'MP', this.disp.show.pmp, st.mpMax, '#6fa8ff');
    let line = G + 5, x = px;
    const tags = [];
    if (this.disp.psh > 0) tags.push([`shield ${fmt(this.disp.psh)}`, '#ffd866']);
    if (b.p.guard) tags.push(['GUARD', '#9fd8ff']);
    for (const bf of b.p.buffs) tags.push([`${bf.name} ${bf.turns}`, '#c3b0ff']);
    for (const ss of b.p.statuses) tags.push([`${STATUS_INFO[ss.id].name}${ss.id === 'poison' ? ' x' + ss.stacks : ''} ${ss.id === 'stun' ? '' : ss.turns}`.trim(), STATUS_INFO[ss.id].color]);
    for (const [t, c] of tags) { if (x + t.length > ex - 2) { line++; x = px; } if (line > T.rows - 1) break; T.text(x, line, t, c); x += t.length + 2; }
    // enemy block
    T.text(ex, G + 2, `- ${e.name}`.slice(0, T.cols - ex - 1), e.boss ? '#ff5a7a' : '#ffb0a0', { bold: true });
    bar(ex, G + 3, 'HP', this.disp.show.ehp, e.hpMax, e.boss ? '#ff5a7a' : '#ff8a6a', Math.min(W, T.cols - ex - 20));
    line = G + 4; x = ex;
    const etags = [];
    if (this.disp.esh > 0) etags.push([`shield ${fmt(this.disp.esh)}`, '#ffd866']);
    if (e.passive.heads) etags.push([`heads ${e.heads}`, '#ff8a5c']);
    const set = b.cycleSet();
    if (set) etags.push([set.name, set.color || '#ffffff']);
    if (e.phaseIdx >= 0 && e.phases[e.phaseIdx].name) etags.push([e.phases[e.phaseIdx].name, '#ff5a7a']);
    for (const bf of e.buffs) if (bf.turns < 900) etags.push([`${bf.name} ${bf.turns}`, '#ffb84d']);
    for (const ss of e.statuses) etags.push([`${STATUS_INFO[ss.id].name}${ss.id === 'poison' ? ' x' + ss.stacks : ''} ${ss.id === 'stun' ? '' : ss.turns}`.trim(), STATUS_INFO[ss.id].color]);
    for (const [t, c] of etags) { if (x + t.length > T.cols - 1) { line++; x = ex; } if (line > T.rows - 1) break; T.text(x, line, t, c); x += t.length + 2; }
    // the foe's intent, over its head
    if (!b.over) {
      const it = b.intentInfo();
      const c = A.center('e');
      if (it) {
        let txt, col = '#ffb0a0';
        if (it.kind === 'charge') { txt = `!! ${it.text}${it.est ? `  ~${fmt(it.est)}` : ''}`; col = Math.floor(A.time * 3) % 2 ? '#ff3355' : '#ffb84d'; }
        else if (it.kind === 'attack') txt = `>> ${it.name}  ~${fmt(it.est)}${it.hits > 1 ? ` (${it.hits} hits)` : ''}`;
        else txt = `>> ${it.name}  (${{ buff: 'buff', shield: 'shield', heal: 'heal', debuff: 'curse', rewind: 'rewind' }[it.kind] || it.kind})`;
        if (b.has(e, 'stun')) { txt = '** stunned **'; col = '#ffe066'; }
        const y = Math.max(1, c.top - 1);
        const x0 = clamp(Math.round(c.x - txt.length / 2), 1, T.cols - txt.length - 1);
        T.text(x0, y, txt, col, { glow: it.kind === 'charge' ? 1 : 0.3 });
      }
    }
  },

  // ------------------------------------------------------------------ the skill bar
  renderBar() {
    const b = this.b, s = UI.save;
    if (!b) return;
    const st = b.stats();
    let html = '';
    SKILL_KEYS.forEach((k, i) => {
      const id = s.keys[i];
      if (!id) { html += `<button class="sk empty" disabled><span class="k">${k}</span><span class="t"><span class="n">-</span></span></button>`; return; }
      const sk = SKILLS[id], r = s.ranks[id];
      const why = b.over ? 'over' : b.blocked(id);
      const rngd = skillRange(sk, Math.max(0, r), st);
      const tip = `<b>${sk.name}</b> rank ${rankName(r)} (${RANK_MULT[Math.max(0, r)].toFixed(2)}x)<br>${esc(sk.desc)}${rngd ? `<br>${fmt(rngd[0])}-${fmt(rngd[1])}${sk.hits > 1 ? ' x' + sk.hits : ''} before defence` : ''}${why && why !== 'over' ? `<br><span class="hot">${why}</span>` : ''}`;
      html += `<button class="sk${why ? ' blocked' : ''}" data-sk="${i}" data-tip="${esc(tip)}"><span class="k">${k}</span>${UI.badge({ kind: 'skill', id }, true)}<span class="t"><span class="n">${sk.name}</span><span class="s">${rankName(r)}${sk.mp ? ` · <span class="mpc">${skillMp(sk, r, st)} MP</span>` : ''}${sk.hpCost ? ` · <span class="hot">${Math.round(sk.hpCost * 100)}% HP</span>` : ''}</span></span>${b.p.cds[id] > 0 ? `<span class="cd">${b.p.cds[id]}</span>` : ''}</button>`;
    });
    html += `<button class="sk guard" data-guard="1" data-tip="<b>Guard</b><br>Half damage until your next turn, and 10% of your mana back."><span class="k">G</span><span class="t"><span class="n">Guard</span><span class="s">half damage</span></span></button>`;
    s.quick.forEach((q, i) => {
      if (!q) { html += `<button class="sk pot empty" disabled><span class="k">${i + 1}</span><span class="t"><span class="n">no potion</span></span></button>`; return; }
      const dis = b.p.potionUsed || b.over;
      html += `<button class="sk pot${dis ? ' blocked' : ''}" data-pot="${i}" data-tip="${esc(UI.itemTip(q))}${b.p.potionUsed ? '<br><span class=hot>One potion a turn</span>' : ''}"><span class="k">${i + 1}</span>${UI.badge(q, true)}<span class="t"><span class="n">${POTIONS[q.id].name}</span><span class="s">x${q.n} · free</span></span></button>`;
    });
    const bar = $('skillbar');
    bar.innerHTML = html;
    bar.querySelectorAll('[data-sk]').forEach((el) => { el.onclick = () => this.onKey(SKILL_KEYS[+el.dataset.sk]); });
    bar.querySelector('[data-guard]').onclick = () => this.onKey('G');
    bar.querySelectorAll('[data-pot]').forEach((el) => { el.onclick = () => this.onKey(String(+el.dataset.pot + 1)); });
  },

  onKey(k) {
    if (k === 'Escape' || k === 'Q') { UI.menu(); return true; }
    if (this.busy || !this.b || this.b.over) return false;
    const i = SKILL_KEYS.indexOf(k);
    if (i >= 0) {
      const id = UI.save.keys[i];
      if (!id) return true;
      const why = this.b.blocked(id);
      if (why) { SFX.play('nope'); this.flashLog(`${SKILLS[id].name}: ${why}`); return true; }
      this.used.add(id);
      this.run(() => this.b.act({ type: 'skill', id }));
      return true;
    }
    if (k === 'G') { this.run(() => this.b.act({ type: 'guard' })); return true; }
    if (k === '1' || k === '2') {
      const q = UI.save.quick[+k - 1];
      if (!q || this.b.p.potionUsed) { SFX.play('nope'); return true; }
      if (q.id === 'kydos') ACH.grant('kydos');
      if (q.id === 'stone') ACH.grant('stone');
      this.run(() => this.b.usePotion(+k - 1));
      return true;
    }
    return false;
  },
  async run(fn) {
    this.busy = true;
    $('skillbar').style.opacity = 0.55;
    const hadDoom = !!this.b.has(this.b.p, 'doom');
    const evs = fn();
    await this.play(evs);
    if (hadDoom && !this.b.has(this.b.p, 'doom') && !evs.some((e) => e.t === 'msg' && /Doom falls/.test(e.text)) && !this.b.over) ACH.grant('cleanse');
    $('skillbar').style.opacity = 1;
    this.busy = false;
    this.renderBar();
    if (this.b.over) this.finish();
  },

  // ------------------------------------------------------------------ playback
  log(html, cls = '') {
    const el = document.createElement('div');
    if (cls) el.className = cls;
    el.innerHTML = html;
    const L = $('battle-log');
    L.appendChild(el);
    while (L.children.length > 80) L.firstChild.remove();
    L.scrollTop = L.scrollHeight;
  },
  flashLog(t) { this.log(`<span class="hot">${esc(t)}</span>`); },
  sync(ev) {
    if (!ev.snap) return;
    this.disp.php = ev.snap.p.hp; this.disp.pmp = ev.snap.p.mp; this.disp.psh = ev.snap.p.shield;
    this.disp.ehp = ev.snap.e.hp; this.disp.esh = ev.snap.e.shield;
  },
  async play(evs) {
    const A = this.A, e = this.b.e;
    const eArt = ART[e.id] || {};
    const eCol = eArt.accent || '#ff8a6a';
    for (const ev of evs) {
      switch (ev.t) {
        case 'act': {
          if (ev.who === 'p') {
            this.log(`<span class="p">You use <b>${esc(ev.name)}</b>${ev.mp ? ` <span class="mpc">-${ev.mp} MP</span>` : ''}${ev.gifted ? ' <span class="sc">(Gifted: free)</span>' : ''}.</span>`);
            const sk = ev.skill && SKILLS[ev.skill];
            SFX.play(sk && (sk.type === 'mag') ? 'magic' : sk && sk.type === 'heal' ? 'heal' : sk && sk.type === 'buff' ? 'buff' : ev.fx === 'potion' ? 'heal' : 'click');
            if (ev.skill === 'res') ACH.grant('rest');
            this.sync(ev);
            const fx = SKILL_FX[ev.fx];
            if (fx) await fx(A, 'p', 'e');
          } else {
            this.log(`<span class="e">${esc(e.baseName)}: <b>${esc(ev.name)}</b>${ev.charge ? ` <span class="hot">(${esc(ev.text)})</span>` : ''}</span>`);
            if (ev.charge) { SFX.play('charge'); A.float('e', ev.text, '#ff3355', { big: true, life: 1.6 }); }
            const fx = SKILL_FX[ev.fx];
            if (fx) await fx(A, 'e', 'p', eCol);
          }
          break;
        }
        case 'dmg': {
          this.sync(ev);
          const toE = ev.to === 'e';
          const dot = ev.kind && ev.kind !== 'hit';
          let txt = ev.amount ? `-${fmt(ev.amount)}` : (ev.label || '0');
          if (ev.absorbed && ev.absorbed >= ev.amount) txt = `(${fmt(ev.absorbed)})`;
          if (ev.label && ev.amount) txt = `${ev.label.toUpperCase()} ${txt}`;
          const col = toE ? (ev.crit ? '#ffe066' : dot ? (STATUS_INFO[ev.kind] ? STATUS_INFO[ev.kind].color : '#ffffff') : '#ffffff') : (ev.label === 'Denied' ? '#ffd866' : '#ff6a6a');
          A.float(ev.to, txt, col, { big: ev.crit || !!ev.label, idx: ev.idx || 0 });
          if (ev.amount) {
            A.hitFlash(ev.to);
            impactFX(A, ev.to, col, ev.idx);
            SFX.play(toE ? (ev.crit ? 'crit' : 'hit') : 'hurt');
            if (ev.crit) A.shake(0.6, 0.15);
          }
          if (toE && ev.label === 'Final Hit') ACH.grant('finalhit');
          if (toE && ['Overkill', 'Annihilation', 'Incineration', 'Final Hit'].includes(ev.label)) ACH.grant('overkill');
          if (!dot || ev.amount) this.log(`${toE ? '' : '<span class="hot">'}${dot ? esc(STATUS_INFO[ev.kind] ? STATUS_INFO[ev.kind].name : ev.kind) + ': ' : ''}${toE ? esc(e.baseName) : 'You'} take${toE ? 's' : ''} ${fmt(ev.amount)}${ev.absorbed ? ` (${fmt(ev.absorbed)} absorbed)` : ''}${ev.crit ? ' <b class="sc">critical</b>' : ''}${ev.label && ev.label !== 'Critical' && !dot ? ` <b class="sc">${esc(ev.label)}</b>` : ''}${toE ? '' : '</span>'}`);
          await wait(dot ? 260 : 150);
          break;
        }
        case 'miss':
          A.float(ev.to, ev.text || 'Miss!', '#9aa0b5', { idx: ev.idx || 0 });
          SFX.play('miss');
          this.log(`<span class="dim">${ev.to === 'e' ? 'You miss.' : ev.text ? esc(ev.text) + ' You slip it.' : `${esc(e.baseName)} misses.`}</span>`);
          await wait(160);
          break;
        case 'heal':
          this.sync(ev);
          if (ev.amount > 0 || ev.text) {
            A.float(ev.to, ev.text ? ev.text : `+${fmt(ev.amount)}`, '#7fe08a', { idx: 1 });
            if (!ev.quiet) this.log(`<span class="cool">${ev.to === 'p' ? 'You recover' : esc(e.baseName) + ' recovers'} ${fmt(ev.amount)}${ev.text ? ' (' + esc(ev.text) + ')' : ''}.</span>`);
            if (!ev.quiet) await wait(160);
          }
          break;
        case 'mp':
          this.sync(ev);
          if (!ev.quiet && ev.amount) { A.float('p', `${ev.amount > 0 ? '+' : ''}${fmt(ev.amount)} MP`, '#6fa8ff', { idx: 2 }); this.log(`<span class="mpc">${ev.amount > 0 ? '+' : ''}${fmt(ev.amount)} MP</span>`); await wait(120); }
          break;
        case 'status':
          this.sync(ev);
          A.float(ev.to, ev.text, ev.color, { idx: 2 });
          this.log(`<span style="color:${ev.color}">${ev.to === 'p' ? 'You are' : esc(e.baseName) + ' is'} afflicted: ${esc(ev.text)}.</span>`);
          await wait(160);
          break;
        case 'cleanse': A.float(ev.to, 'Cleansed', '#ffffff'); this.log('<span class="cool">A debuff lifts.</span>'); break;
        case 'buff': A.float(ev.to, ev.name, ev.to === 'p' ? '#c3b0ff' : '#ffb84d', { idx: 1 }); await wait(140); break;
        case 'shield': this.sync(ev); A.float(ev.to, `+${fmt(ev.amount)} shield`, '#ffd866', { idx: 1 }); await wait(140); break;
        case 'msg':
          this.sync(ev);
          this.log(`<span style="color:${ev.color || '#e4def2'}">${esc(ev.text)}</span>`);
          if (/is broken/.test(ev.text)) ACH.grant('brokewind');
          if (/burns stop/.test(ev.text)) ACH.grant('heads');
          A.floats.push({ x: this.T.cols / 2, y: 6, text: ev.text, color: ev.color || '#ffffff', life: 1.6, vy: 0.6 });
          await wait(380);
          break;
        case 'phase':
          this.sync(ev);
          SFX.play('phase');
          A.banner = { text: ev.text, color: ev.color || '#ff5a7a', life: 2 };
          A.flash(ev.color || '#ff5a7a', 0.15); A.shake(1, 0.3);
          this.log(`<b style="color:${ev.color || '#ff5a7a'}">${esc(ev.text)}</b>`);
          await wait(700);
          break;
        case 'revive':
          this.sync(ev);
          SFX.play('phase');
          A.banner = { text: ev.text, color: '#ffd866', life: 2.2 };
          A.flash('#ffd866', 0.2);
          A.rise('e', '^*', '#ffd866', 20, 1.2);
          this.log(`<b class="sc">${esc(ev.text)}</b>`);
          await wait(900);
          break;
        case 'death':
          this.sync(ev);
          await this.deathFX(ev.who);
          break;
        case 'round':
          this.log(`ROUND ${ev.n}`, 'r');
          break;
        case 'nope':
          SFX.play('nope'); this.flashLog(ev.text);
          break;
      }
    }
  },
  // the original's :p1.die: the fallen sign bursts into widening / \ rings
  async deathFX(who) {
    const A = this.A, c = A.center(who);
    const f = A.fighters[who];
    SFX.play(who === 'e' ? 'big' : 'lose');
    for (let r = 1; r <= 7; r++) {
      const pts = [];
      for (let i = -r; i <= r; i++) { const dy = r - Math.abs(i); pts.push([c.x + i * 1.6, c.y - dy * 0.8, i < 0 ? '/' : '\\']); pts.push([c.x + i * 1.6, c.y + dy * 0.8, i < 0 ? '\\' : '/']); }
      for (const [x, y, ch] of pts) A.lines.push({ x, y, ch, color: who === 'e' ? '#ffffff' : '#ff6a6a', life: 0.25, fade: 0.25, glow: 1 });
      if (f) f.a = Math.max(0, 1 - r / 6);
      await wait(70);
    }
    if (f) f.hidden = true;
    await wait(250);
  },

  // ------------------------------------------------------------------ the end of a fight
  finish() {
    const s = UI.save, b = this.b, e = b.e;
    const res = finishFight(s, b);
    if (res.win) {
      s.codex[e.id].kills++;
      ACH.grant('first');
      if (e.boss && ACH_BY_ID[e.id]) ACH.grant(e.id);
      if (e.affixes.includes('gilded')) ACH.grant('gilded');
      if (b.stolen > 0) ACH.grant('stolen');
      if (e.floor >= 10 && this.used.size === 1 && this.used.has('att')) ACH.grant('attackonly');
      if (s.streak >= 5) ACH.grant('streak5');
      if (s.streak >= 10) ACH.grant('streak10');
      if (s.best >= 26) ACH.grant('top12');
      if (s.best >= 101) { ACH.grant('ranked1'); ACH.grant('beyond'); }
      if (s.best >= 201) ACH.grant('beyond2');
      if (s.hardcore && s.best >= 30) ACH.grant('hardcore30');
      SFX.play('win');
    } else if (b.mode === 'climb') ACH.grant('death');
    Hub.checkAch();
    recordRun(s);
    if (res.hardcoreDeath && !s.test) store.del(SAVE_KEY); else saveGame(s);
    setTimeout(() => this.results(res), 400);
  },
  results(res) {
    const s = UI.save, e = this.b.e;
    const loot = res.loot.map((it) => `<div class="lrow" data-tip="${esc(UI.itemTip(it))}">${UI.badge(it)}<div><div class="nm" style="color:${it.kind === 'gear' ? RARITY_BY_ID[it.rarity].color : 'var(--fg)'}">${esc(itemName(it))}${it.kind === 'potion' ? ' <span class="dim">x1</span>' : ''}</div><div class="meta">${UI.itemLine(it)}</div></div><span class="dim">${it.autoSold ? `bag full: sold for ${fmt(it.autoSold)}` : ''}</span></div>`).join('');
    let html;
    if (res.win) {
      const nextInfo = floorInfo(s.floor);
      const st = computeStats(s);
      html = `<h2 class="gold">${res.boss ? 'Boss defeated' : 'Victory'}</h2>
        <p class="sub">${esc(e.name)} falls in ${res.rounds} round${res.rounds > 1 ? 's' : ''}. Biggest hit: ${fmt(res.biggest)}.</p>
        <div class="rewards"><span class="sc">+${fmt(res.sc)} Soul Coins</span><span class="xp">+${fmt(res.xp)} XP</span></div>
        ${res.streakK > 1 || res.pity ? `<p class="note">${res.streakK > 1 ? `Streak bonus x${res.streakK.toFixed(2)}. ` : ''}${res.pity ? 'The stream’s pity: x1.5.' : ''}</p>` : ''}
        ${loot ? `<div class="sec">Spoils<span class="grip"></span></div><div class="loot">${loot}</div>` : ''}
        ${res.unlocked.length ? `<div class="sec">New<span class="grip"></span></div>${res.unlocked.map((u) => `<p class="sub">${esc(u)}</p>`).join('')}` : ''}
        ${res.mode === 'climb' && nextInfo.step === 1 ? `<p class="sub" style="color:${nextInfo.stratum.color}">Ahead: ${esc(stratumName(nextInfo))}.</p>` : ''}
        <div class="row end gap">
          <button data-a="hub" data-key="S">Return to the Sanctum <kbd>S</kbd></button>
          ${res.mode === 'climb' ? `<button class="primary" data-a="on" data-key="Enter">Press on · floor ${s.floor} (${Math.round(s.carry.hp * 100)}% HP, ${Math.round(s.carry.mp * 100)}% MP)</button>`
            : `<button class="primary" data-a="again" data-key="Enter">Train again</button>`}
        </div>`;
    } else if (res.mode === 'train') {
      html = `<h2 class="hot">Beaten</h2><p class="sub">Training costs nothing but pride.</p><div class="row end gap"><button class="primary" data-a="hub" data-key="Enter">Return to the Sanctum</button></div>`;
    } else if (res.hardcoreDeath) {
      html = `<h2 class="hot">Your soul dissolves</h2><p class="sub">${esc(s.name)} falls on floor ${res.floor}. Hardcore: the run is over. Deepest floor: <b>${s.best}</b>. It stands on the leaderboard.</p><div class="row end gap"><button class="primary" data-a="title" data-key="Enter">Title</button></div>`;
    } else {
      html = `<h2 class="hot">You fall</h2>
        <p class="sub">${esc(e.name)} wins. The stream scatters <b class="sc">${fmt(res.lostSc)} Soul Coins</b> and carries you back to floor <b>${res.backTo}</b>.</p>
        <p class="note">The stream pities you: +50% rewards for your next ${PITY_FIGHTS} fights.</p>
        <div class="row end gap"><button class="primary" data-a="hub" data-key="Enter">Return to the Sanctum</button></div>`;
    }
    const card = UI.modal(html, { closable: false });
    card.querySelectorAll('[data-a]').forEach((btn) => {
      btn.onclick = () => {
        const a = btn.dataset.a;
        UI.closeModal();
        this.stop();
        if (a === 'title') { UI.save = null; return UI.title(); }
        if (a === 'hub') { if (res.win && res.mode === 'climb') restAtSanctum(s); saveGame(s); return Hub.open('arena'); }
        if (a === 'on') { if (s.pendingPerk) { Hub.open('arena'); return; } return this.start('climb'); }
        if (a === 'again') return this.start('train');
      };
    });
  },
  abandon() {
    if (!this.b || this.b.over) return;
    if (this.b.mode === 'train') { this.stop(); return Hub.open('arena'); }
    this.b.over = 'lose';
    this.b.p.hp = 0;
    this.finish();
  },
};
