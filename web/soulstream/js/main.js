'use strict';
// Bootstrap. URL params for testing: ?seed=N fixes the gameplay RNG; ?speed=N the animation speed;
// ?test=FLOOR&cls=ID a built-up character; ?codex opens the Codex.
(function () {
  const params = new URLSearchParams(location.search);
  rng.seed(params.has('seed') ? +params.get('seed') : Math.floor(Math.random() * 1e9));
  FX.speed = +params.get('speed') || store.get('ss2.speed', 1) || 1;
  const go = () => {
    UI.init();
    // ?test=FLOOR[&cls=eweca]: a throwaway character built up for that floor (for screenshots and testing)
    if (params.has('test')) {
      const s = buildTestSave(+params.get('test'), params.get('cls') || 'eweca', params.get('ab') || 'mage');
      UI.save = s;
      Hub.open(params.get('tab') || 'arena');
      if (params.has('fight')) Fight.start('climb');
    }
    if (params.has('codex')) Codex.open();
  };
  // wait for the console font so the canvas measures the right cell size
  if (document.fonts && document.fonts.load) Promise.race([document.fonts.load("16px 'Cascadia Mono'"), new Promise((r) => setTimeout(r, 1500))]).then(go, go);
  else go();
})();
