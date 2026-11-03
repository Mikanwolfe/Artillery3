'use strict';
// Bootstrap. URL params for testing: ?seed=N fixes the gameplay RNG; ?speed=N the animation speed.
(function () {
  const params = new URLSearchParams(location.search);
  rng.seed(params.has('seed') ? +params.get('seed') : Math.floor(Math.random() * 1e9));
  FX.speed = +params.get('speed') || store.get('ss2.speed', 1) || 1;
  const go = () => {
    UI.init();
    // ?test=FLOOR[&cls=eweca]: a throwaway character built up for that floor (for screenshots and testing)
    if (params.has('test')) {
      const f = Math.max(1, +params.get('test'));
      const cls = params.get('cls') || 'eweca';
      const s = newSave('Tester', params.get('ab') || 'mage', { seed: 1 });
      s.best = f - 1; s.floor = f; s.sc = 5000 * f; s.xp = 5000 * f;
      for (const k of PRIMARY) s.trained[k] = Math.round(f * 5.5);
      s.mastery = { hp: Math.round(f / 3), df: Math.round(f / 4) };
      if (cls !== 'adventurer') { s.classes[cls] = true; s.cls = cls; }
      if (f > 60 && cls !== 'adventurer') s.awakened[cls] = true;
      for (const id of Object.keys(SKILLS)) if (skillAvailable(s, id) && classAllows(s, id)) s.ranks[id] = Math.min(14, Math.floor(f / 7));
      s.keys = Object.keys(SKILLS).filter((id) => s.ranks[id] >= 0 && classAllows(s, id) && SKILLS[id].bd).sort((a, b) => SKILLS[b].bd * SKILLS[b].hits - SKILLS[a].bd * SKILLS[a].hits).slice(0, 6).concat(['hea', 'res']);
      s.equip = [makeItem(f, { slot: 'weapon', boost: 1 }), makeItem(f, { boost: 1, slot: 'acc' }), makeItem(f, { boost: 1, slot: 'acc' }), makeItem(f, { boost: 1, slot: 'acc' })];
      s.quick = [makePotion('hp', f, 3), makePotion(f > 30 ? 'elixir' : 'mp', f, 2)];
      refreshShop(s);
      UI.save = s;
      Hub.open(params.get('tab') || 'arena');
      if (params.has('fight')) Fight.start('climb');
    }
  };
  // wait for the console font so the canvas measures the right cell size
  if (document.fonts && document.fonts.load) Promise.race([document.fonts.load("16px 'Cascadia Mono'"), new Promise((r) => setTimeout(r, 1500))]).then(go, go);
  else go();
})();
