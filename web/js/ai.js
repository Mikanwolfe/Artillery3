'use strict';
// CPU players.
//   - Solver: brute-force search over (elevation, power) using the real physics.
//   - CpuController: drives a tank through virtual key presses (the same Ctl a human uses).
//   - LlmBrain: optional. Asks an OpenAI-compatible chat endpoint for *strategy* (target,
//     weapon, reposition) and a taunt. The solver still does the maths; the LLM never
//     computes trajectories. Any failure falls back to the heuristic.

const AI_NAMES = ['Hatsuyuki', 'Kotona', 'Nadeko', 'Natsuki', 'Shigure', 'Neko-15X'];
const PERSONAS = [
  'cocky and theatrical, treats every shot as a masterpiece',
  'icily polite, passive-aggressive, apologises insincerely after hits',
  'nervous and over-explains, but surprisingly vicious when they land a hit',
  'dry, deadpan, speaks like a weather forecaster describing your doom',
  'dramatic romantic poet who compares artillery to heartbreak',
];

// Virtual controller state. Humans fill it from the keyboard, CPUs from code.
class Ctl {
  constructor() { this.reset(); }
  reset() { this.left = this.right = this.up = this.down = this.charge = this.fine = false; }
}

const DIFFICULTY = {
  easy: { se: 4.5, sp: 9 },
  normal: { se: 2.2, sp: 4.5 },
  hard: { se: 0.8, sp: 1.6 },
  llm: { se: 1.2, sp: 2.4 },
};

// Find the (elevation, power) that lands closest to `target` with weapon `w`.
function solveShot(game, tank, w, target) {
  const facing = target.x >= tank.x ? 1 : -1;
  const tc = target.center();
  const evalShot = (elev, power) => {
    const m = tank.muzzle(elev, facing);
    const v = power * SPEED_PER_POWER * w.speed;
    const a = rad(elev);
    const r = simulateShot(game.terrain, game.wind, w, game.tanks, tank, m.x, m.y, facing * v * Math.cos(a), -v * Math.sin(a));
    let err;
    if (w.kind === 'marker') err = Math.max(0, Math.abs(r.x - target.x) - 6);
    else if (r.hit === 'tank' && r.tank === target) err = 0;
    else err = Math.max(0, dist(r.x, r.y, tc.x, tc.y) - (w.dmgR || w.sub?.dmgR || 30) * 0.35);
    if (r.hit === 'out') err += 400;
    const selfD = w.kind === 'marker' ? Math.abs(r.x - tank.x) + 40 : dist(r.x, r.y, tank.x, tank.y - 7);
    if (selfD < (w.dmgR || 30) + 12 && !(r.tank === target)) err += 150;
    return err;
  };
  let best = { err: Infinity, elev: 45, power: 50, facing };
  const lo = Math.max(w.elevMin, -10);
  for (let e = lo; e <= w.elevMax; e += 3) {
    for (let p = 10; p <= 100; p += 3) {
      const err = evalShot(e, p);
      if (err < best.err) best = { err, elev: e, power: p, facing };
    }
  }
  const e0 = best.elev;
  const p0 = best.power;
  for (let e = e0 - 3; e <= e0 + 3; e += 0.5) {
    if (e < w.elevMin || e > w.elevMax) continue;
    for (let p = p0 - 4; p <= p0 + 4; p += 0.5) {
      if (p < 8 || p > 100) continue;
      const err = evalShot(e, p);
      if (err < best.err) best = { err, elev: e, power: p, facing };
    }
  }
  // fine pass: matters for small-blast weapons like the coilgun
  const e1 = best.elev;
  const p1 = best.power;
  for (let e = e1 - 0.6; e <= e1 + 0.6; e += 0.1) {
    if (e < w.elevMin || e > w.elevMax) continue;
    for (let p = p1 - 1; p <= p1 + 1; p += 0.2) {
      if (p < 8 || p > 100) continue;
      const err = evalShot(e, p);
      if (err < best.err) best = { err, elev: e, power: p, facing };
    }
  }
  return best;
}

class CpuController {
  constructor(game, tank) {
    this.game = game;
    this.tank = tank;
    this.ctl = new Ctl();
    this.state = 'think';
    this.timer = 0.7 + Math.random() * 0.5;
    this.plan = null;
    this.moved = false;
    this.moveFrames = 0;
    this.pending = false;
    this.directive = null;
    this.deadline = 0;
    if (tank.type === 'llm' && LlmBrain.usable()) {
      this.pending = true;
      this.deadline = 18;
      LlmBrain.decide(game, tank).then((d) => {
        this.directive = d;
        this.pending = false;
      });
    }
  }

  // choose weapon+target and solve; `directive` (from the LLM) biases the choice
  makePlan() {
    const g = this.game;
    const t = this.tank;
    const enemies = g.tanks.filter((x) => x.alive && x !== t);
    const owned = t.ownedWeapons();
    const d = this.directive;
    let weapon;
    let forcedTarget = null;
    if (d) {
      forcedTarget = enemies.find((e) => e.name === d.target) || null;
      weapon = owned.find((w) => w.id === d.weapon) || null;
    }
    if (!weapon) {
      const diff = t.type;
      if (diff === 'easy') weapon = rng.chance(0.7) ? WEAPON_BY_ID.howitzer : rng.pick(owned);
      else if (diff === 'normal') weapon = rng.chance(0.5) ? rng.pick(owned) : owned.sort((a, b) => weaponValue(b) - weaponValue(a))[0];
      else weapon = owned.slice().sort((a, b) => weaponValue(b) - weaponValue(a))[rng.chance(0.25) ? 1 : 0] || owned[0];
    }
    const cands = forcedTarget ? [forcedTarget] : enemies;
    let best = null;
    for (const e of cands) {
      const s = solveShot(g, t, weapon, e);
      const score = s.err - (e.maxHp - e.hp) * 0.25;
      if (!best || score < best.score) best = { ...s, score, target: e, weapon };
    }
    // a forced target that cannot be hit well: fall back to the best of everyone
    if (forcedTarget && best.err > 70) {
      for (const e of enemies) {
        if (e === forcedTarget) continue;
        const s = solveShot(g, t, weapon, e);
        if (s.err < best.err) best = { ...s, score: s.err, target: e, weapon };
      }
    }
    // chosen weapon can't reach anything sensible (e.g. a flat-firing coilgun vs a hilltop):
    // try the other weapons in stock before settling
    if (best.err > 60) {
      for (const alt of owned.slice().sort((a, b) => weaponValue(b) - weaponValue(a))) {
        if (alt === best.weapon) continue;
        for (const e of cands) {
          const s = solveShot(g, t, alt, e);
          const score = s.err - (e.maxHp - e.hp) * 0.25;
          if (score < best.score - 20) { best = { ...s, score, target: e, weapon: alt }; weapon = alt; }
        }
        if (best.err <= 60) break;
      }
    }
    const k = DIFFICULTY[t.type] || DIFFICULTY.normal;
    best.elev = clamp(best.elev + rng.gauss() * k.se, weapon.elevMin, weapon.elevMax);
    best.power = clamp(best.power + rng.gauss() * k.sp, 8, 100);
    return best;
  }

  update(dt) {
    const t = this.tank;
    const c = this.ctl;
    c.reset();
    switch (this.state) {
      case 'think': {
        if (this.pending) {
          this.deadline -= dt;
          if (this.deadline <= 0) this.pending = false;
          return;
        }
        this.timer -= dt;
        if (this.timer > 0) return;
        this.plan = this.makePlan();
        const needMove = !this.moved && (this.plan.err > 60 || (t.type === 'easy' && rng.chance(0.15)));
        if (needMove) {
          this.moved = true;
          const dir = this.plan.target.x > t.x ? 1 : -1;
          this.moveDir = rng.chance(0.8) ? dir : -dir;
          this.moveFrames = rng.int(25, 70);
          this.state = 'move';
          this.stuck = 0;
        } else this.state = 'aim';
        break;
      }
      case 'move': {
        if (this.directive && this.directive.reposition !== 'none' && !this.dirApplied) {
          this.dirApplied = true;
          this.moveDir = this.directive.reposition === 'left' ? -1 : 1;
        }
        if (this.moveFrames-- > 0 && t.fuel > 1) {
          if (this.moveDir < 0) c.left = true; else c.right = true;
        } else {
          this.timer = 0.15;
          this.state = 'think';
          this.directive && (this.directive.reposition = 'none');
        }
        break;
      }
      case 'aim': {
        const p = this.plan;
        if (t.weaponId !== p.weapon.id) t.selectWeapon(p.weapon.id);
        t.facing = p.facing;
        const diff = p.elev - t.elev;
        if (Math.abs(diff) > 0.6) {
          if (diff > 0) c.up = true; else c.down = true;
        } else {
          this.state = 'charge';
          this.timer = 0.25;
        }
        break;
      }
      case 'charge': {
        this.timer -= dt;
        if (this.timer > 0) return;
        if (t.power < this.plan.power) c.charge = true;
        else this.state = 'done';
        break;
      }
      default:
        break;
    }
  }
}

// ---------------------------------------------------------------- LLM brain
const LlmBrain = {
  lastError: '',
  lastOk: false,
  failures: 0, // consecutive; 3 in a row switches LLM players to the built-in AI for the rest of the match
  MAX_FAILURES: 3,

  load() {
    let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem('a3.llm') || '{}'); } catch (e) { /* ignore */ }
    return { key: '', model: 'gpt-5-mini', base: 'https://api.openai.com/v1', taunts: true, ...cfg };
  },
  save(cfg) {
    try { localStorage.setItem('a3.llm', JSON.stringify(cfg)); } catch (e) { /* ignore */ }
  },
  enabled() { return !!this.load().key; },
  usable() { return this.enabled() && this.failures < this.MAX_FAILURES; },

  async chat(messages, schema, timeoutMs = 15000) {
    const cfg = this.load();
    if (!cfg.key) throw new Error('no API key');
    const body = { model: cfg.model, messages };
    const send = async (b) => {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        return await fetch(cfg.base.replace(/\/+$/, '') + '/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
          body: JSON.stringify(b),
          signal: ctrl.signal,
        });
      } finally { clearTimeout(to); }
    };
    let res = await send({ ...body, response_format: { type: 'json_schema', json_schema: { name: 'move', strict: true, schema } } });
    if (res.status === 400) res = await send(body); // endpoint without structured outputs: ask nicely instead
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).error?.message || ''; } catch (e) { /* ignore */ }
      throw new Error(`HTTP ${res.status} ${detail}`.trim());
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('no JSON in reply');
    return JSON.parse(m[0]);
  },

  persona(tank) { return PERSONAS[tank.idx % PERSONAS.length]; },

  system(tank) {
    return `You are ${tank.name}, a CPU commander in a turn-based artillery tank game. Personality: ${this.persona(tank)}.
A fire-control computer does the exact aiming; you only choose strategy and speak. Reply with JSON only.
"taunt": one short line (max 90 chars) in character, aimed at the opponents, ideally referring to something that just happened. Playful trash talk only: no slurs, no real-world hatred, no threats outside the game.
Pick the weapon that fits: Orbital hits whatever is in a column and ignores arc; Coilgun is flat and ignores wind; Acid and Cluster punish tanks that are close together; Siege is for stubborn or cornered targets. Prefer finishing low-HP enemies. "reposition" is only worth it if your shot looks blocked or you are exposed.`;
  },

  async decide(game, tank) {
    const cfg = this.load();
    const enemies = game.tanks.filter((t) => t.alive && t !== tank);
    if (!enemies.length) return null;
    const owned = tank.ownedWeapons();
    const state = {
      round: `${game.round}/${game.rounds}`,
      wind: +(game.wind * 1000).toFixed(1) + ' (positive blows right)',
      you: {
        name: tank.name, hp: Math.ceil(tank.hp), maxHp: tank.maxHp, x: Math.round(tank.x),
        weapons: owned.map((w) => ({ id: w.id, ammo: w.infinite ? 'unlimited' : tank.ammo[w.id], type: w.tag })),
      },
      enemies: enemies.map((e) => ({
        name: e.name, hp: Math.ceil(e.hp), x: Math.round(e.x), dx: Math.round(e.x - tank.x),
        heightAboveYou: Math.round(tank.y - e.y), roundWins: e.wins,
      })),
      scoreboard: game.tanks.map((t) => `${t.name}:${t.wins}`).join(' '),
      recentEvents: game.events.slice(-6),
    };
    const schema = {
      type: 'object', additionalProperties: false,
      required: ['target', 'weapon', 'reposition', 'taunt'],
      properties: {
        target: { type: 'string', enum: enemies.map((e) => e.name) },
        weapon: { type: 'string', enum: owned.map((w) => w.id) },
        reposition: { type: 'string', enum: ['none', 'left', 'right'] },
        taunt: { type: 'string' },
      },
    };
    try {
      const d = await this.chat([
        { role: 'system', content: this.system(tank) },
        { role: 'user', content: JSON.stringify(state) },
      ], schema);
      this.lastOk = true;
      this.lastError = '';
      this.failures = 0;
      if (cfg.taunts && d.taunt) game.say(tank, String(d.taunt).slice(0, 140));
      return {
        target: d.target, weapon: d.weapon,
        reposition: ['left', 'right'].includes(d.reposition) ? d.reposition : 'none',
      };
    } catch (e) {
      this.lastOk = false;
      this.failures++;
      this.lastError = e.name === 'AbortError' ? 'timed out' : String(e.message || e);
      if (this.failures >= this.MAX_FAILURES) this.lastError += ' (LLM players now on built-in AI for this match)';
      game.events.push(`(${tank.name}'s uplink failed; acting on instinct)`);
      if (game.ui) game.ui.llmStatus();
      return null;
    }
  },

  // one-liner at round end: gloat or grumble
  async quip(game, tank, situation) {
    if (!this.load().taunts || !this.usable()) return null;
    const schema = {
      type: 'object', additionalProperties: false, required: ['line'],
      properties: { line: { type: 'string' } },
    };
    try {
      const d = await this.chat([
        { role: 'system', content: this.system(tank) + '\nNow reply with {"line": "..."} (max 90 chars).' },
        { role: 'user', content: JSON.stringify({ situation, scoreboard: game.tanks.map((t) => `${t.name}:${t.wins}`).join(' '), recentEvents: game.events.slice(-8) }) },
      ], schema, 10000);
      return String(d.line || '').slice(0, 140) || null;
    } catch (e) {
      return null;
    }
  },
};
