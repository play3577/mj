if (typeof process !== "undefined") {
  Pattern = require("./pattern.js");
  unroll = require('../utils/utils.js').unroll;
}


/**
 * A helper function for summary prints
 */
function summarise(set) {
  if (!set.map && !set.forEach) return set;
  set = set.map(t => t.getTileFace ? t.getTileFace() : t).sort();

  // pairs
  let t = set[0];
  t = t.getTileFace ? t.getTileFace() : t;
  if (set.length===2) return `pair${t}`; // special notation for easy extraction
  // chows
  let u = set[1];
  u = u.getTileFace ? u.getTileFace() : u;
  if (t !== u) return `3c-${t}-!`;
  // pung and kong
  if (set.length===3) return `3p-${t}-!`;
  if (set.length===4) return `4k-${t}-${set.concealed ? set.concealed : `!`}`;
}


/**
 * This function uses the Pattern class to determine which tiles
 * a player might be interested in, to form valid hands. And,
 * if they already have a winning hand, how many interpretations
 * of the tiles involved there might be.
 */
function tilesNeeded(tiles, locked=[], canChow=false) {
  // console.debug('tilesNeeded:', tiles, locked);
  let p = new Pattern(tiles, canChow);

  // Transform the "locked tiles" listing to
  // a form that the rest of the code understands.
  locked = locked.map(summarise).filter(v => v);

  // Extract the pair, if there is one.
  let pair = [];
  locked.some((set,pos) => {
    if (set.indexOf('pair')===0) {
      let tile = parseInt(set.substring(4));
      pair.push(tile)
      locked.splice(pos,1);
      return true;
    }
  });

  // FIXME: we lose the "locked" state for the pair here.

  // Then run a pattern expansion!
  let {results, paths} = p.expand(pair, locked);

  // Is this a winning hand?
  let winpaths = (results.win || []).map(path => ['2p-' + path.pair[0] + (path.pair[0]===pair[0]?'-!':''), ...path.set]);
  let winner = (winpaths.length > 0);

  // Is this a waiting hand?
  delete results.win;
  let lookout = results;
  let waiting = !winner && lookout.some(list => list.some(type => type.indexOf('32')===0));

  // Form all compositional paths that our unlocked tiles can take,
  // because someone might not want to immediately win! (I know, crazy!)
  paths = paths.map(path => unroll(path));
  let composed = paths.map(path => path[0]);

  // And that's all the work we need to do.
  return { lookout, waiting, composed, winner, winpaths};
};


// ====================================
//         TESTING CODE
// ====================================


if (typeof process !== "undefined") { (function() {

  module.exports = tilesNeeded;

  // shortcut if this wasn't our own invocation
  let path = require('path');
  let invocation = process.argv.join(' ');
  let filename = path.basename(__filename)
  if (invocation.indexOf(filename) > -1) {

    conf = require('../../../config.js');
    Logger = conf.LOGGER;
    Constants = conf.Constants;

    // local:
    let create = t => ({ dataset: { tile: t }, getTileFace: () => t }),
        lock = l => l.map(s => s.map(t => create(t))),
        list = l => l.map(s => s.map(t => t.getTileFace()));

    // global:
    lineNumber = 0;

    let tests = [
      {
        title: "winning mixed hand",
        hand: [7,7,7, 15,15, 19,20,21, 22,23,24],
        locked: [
          [24,26,25]
        ],
        win: true
      },
      {
        title: "winning hand with single hidden pung",
        hand: [32,32,32],
        locked: [
          [1,2,3],
          [2,3,4],
          [5,6,7],
          [6,6]
        ],
        win: true
      },
      {
        title: "winning hand with single hidden pung, exposed kong",
        hand: [32,32,32],
        locked: [
          [26,24,25],
          [1,2,3],
          [30,30,30,30],
          [31,31]
        ],
        win: true
      },
      {
        title: "winning hand, no tiles left in hand",
        hand: [],
        locked: [
          [5,5,5,5],
          [14,14,14],
          [18,20,19],
          [13,12,11],
          [33,33]
        ],
        win: true
      },
      {
        title: "winning hand with a kong, no tiles left in hand",
        hand: [],
        locked: [
          [10,10,10],
          [19,19,19],
          [20,22,21],
          [29,29,29,29],
          [31,31]
        ],
        win: true
      },
      {
        title: "winning hand, ambiguous pung/chow",
        hand: [14,15,16,22,23,24,24,24],
        locked: [
          [10,11,12],
          [20,21,22]
        ],
        win: true
      },
      {
        title: "waiting hand, needs 18 or 30",
        hand: [18,18,27,27,27,30,30,32,32,32],
        locked: [
          [20,22,21]
        ],
        win: false,
        need: [[18], [30]]
      },
      {
        title: "not a waiting hand, illegal win if 9 is claimed to form 8,9,10 (mixed suit)",
        hand: [26,26,11,11,11,8,10],
        locked: [
          [29,29,29],
          [25,24,23]
        ],
        win: false,
        waiting: false
      },
      {
        title: "waiting on a gapped chow",
        hand: [4,5,6, 9,10,11, 12,14, 15,15],
        locked: [
          [20,21,22]
        ],
        win: false,
        waiting: true,
        need: [[13]]
      },
      {
        title: "can chow on a characters one (9)",
        hand: [2,6,7,8,10,11,11,12,13,14,17,17,32],
        locked: [],
        win: false,
        waiting: false,
        want: [[9]]
      }
    ]

    tests.forEach((test,tid) => {
      let hand = test.hand;
      let locked = lock(test.locked);

      console.log(`--------------------------`);
      console.log(`test ${tid}: ${test.title}`);
      console.log(`current hand: ${hand}`);
      console.log(`locked: ${list(locked)}`);

      let result = tilesNeeded(hand, locked, false);
      if (test.win) {
        if (result.winpaths===0) {
          console.log(`test ${tid} failed: winning hand was not detected as winning.`);
        } else {
          console.log(`test ${tid} passed: winning hand was detected as such.`);
        }
      }

      if (test.waiting === false) {
        if (result.waiting === false) {
          console.log(`test ${tid} passed: non-waiting hand was detected as such.`);
        } else {
          console.log(`test ${tid} failed: non-waiting hand was detected as ${result.winner ? `winning`:`waiting`}.`);
        }
      }

      if (test.need) {
        if (test.need.every(tile => result.lookout[tile] && result.lookout[tile].some(type => type.indexOf('32')===0))) {
          console.log(`test ${tid} passed: all possible win tiles were flagged as lookout.`);
        } else {
          console.log(`test ${tid} failed: not all tiles required to win are marked as lookout.`);
          console.log(result.lookout.map((e,i) => ({ id:i, type: e})));
        }
      }

      if (test.want) {
        if (test.want.every(tile => !!result.lookout[tile])) {
          console.log(`test ${tid} passed: all wanted tiles were flagged as lookout.`);
        } else {
          console.log(`test ${tid} failed: not all wanted tiles are marked as lookout.`);
          console.log(result.lookout.map((e,i) => ({ id:i, type: e})));
        }
      }
    });
  }
})()}
