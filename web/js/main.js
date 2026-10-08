'use strict';
// Bootstrap. URL params (handy for testing):
//   ?seed=N   deterministic gameplay RNG (otherwise a random seed, shown when paused)
//   ?auto=N   skip the menu and run an N-tank all-CPU match
//   ?speed=X  simulation speed multiplier
//   ?vehicles=alb,gwt,...  the auto match's vehicles, in seat order
(function () {
  const params = new URLSearchParams(location.search);
  // every game is seeded, so any match can be replayed: the seed shows on the pause screen
  const seed = params.has('seed') ? +params.get('seed') : Math.floor(Math.random() * 1e6);
  rng.seed(seed);
  const game = new Game($('view'), UI);
  game.seed = seed;
  UI.init(game);
  window.A3 = game;
  if (params.has('speed')) game.speed = +params.get('speed') || 1;

  // the stage takes the window's shape when it's close to 16:9 (a 20:9 phone, a 16:10 laptop) and
  // letterboxes past that (Game.setAspect)
  const stage = $('stage');
  const resize = () => game.resize(stage.clientWidth);
  const fit = () => {
    const vv = window.visualViewport;
    const w = vv ? vv.width : innerWidth, h = vv ? vv.height : innerHeight;
    stage.style.setProperty('--ar', game.setAspect(w / h).toFixed(4));
    resize();
  };
  new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', fit);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);
  fit();

  // phones: landscape. Fullscreen first (the orientation lock needs it, and it hides the URL bar)
  const root = document.documentElement;
  const canFull = !!root.requestFullscreen && matchMedia('(pointer: coarse)').matches;
  const goFull = () => root.requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
    .catch(() => {});
  $('rotate-full').hidden = !canFull;
  $('btn-full').hidden = !canFull;
  $('rotate-full').onclick = goFull;
  $('btn-full').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : goFull());
  $('rotate-skip').onclick = () => document.body.classList.add('portrait-ok');

  if (params.has('auto')) {
    const types = (params.get('types') || 'normal,hard,easy,hard').split(',');
    const n = clamp(+params.get('auto') || 3, 2, 4);
    const cfgs = [];
    const vs = params.has('vehicles') ? params.get('vehicles').split(',') : VEHICLES.map((v) => v.id);
    for (let i = 0; i < n; i++) cfgs.push({ name: AI_NAMES[i], type: types[i % types.length], vehicle: vs[i % vs.length] });
    game.startMatch(cfgs, params.has('rounds') ? +params.get('rounds') : 3, { balance: params.get('balance') || 'rebalanced', events: params.get('events') !== 'off', map: params.get('map') || 'random' });
  }

  let last = performance.now();
  function loop(ts) {
    const dt = (ts - last) / 1000;
    last = ts;
    try { game.frame(dt); } catch (e) { console.error(e); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
