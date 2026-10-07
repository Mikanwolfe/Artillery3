'use strict';
// Pre-written CPU banter. Each CPU gets a fixed personality (by name), and the game picks a line
// from that personality's pool for whatever just happened. {foe} is replaced with the other
// tank involved. Situations:
//   miss_close / miss_far   my shot missed (near / well wide)
//   hit / hit_big           my shot damaged someone (normal / heavy)
//   kill                    my shot destroyed someone
//   got_hit / got_hit_big   I took damage from another tank
//   enemy_missed_me         someone shot near me and missed
//   self_hit                I damaged myself
//   fall                    I took fall damage
//   low_hp / death          I'm nearly dead / just died
//   rival_down              someone else was destroyed
//   round_win / round_lose / match_win
// Anything missing from a personality falls back to TAUNTS.any.

const PERSONA_BY_NAME = {
  Ace: 'cocky', Major: 'polite', Rookie: 'nervous',
  Sarge: 'deadpan', Byron: 'poet', 'Unit 7': 'robot',
};
const PERSONA_KEYS = ['cocky', 'polite', 'nervous', 'deadpan', 'poet', 'robot'];

const TAUNTS = {
  cocky: {
    miss_close: [
      "That was close. Don't get used to it.", "A hair's breadth. The next one's yours.", 'Just warming up, {foe}.',
      "Practically a hit. I'm counting it.", 'Adjusting for your sheer luck.',
    ],
    miss_far: [
      "Wind's not on my side. Tragic.", 'That one was for the scenery.', 'I was aiming for the mountain. Obviously.',
      'Calibration shot. You\'re welcome.', 'Even legends miss occasionally. Once.',
    ],
    hit: [
      'Right on the money.', 'Ding. Delivered.', '{foe}, you have something on your hull. Me.',
      "And that's how it's done.", "Stand still, it's easier for both of us.",
    ],
    hit_big: [
      "That's gonna leave a mark.", 'Feel that? That was talent.', 'Somebody call a mechanic. Several.',
      'Textbook. I should write one.', 'Boom. Autograph on the crater.',
    ],
    kill: [
      'Another one for the collection.', '{foe} has left the building.', 'Too easy. Next.',
      'Rest in pieces, {foe}.', 'Was that a challenge? Adorable.',
    ],
    got_hit: [
      'Lucky shot.', 'Ow. Okay, that was rude.', "You're going to regret that.",
      "A scratch. I've had worse paint jobs.", "Enjoy it, {foe}. Won't happen twice.",
    ],
    got_hit_big: [
      'That... hurt. Fine. FINE.', "Now I'm annoyed.", 'Okay, who gave you a cannon?!',
      "That's coming out of your hide, {foe}.", 'Ow ow OW. Rematch. Now.',
    ],
    enemy_missed_me: [
      'Missed me!', 'Cute attempt, {foe}.', 'Was that supposed to be a shot?',
      'Not even close. Okay, a bit close.', 'Try aiming at the tank, {foe}.',
    ],
    self_hit: [
      'That... was deliberate.', 'Wind did that. Not me.', "Friendly fire. I'm very friendly.",
      "Don't look at me.", 'Tactical self-reflection.',
    ],
    fall: ['I meant to land like that.', 'Gravity is just jealous.', 'Nailed it. The landing, I mean.'],
    low_hp: [
      'Not dead yet! Still gorgeous!', "I've got plenty left in the tank. Literally.", 'Barely a dent.',
      "Hold on, I'm still winning.", "Okay, that's getting serious.",
    ],
    death: [
      'Tell them... I was winning.', 'This is NOT how it was supposed to go.', "I'll be back, and better looking.",
      'Worth it.', 'Ugh. Fine. Good shot, {foe}.',
    ],
    rival_down: ["One fewer rival. I'm not complaining.", '{foe} down. Who is next?', 'Well, that tidied up the leaderboard.'],
    round_win: [
      'Flawless. As expected.', 'Round to me. Shocking, I know.', 'Is that all you\'ve got, everyone?',
      'Winners win. That\'s me.', 'Please, hold your applause.',
    ],
    round_lose: [
      'A fluke. I demand a recount.', 'I let you win. Sure.', 'Enjoy it while it lasts.',
      'Next round I stop being nice.', 'That map was rigged.',
    ],
    match_win: ['Champion. Again. Shocking.', 'Bow, everyone.', 'Winner, winner, tank dinner.'],
  },

  polite: {
    miss_close: [
      'Oh dear, so nearly. How unfortunate for me.', "Apologies, {foe}. I'll aim better.", "Forgive the miss. It won't be repeated.",
      'Terribly sorry about the scenery.', 'How lucky you are. Truly.',
    ],
    miss_far: [
      'Oh, that went rather wide. Pardon me.', 'I do apologise to the mountain.', "A small misjudgement. Let's not mention it.",
      'The wind and I are not on speaking terms.', 'How embarrassing. Moving on.',
    ],
    hit: [
      'Pardon me, was that your hull?', 'Terribly sorry about the dent, {foe}.', "I do hope that wasn't important.",
      'Excuse me. Just passing through.', 'A small token of my regard.',
    ],
    hit_big: [
      "Oh my. I do hope that didn't hurt. (I hope it did.)", 'My sincerest condolences, {foe}.', 'How careless of me to be so accurate.',
      "I'd say sorry, but that would be a lie.", 'A lovely shot, if I may say so myself.',
    ],
    kill: [
      'Goodbye, {foe}. It was lovely knowing you.', 'My apologies. Truly. (Not really.)', 'Thank you for your participation.',
      'Do send my regards to the scrapyard.', 'How very final.',
    ],
    got_hit: [
      'How rude.', 'Was that necessary, {foe}?', 'Well. I never.', 'I shall remember this.',
      "That's quite enough of that, thank you.",
    ],
    got_hit_big: [
      "I'm going to need you to apologise for that.", 'How dreadfully uncivil.', 'That has put me in a mood, {foe}.',
      'Consider my politeness suspended.', 'Oh, you have *done* it now.',
    ],
    enemy_missed_me: [
      'Missed me! How thoughtful.', "Do try again, {foe}. I'll wait.", 'Such a sweet attempt.',
      'A near miss. Bless.', 'Thank you for the warm-up.',
    ],
    self_hit: [
      'I appear to have shot myself. Please ignore that.', 'A minor administrative error.', "Don't mention it.",
      'Self-care, of a sort.', 'Entirely intentional, I assure you.',
    ],
    fall: ['I meant to sit down.', 'Do mind the step.', 'Graceful, as always.'],
    low_hp: ["I'm fine. Everything's perfectly fine.", 'Just a tiny scratch. Several.', "I'd prefer not to be shot again."],
    death: [
      'Oh. Well. Do carry on without me.', 'That was uncalled for, {foe}.', 'I shall be filing a complaint.',
      'How awfully rude. Goodbye.', 'Please tell the others I was gracious.',
    ],
    rival_down: ['Oh, {foe} is gone. Pity. Anyway.', 'One less guest. Efficient.', 'How terribly sad. Who is next?'],
    round_win: [
      'How kind of you all to lose.', 'A pleasure, as always.', "Thank you, I'll be taking that round.",
      'Such a lovely round. For me.', "Do pass the tea, I've won.",
    ],
    round_lose: [
      "Congratulations. I'm thrilled for you.", 'Next round I shall be less polite.', 'Enjoy it. Truly.',
      'A fluke, but a charming one.', "I wasn't even trying. Honestly.",
    ],
    match_win: ['How gracious of everyone to come.', "Thank you all. I'll see myself out.", 'A proper victory, if I do say so.'],
  },

  nervous: {
    miss_close: [
      'Ahh that was close! To me being embarrassed!', 'Almost! Sorry! Sorry {foe}!', "Oh no, so close, I should've aimed lower. Or higher?",
      'I swear I calculated that!', "Please don't be mad.",
    ],
    miss_far: [
      "I'm so sorry, scenery!", 'That went... somewhere.', 'Was the wind always like that?!',
      'Nobody saw that, right?', 'Okay. Okay. Deep breaths.',
    ],
    hit: [
      'Oh! I actually hit something!', 'Sorry! Sorry! But also yes!', 'Did that hurt? Please say yes. I mean no.',
      'I did it?! I did it.', 'Right on target! By accident!',
    ],
    hit_big: [
      'Whoa, that was big! Are you okay, {foe}?', "I didn't mean to be that good!", "Oh no, I'm *good* at this?",
      'Please forgive me but WOW.', "That's... a lot of damage. Sorry!",
    ],
    kill: [
      "Oh no, {foe}, I'm so sorry!", "I didn't think that would work!", 'Is that... allowed?',
      "I won't tell anyone if you don't.", 'Okay, that was kind of cool. Sorry.',
    ],
    got_hit: ['Ow ow ow!', 'Please be gentle, {foe}!', 'That stings!', 'Oh no oh no oh no.', 'I knew this would happen.'],
    got_hit_big: [
      "I'm fine! I'm fine! I'm NOT fine!", 'Why is everyone aiming at ME?!', 'That was SO loud!',
      'Medic? Is there a medic?', 'I want to go home.',
    ],
    enemy_missed_me: [
      'Eep! Missed me! Phew!', 'That was way too close, {foe}!', 'Thank goodness your aim is bad!',
      'I felt that wind. Wow.', "I'm going to pretend that didn't happen.",
    ],
    self_hit: [
      'I shot myself. Of course I did.', "Please don't look.", 'That was supposed to go the other way!',
      "I'm okay! Mostly!", "Noted. Won't do that again.",
    ],
    fall: ['WHOA. I\'m okay!', 'The ground came up so fast!', 'Landing: needs work.'],
    low_hp: ["I'm very low on tank right now!", "Please don't aim at me, please.", "Everything's fine!! (It isn't.)"],
    death: [
      'Not like this...', "I'm sorry, everyone!", 'Tell the others I was brave.',
      'I knew the stairs were a bad idea.', 'Ow. Okay. Bye, {foe}.',
    ],
    rival_down: ['Oh no, {foe} is gone!', 'That was fast... should I be worried?', 'Sorry {foe}! Wasn\'t me!'],
    round_win: [
      'I won?! Are you sure?', 'Oh! Thank you! Sorry! Thank you!', 'That was stressful but good!',
      'Phew. I survived.', "I can't believe it worked!",
    ],
    round_lose: [
      'I knew it. I knew it.', "That's fine, I'm fine.", "Next time I'll panic less.",
      'Congratulations! Honestly!', 'I was this close, I swear.',
    ],
    match_win: ['I... won? Everything?', 'Wait, really? Thank you!', "I'm shaking. In a good way."],
  },

  deadpan: {
    miss_close: [
      'Shot landed within acceptable error. Barely.', 'Light drizzle of failure, {foe}. Clearing later.', 'A near miss. Forecast: improving.',
      'Impact within metres. Disappointing.', 'Not quite. Expect sharper conditions.',
    ],
    miss_far: [
      'Conditions: poor. Result: wide.', 'Shot landed in a field of nothing.', 'A miss. The wind was cited.',
      'Shell lost to the elements.', 'Data point recorded. It was bad.',
    ],
    hit: [
      'Direct contact observed.', 'A hit. Expect sunny weather. For me.', 'Damage confirmed, {foe}.',
      'Result: as predicted.', 'Scattered showers on your hull.',
    ],
    hit_big: [
      'Severe damage. Warnings issued.', 'A heavy front just passed through {foe}.', 'Catastrophic conditions. For you.',
      "That's a red alert, {foe}.", 'Expect lingering craters.',
    ],
    kill: [
      '{foe}: forecast no longer applicable.', 'Clearing skies. One fewer tank.', 'Total cloud cover, then nothing.',
      'Condolences. Briefly.', 'Event concluded.',
    ],
    got_hit: ['Impact noted.', 'Mildly irritating.', 'Damage received. Mood: overcast.', 'Noted, {foe}.', 'That registered.'],
    got_hit_big: [
      'Significant damage. Mood: stormy.', 'This will be remembered, {foe}.', 'Severe weather in my sector.',
      'Warning issued: retaliation.', 'Structural integrity: concerning.',
    ],
    enemy_missed_me: [
      'Missed me.', 'Rainfall detected. Dry.', 'Your shot: wide by metres. Mine: precise.',
      'Calm conditions. Thanks, {foe}.', 'Nothing to report. Except your aim.',
    ],
    self_hit: ['Self-inflicted. Noted.', 'Friendly fire. The friendliest.', 'An unfortunate localised event.', 'No comment.', 'Error in my own forecast.'],
    fall: ['Unplanned descent.', 'Gravity confirmed.', 'Landing recorded. Poorly.'],
    low_hp: ['Damage reserves: depleted.', 'Operating at reduced capacity.', 'Warning: I am fragile.'],
    death: ['Forecast: me, offline.', "That's all. Over.", 'Lights out, {foe}.', 'Signal lost.', 'Structural failure. Noted.'],
    rival_down: ['{foe} is no longer a factor.', 'One less front to track.', 'Skies clearing.'],
    round_win: ['Round concluded. Favourable.', 'Sunny spell. Mine.', 'As forecast.', 'Victory logged.', 'Conditions: pleasant.'],
    round_lose: ['A cold front. Temporary.', 'Adjusting expectations.', 'Result: unfavourable.', 'Rain delay. Next round.', "I'll allow it."],
    match_win: ['Season over. I won it.', 'Long-range forecast: me.', 'Conditions remain favourable.'],
  },

  poet: {
    miss_close: [
      'Oh, how cruelly near! Like love, unreturned!', 'So close, {foe}. My heart aches!', 'A shell sings, but the note falls flat.',
      'Almost! The moon wept.', 'Fate flinched at the last moment.',
    ],
    miss_far: [
      'My shell flew like a lonely prayer.', 'Alas, it kissed only the wind.', 'A sigh of steel, lost in the snow.',
      'The mountain remains unmoved.', 'Even stars miss their mark.',
    ],
    hit: [
      'A wound, but oh, how poetic!', 'My verse found its audience, {foe}.', 'A rhyme of fire and steel!',
      'Sweet impact, like a tender farewell.', 'And so, the stanza lands.',
    ],
    hit_big: [
      'A crescendo of ruin!', 'Behold, the ballad of your hull!', 'Tragedy, beautifully rendered.',
      '{foe}, you are the muse of my cannon.', 'Oh, the drama! The sparks!',
    ],
    kill: [
      'Farewell, {foe}, sweet prince of scrap!', 'A tragedy in one act.', 'You burned brightly, then not at all.',
      'I shall write you an elegy. Later.', 'Curtain, {foe}.',
    ],
    got_hit: [
      'You wound me! Deliciously!', 'Ah, the sting of a thousand sonnets!', 'Cruel {foe}, you break my heart.',
      'A hit! But my spirit endures!', 'Pain is only poetry in disguise.',
    ],
    got_hit_big: [
      'My heart! My hull! My everything!', 'Betrayed by physics itself!', 'This pain will fuel my masterpiece.',
      '{foe}, you shall appear in my memoirs!', 'The agony! The ecstasy!',
    ],
    enemy_missed_me: [
      'You missed me, {foe}. How tragic for you!', 'A shell for me, yet the wind had other plans!', "I felt it pass, like a lover's glance.",
      'A near miss, a fleeting kiss.', 'Ah, your aim, as flighty as spring.',
    ],
    self_hit: [
      'I have wounded myself with my own verse.', 'The cannon is mightier than the pen. Ow.', 'A tragic twist of my own making.',
      'Irony! Delicious irony!', 'Even poets stumble.',
    ],
    fall: ['I fell, but with grace!', 'The earth embraces me, rudely.', 'A dramatic descent.'],
    low_hp: ['I bleed poetry! And hit points!', 'Almost the final stanza.', 'Fading, but fashionably.'],
    death: [
      'Farewell, cruel world! Farewell, {foe}!', 'Write my name in the snow.', 'I die as I lived: dramatically.',
      'Sing of me. Loudly.', 'A tragedy... in too few acts.',
    ],
    rival_down: ['Alas, poor {foe}. I knew them well. Not really.', 'One less voice in the choir.', 'Another star falls from the sky.'],
    round_win: [
      'Victory, sweet as winter plums!', 'The snow bows to my triumph.', 'A round won. A song begun.',
      'Applause, please. Quietly.', 'I am the verse that endures.',
    ],
    round_lose: [
      'Defeat. A mere intermission.', 'The stage is yours, for now.', 'Tears for the fallen. Mine.',
      'I shall return, with a sharper pen.', 'A bitter wine, this loss.',
    ],
    match_win: ['The epic concludes. I am its hero.', 'Let the bards sing of me.', 'The final verse is mine.'],
  },

  robot: {
    miss_close: [
      'TARGET MISSED BY 3.2 METRES. RECALIBRATING.', 'NEAR MISS DETECTED. PROBABILITY OF HIT NEXT: HIGH.', 'ERROR: LUCK DETECTED IN ENEMY SYSTEMS.',
      'ADJUSTING WINDAGE. BEEP.', 'CLOSE. NOT CLOSE ENOUGH. BOOP.',
    ],
    miss_far: [
      'SHOT WIDE. BLAMING WIND.', 'TRAJECTORY UNOPTIMISED. REBOOTING AIM.', 'DATA POINT ACQUIRED. IT WAS BAD.',
      'FIRE-CONTROL: SULKING.', 'ERROR 404: TARGET NOT FOUND.',
    ],
    hit: [
      'DIRECT HIT CONFIRMED. BEEP.', 'DAMAGE APPLIED TO {foe}. SATISFYING.', 'TARGET TAGGED. PROCEEDING.',
      'HIT. EXCELLENT. MORE.', 'IMPACT REGISTERED. LOGGING JOY.',
    ],
    hit_big: [
      'CRITICAL DAMAGE TO {foe}. WONDERFUL.', 'SYSTEMS INDICATE: OUCH. FOR THEM.', 'MAXIMUM EFFICIENCY ACHIEVED.',
      'OVERKILL IS JUST KILL WITH FLAIR.', '{foe}: STRUCTURAL FAILURE IMMINENT.',
    ],
    kill: [
      '{foe} DELETED.', 'TARGET NEUTRALISED. HAVE A NICE DAY.', 'ERASING {foe} FROM THE LEADERBOARD.',
      'UNIT {foe}: OFFLINE.', 'OBJECTIVE COMPLETE. BEEP.',
    ],
    got_hit: ['DAMAGE DETECTED. UNACCEPTABLE.', 'OW. (SIMULATED.)', 'HULL BREACH. MILDLY.', '{foe} ADDED TO GRUDGE LIST.', 'LOGGING INCIDENT.'],
    got_hit_big: [
      'CRITICAL DAMAGE. PANICKING POLITELY.', 'WARNING WARNING WARNING.', 'SYSTEMS FAILING. EMOTIONALLY.',
      '{foe}: PRIORITY TARGET.', 'THAT WAS NOT IN THE SPEC.',
    ],
    enemy_missed_me: [
      'MISSED ME. LOGGING YOUR INCOMPETENCE.', '{foe} ACCURACY: 0%. DELIGHTFUL.', 'SHELL AVOIDED. PROBABLY SKILL.',
      'YOUR AIM: NEEDS A PATCH.', 'MISS DETECTED. BEEP BEEP.',
    ],
    self_hit: ['SELF-DAMAGE DETECTED. EXPECTED.', 'FRIENDLY FIRE: ENABLED.', 'ERROR: AIMED AT SELF.', 'PLEASE IGNORE THAT.', 'SELF-TEST FAILED.'],
    fall: ['FALL DETECTED. SUSPENSION: OK-ISH.', 'GRAVITY: UNEXPECTED.', 'LANDING: SUBOPTIMAL.'],
    low_hp: ['POWER LOW. SPIRITS: STILL HIGH.', 'WARNING: STRUCTURAL INTEGRITY.', 'NOT FINISHED YET. BEEP.'],
    death: [
      'SHUTTING DOWN. TELL MY CODE I LOVED IT.', 'SYSTEM FAILURE. BEEP.', 'CRITICAL ERROR. GOODBYE, {foe}.',
      'POWERING DOWN...', 'BLUE SCREEN OF DEATH.',
    ],
    rival_down: ['{foe} OFFLINE. RECALCULATING ODDS.', 'ONE FEWER VARIABLE.', 'THREAT COUNT REDUCED.'],
    round_win: ['ROUND COMPLETE. SUCCESS.', 'VICTORY.EXE LOADED.', 'I WIN. BEEP.', 'OPTIMAL OUTCOME ACHIEVED.', 'CELEBRATION SUBROUTINE: ACTIVE.'],
    round_lose: ['ROUND LOST. LEARNING.', 'DEFEAT REGISTERED. REBOOTING.', 'ADJUSTING STRATEGY. SLIGHTLY.', 'SORRY. NOT SORRY.', 'NEXT ROUND: BETTER.'],
    match_win: ['MATCH WON. WORLD DOMINATION NEXT.', 'ALL YOUR BASE ARE MINE.', 'I AM THE CHAMPION. BEEP.'],
  },

  // shared by everyone
  any: {
    fire_claymore: ['Surprise!', 'Hope you like confetti.', 'Five for the price of one.', 'Fragmenting, as promised.'],
    fire_acid: ["Hope you weren't fond of the paint.", 'Something corrosive this way comes.', 'Slime time.', "That's going to sting. And melt."],
    fire_coil: ['Too fast to dodge.', "Blink and you'll miss it.", 'Rail time.', 'Zip. Done.'],
    fire_signal: ['Look up.', 'A satellite sends its regards.', 'Stand still. Please.', 'Orbital courtesy call.'],
    fire_terminus: ['Sorry about the crater.', "This one's called Big Bertha.", 'Duck.', 'Heavy mail, incoming.'],
    round_draw: ['Well. That was mutual.', 'Nobody wins. Everybody loses.', 'We all did great. Terribly.', 'Draw! Tidy.'],
  },
};

function personaFor(name) {
  if (PERSONA_BY_NAME[name]) return PERSONA_BY_NAME[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PERSONA_KEYS[h % PERSONA_KEYS.length];
}

// Pick a line for `tank` in `situation`, avoiding its recent lines. Uses Math.random so that
// banter never perturbs the seeded gameplay RNG.
function pickTaunt(tank, situation, foeName) {
  const own = TAUNTS[personaFor(tank.name)];
  const pool = (own && own[situation]) || TAUNTS.any[situation];
  if (!pool || !pool.length) return null;
  const recent = tank.recentLines || (tank.recentLines = []);
  let options = pool.filter((l) => !recent.includes(l));
  if (!options.length) options = pool;
  const line = options[Math.floor(Math.random() * options.length)];
  recent.push(line);
  if (recent.length > 24) recent.shift();
  return line.replace(/\{foe\}/g, foeName || 'friend');
}
