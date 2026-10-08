'use strict';
// The plot. It ties together the lore already in the weapon flavour text (the last Neko War, CLS-T,
// Lymilark, the Kotona relics, the Hatsuyuki project, the MAIA satellite) with NXi's November Division
// of the United Aurora Federation: arrived through an interdimensional gate from another timeline,
// guarding it at all cost, "Built Like A Battlecruiser". Two arms makers hold weapons trials beside the
// gate; the winner gets the contract. Dispatches run with the match's stage (see hazards.js), so the
// story escalates with the events: weather, drones, batteries, then the carrier.

const STORY = {
  dispatches: [
    null,
    'Trial one at Hatsuyuki Station, beside a gate that should not be there: CLS-T\'s turret girls against NXi\'s November Division, and the winner takes the contract. Live rounds, no grudges. (There will be grudges.)',
    'The weather around the gate has turned strange: fronts of force and storm roll in from nowhere. NXi calls it dimensional drift. CLS-T calls it NXi.',
    'Drones from the old Hatsuyuki project are flying again, and nobody admits to switching them on. There is a bounty on every one shot down.',
    'Shore batteries from the Neko War have woken up along the ridges, and the valleys fill with something deadly whenever a trial runs long.',
    'INTEL-3 reports a signal under the gate: a Hatsuyuki carrier, still alive. The trials continue. The Queen insists.',
    'The drones come in waves now. Whoever is still standing late in a round is the one they hunt.',
    'The gate hums. MAIA has been upgraded twice. Everyone is very well armed, and nobody is going home.',
    'The carrier Shirayuki is rising out of the gate. Win the trial, if there is a trial left to win.',
  ],
  boss: 'The Hatsuyuki carrier Shirayuki is through the gate. Queen Aeria Charlotte\'s order to every gun on the field: bring it down.',
  ending(champ) {
    const maker = champ.vehicle.id === 'nxi' ? 'NXi' : champ.vehicle.id === 'alb' ? 'LFS' : 'CLS-T';
    if (maker === 'LFS') return `${champ.name} takes the trials for Lymilark Future Sciences. The contract goes to Tir Chonaill, and the gate gets a guard of knights, as the old songs said it would.`;
    return maker === 'NXi'
      ? `${champ.name} takes the trials for NXi. The November Division keeps the gate, as it always meant to. We advance slowly because we advance forever.`
      : `${champ.name} takes the trials for CLS-T. The contract is signed in pink ink, with a cat drawn in the margin.`;
  },
};

// the dispatch for this round: by the event stage, or by round number when events are off
function storyDispatch(game) {
  const st = game.stage() || Math.min(8, game.round);
  return STORY.dispatches[clamp(Math.floor(st), 1, 8)];
}
