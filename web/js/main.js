'use strict';
// Bootstrap. URL params (handy for testing):
//   ?seed=N   deterministic gameplay RNG
//   ?auto=N   skip the menu and run an N-tank all-CPU match
//   ?speed=X  simulation speed multiplier
//   ?vehicles=alb,gwt,...  the auto match's vehicles, in seat order
(function () {
  const params = new URLSearchParams(location.search);
  if (params.has('seed')) rng.seed(+params.get('seed'));
  const game = new Game($('view'), UI);
  UI.init(game);
  window.A3 = game;
  if (params.has('speed')) game.speed = +params.get('speed') || 1;

  const stage = $('stage');
  const resize = () => game.resize(stage.clientWidth);
  new ResizeObserver(resize).observe(stage);
  resize();

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
