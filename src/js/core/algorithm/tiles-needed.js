/**
 * A tree to list-of-paths unrolling function.
 */
function unroll(list, seen=[], result=[]) {
  list = list.slice();
  seen.push(list.shift());
  if (!list.length) result.push(seen);
  else list.forEach(tail => unroll(tail, seen.slice(), result));
  return result;
}

/**
 * This function uses the Pattern class to determine which tiles
 * a player might be interested in, to form valid hands. And,
 * if they already have a winning hand, how many interpretations
 * of the tiles involved there might be.
 */
function tilesNeeded(tiles, locked=[], canChow=false) {
  let p = new Pattern(tiles, canChow);

  // Transform the "locked tiles" listing to
  // a form that the rest of the code understands.
  let pair = [];

  // Due to the various places we call tilesNeeded, locked could
  // contain have either [1,...] or [<span data-tile="tile">,...]
  locked = locked.map(s => {
    if (!s.map && !s.forEach) return s;

    let t = s.sort()[0];
    t = t.dataset ? t.dataset.tile : t;
    if (s.length===2) { pair.push(`${t}-!`); return false; }

    let u = s[1];
    u = u.dataset ? u.dataset.tile : u;
    if (t !== u) return `3c-${t}-!`;

    if (s.length===3) return `3p-${t}-!`;

    if (s.length===4) return `4k-${t}-${s.concealed ? s.concealed : `!`}`;
  }).filter(v => v);

  // Then figure out which tiles we might be on the lookout
  // for, based on the tiles currently in our hand.
  let lookout = p.copy().expand();

  // Also check to see if there is some way for use to
  // win with a single claim, or even whether we have
  // a winning hand, right now.
  let {results, paths} = p.copy().determineWin([], [], [], pair, locked);

  let winpaths = (results.win || []).map(path => ['2p-' + path.pair[0], ...path.set]);

  delete results.win;
  let winner = (winpaths.length > 0);
  let waiting = (results.length > 0);

  // Any tile we need to win overrides whatever other
  // reason we needed that tile for:
  results.forEach((l,idx) => lookout[idx] = l);

  // Then, form all compositional paths that our unlocked tiles can take.
  paths = paths.map(path => unroll(path));
  let composed = paths.map(path => path[0]);

  // If we have any compositional paths left, we could
  // already have a winning pattern in our hand, as long
  // as there is only one pair between `composed` and
  // `locked`, so... let's check:
  return { lookout, waiting, composed, winner, winpaths};
};


// ====================================
//         TESTING CODE
// ====================================


if (typeof process !== "undefined") { (function() {

  conf = require('../../../config.js');
  Pattern = require('./algorithm/pattern.js/index.js');
  Logger = conf.LOGGER;
  Constants = conf.Constants;
  module.exports = tilesNeeded;

  // shortcut if this wasn't our own invocation
  let invocation = process.argv.join(' ');
  if (invocation.indexOf('mgen.j') === -1) return;

  // local:
  let hand, locked,
      create = t => ({ dataset: { tile: t } }),
      lock = l => l.map(s => s.map(t => create(t)));

  // global:
  list = l => l.map(s => s.map(t => t.dataset.tile));
  lineNumber = 0;

  let tests = [
    {
      hand: [7,7,7, 15,15, 19,20,21, 22,23,24],
      locked: [
        [24,26,25]
      ]
    },
    {
      hand: [32,32,32],
      locked: [
        [26,24,25],
        [1,2,3],
        [30,30,30,30],
        [31,31]
       ]
    },
    {
      hand: [],
      locked: [
        [5,5,5,5],
        [14,14,14],
        [18,20,19],
        [13,12,11],
        [33,33]
      ]
    },
    {
      hand: [],
      locked: [
        [10,10,10],
        [19,19,19],
        [20,22,21],
        [29,29,29,29],
        [31,31]
      ]
    },
    {
      hand: [14,15,16,22,23,24,24,24],
      locked: [
        [10,11,12],
        [20,21,22]
      ]
    },
    {
      hand: [18,18,27,27,27,30,30,32,32,32],
      locked: [
        [20,22,21]
      ]
    },
    {
      hand: [32,32,32],
      locked: [
        [1,2,3],
        [2,3,5],
        [5,6,7],
        [6,6]
      ]
    },
    {
      hand: [0,0,10,10,12,13,16,17,17,27,29,31,32],
      locked: []
    },
    {
      hand: [14,15,2,22,27,3,3,31,32,4,5,5,6],
      locked: []
    }
  ]

  tests.forEach((test,tid) => {
    if (tid < 8) return;

    let hand = test.hand;
    let locked = lock(test.locked);
    console.log();
    console.log(`current hand: ${hand}`);
    console.log(`locked: ${list(locked)}`);
    console.log(`result:`);
    console.log(
      tilesNeeded(hand, locked, false)
    );
  });

})()}
