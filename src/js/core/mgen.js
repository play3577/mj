/**
 * This is the difficult file in the code base. It's the part that's responsible for
 * taking a set of "free" tiles, and sets of locked tiles, and figure out:
 *
 *   1. which free tiles can form which sets by claiming which single tile
 *   2. which possible combinations of sets all free tiles can form
 *   3. whether a combination of free + locked tiles is a win or not.
 */


// hash a tile requirement object to a compact string form.
function hash(set) {
  let s = `${set.type}`;
  if (set.subtype) { s = `${s}s${set.subtype}`; }
  if (set.type===Constants.PAIR || set.type===Constants.CHOW) { s = `${s}t${set.tile}`; }
  return s;
}


// unhash a tile requirement object from its compact string form.
function unhash(print, tile) {
  let re = /(\d+)(s(-?\d+))?(t(\d+))?/;
  let m = print.match(re);
  let type = parseInt(m[1]);
  let subtype = m[3] ? parseInt(m[3]) : undefined;
  let required = tile;
  if (type===Constants.CHOW) tile -= subtype;
  let obj = { required, type, subtype, tile };
  return obj;
}


/**
 *
 */
class Pattern {
  constructor(tiles=[], canChow=false) {
    this.keys = [];
    this.tiles = {};
    tiles.slice().sort((a,b)=>a-b).forEach(v => {
      if (this.tiles[v] === undefined) {
        this.tiles[v] = 0;
      }
      this.tiles[v]++;
      this.keys.push(v);
    });
    this.canChow = canChow;
  }

  /**
   *
   */
  copy() {
    let p = new Pattern([], this.canChow);
    p.keys = this.keys.slice();
    p.keys.forEach(k => (p.tiles[k] = this.tiles[k]));
    return p;
  }

  /**
   *
   */
  remove(tiles) {
    if (!tiles.forEach) tiles = [tiles];
    tiles.forEach(t => {
      this.tiles[t]--;
      if (this.tiles[t] === 0) {
        delete this.tiles[t];
        this.keys = Object.keys(this.tiles).sort((a,b)=>a-b);
      }
    });
  }

  /**
   *
   */
  getSuit(tile) {
    return ((tile/9)|0);
  }

  /**
   *
   */
  matchSuit(tile, suit) {
    return this.getSuit(tile) === suit;
  }

  /**
   *
   */
  getChowInformation(tile) {
    let suit = (tile / 9)|0;
    let t1 = this.tiles[tile+1];
    if (t1 !== undefined && !this.matchSuit(tile + 1, suit)) t1 = undefined;
    let t2 = this.tiles[tile+2];
    if (t2 !== undefined && !this.matchSuit(tile + 2, suit)) t2 = undefined;
    return { t1, t2, suit};
  }

  /**
   *
   */
  checkForChow(tile, result) {
    if (!this.canChow) return;
    if (tile > 26) return;
    let {t1, t2, suit} = this.getChowInformation(tile);
    if (t1 || t2) {
      let set = [], remove;
      if (t1 && t2) { // this is already a chow!
        set.push({ required: false, type: Constants.CHOW, tile });
        remove = [tile, tile+1, tile+2];
      }
      else if (t1) { // connected pair, we need either a first or last tile.
        if (this.matchSuit(tile - 1, suit)) set.push({ required: tile-1, type: Constants.CHOW1, tile });
        if (this.matchSuit(tile + 2, suit)) set.push({ required: tile+2, type: Constants.CHOW3, tile });
        remove = [tile, tile + 1];
      }
      else if (t2) { // gapped pair, we need the middle tile.
        set.push({ required: tile+1, type: Constants.CHOW2, tile });
        remove = [tile, tile + 2];
      }
      this.recurse(remove, set, result);
    }
  }

  /**
   *
   */
  recurse(processed, set, result) {
    set.forEach(s => {
      if (s.required) {
        let tile = s.required
        if (!result[tile]) result[tile] = [];
        let print = hash(s);
        let list = result[tile];
        if (list.indexOf(print) === -1) list.push(print);
      }
    });
    let downstream = this.copy();
    downstream.remove(processed);
    if (downstream.keys.length > 0) downstream.expand(result);
  }

  /**
   *
   */
  expand(result=[]) {
    let tile = this.keys[0]|0;
    let count = this.tiles[tile];

    if (count===4) {
      // special case: if we already have four, we have all
      // the tiles that are in the game, and there isn't going
      // to be any discard to claim.
      let set = [{ required: false, type: Constants.KONG, tile }];
      this.recurse([tile, tile, tile, tile], set, result);
    } else {
      this.checkForChow(tile, result);
      if (count===1) {
        // We cannot claim pairs "normally", so we do not record it.
        // But, in crazy rulesets where we could claim pairs, the
        // following code would be required:
        //
        // let set = [{ required: tile, type: Constants.PAIR, tile }];
        // this.recurse([tile], set, result);
      }
      if (count===2) {
        let set = [
          { required: false, type: Constants.PAIR, tile },
          { required: tile, type: Constants.PUNG, tile }
        ];
        this.recurse([tile, tile], set, result);
      }
      if (count===3) {
        let set = [
          { required: false, type: Constants.PAIR, tile },
          { required: false, type: Constants.PUNG, tile },
          { required: tile, type: Constants.KONG, tile }
        ];
        this.recurse([tile, tile, tile], set, result);
      }
    }
    return result;
  }

  /**
   *
   */
  markWin(results, tile, subtype) {
    if (!results[tile]) results[tile] = [];
    let print = hash({type: Constants.WIN, tile, subtype});
    if (results[tile].indexOf(print) === -1) results[tile].push(print);
  }

  /**
   *
   */
  recurseForWin(composed, processed, results, single, pair, set, path) {
    let downstream = this.copy();
    downstream.remove(processed);

    // Do we need to keep going?
    if (downstream.keys.length > 0) {
      downstream.determineWin(composed, results, single, pair, set);
    }

    // We do not. What's the conclusion for this chain?
    else {
      if (set.length===4 && pair.length===1 && single.length===0) {
        if (!results.win) results.win = [];
        results.win.push({pair, set});
      }
      else if (set.length===4 && pair.length===0 && single.length===1) {
        this.markWin(results, single[0], Constants.PAIR);
      }
      else if (set.length===3 && pair.length===2) {
        this.markWin(results, pair[0], Constants.PUNG);
        this.markWin(results, pair[1], Constants.PUNG);
      }
      else if (set.length===3 && pair.length===1 && single.length===2) {
        if (single[1] < 27 && single[0] + 1 === single[1]) {
          let t1 = single[0]-1, s1 = this.getSuit(t1),
              b0 = single[0],   s2 = this.getSuit(b0),
              b1 = single[1],   s3 = this.getSuit(b1),
              t2 = single[1]+1, s4 = this.getSuit(t2);
          if(s1 === s2 && s1 === s3) this.markWin(results, t1, Constants.CHOW1);
          if(s4 === s2 && s4 === s3) this.markWin(results, t2, Constants.CHOW3);
        }
        else if (single[1] < 27 && single[0] + 2 === single[1]) {
          this.markWin(results, single[0]+1, Constants.CHOW2);
        }
      }
    }
  }

  /**
   * Determine which set compositions are possible
   * with the current list of tiles.
   */
  determineWin(paths=[], results=[], single=[], pair=[], set=[]) {
    //console.log(`called with:`, pair, set, `- local tiles:`, this.tiles);

    if (!this.keys.length) {
      // It's possible the very first call is already for a complete,
      // and entirely locked, hand. In that case, return early:
      if (set.length===4 && pair.length===1 && single.length===0) {
        if (!results.win) results.win = [];
        results.win.push({pair, set});
      }
      return { results, paths };
    }

    // Otherwise, let's get determine-y:

    let tile = this.keys[0];
    let count = this.tiles[tile];
    let head = [];
    let toRemove = [];

    if (count>3) {
      head=[`4k-${tile}`];
      paths.push(head);
      toRemove = [tile, tile, tile, tile];
      this.recurseForWin(head, toRemove, results, single, pair, set.concat(head), paths);
    }

    if (count>2) {
      head=[`3p-${tile}`];
      paths.push(head);
      toRemove = [tile, tile, tile];
      this.recurseForWin(head, toRemove, results, single, pair, set.concat(head), paths);
    }

    if (count>1 && pair.length<1) {
      head=[`2p-${tile}`];
      paths.push(head);
      toRemove = [tile, tile];
      this.recurseForWin(head, toRemove, results, single, pair.concat([tile]), set, paths);
    }

    if (count===1) {
      this.recurseForWin(paths, [tile], results, single.concat([tile]), pair, set, paths);
    }

    if (tile > 26) return { results, paths };

    let {t1, t2} = this.getChowInformation(tile);

    if (t1 && t2) {
      head=[`3c-${tile}`];
      paths.push(head);
      toRemove = [tile, tile+1, tile+2];
      this.recurseForWin(head, toRemove, results, single, pair, set.concat(head), paths);
    }

    return { results, paths };
  }
} // end of Pattern class


/**
 *
 */
function unroll(list, seen=[], result=[]) {
  list = list.slice();
  seen.push(list.shift());
  if (!list.length) result.push(seen);
  else list.forEach(tail => unroll(tail, seen.slice(), result));
  return result;
}


/**
 *
 */
function tilesNeeded(tiles, locked=[], canChow=false, winningPattern=false) {
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

    return (s.length===3) ? `3p-${t}-!` : `4k-${t}-!`;
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



if (typeof process !== "undefined") {
  Constants = require('../../config.js').Constants;

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
    }
  ]

  tests.forEach((test,tid) => {
    if (tid < 3) return;

    let hand = test.hand;
    let locked = lock(test.locked);
    console.log();
    console.log(`current hand: ${hand}`);
    console.log(`locked: ${list(locked)}`);
    console.log(`result:`);
    console.log(tilesNeeded(hand, locked, false));
  });

  module.exports = tilesNeeded;
}