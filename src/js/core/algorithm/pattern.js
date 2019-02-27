if (typeof process !== "undefined") {
  let hp = require("./hash-printing.js");
  hash = hp.hash;
  unhash = hp.unhash;
}


/**
 * This is the difficult file in the code base. It's the part that's responsible for
 * taking a set of "free" tiles, and sets of locked tiles, and figure out:
 *
 *   1. which free tiles can form which sets by claiming which single tile
 *   2. which possible combinations of sets all free tiles can form
 *   3. whether a combination of free + locked tiles is a win or not.
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
   * a factory version of a copy constructor
   */
  copy() {
    let p = new Pattern([], this.canChow);
    p.keys = this.keys.slice();
    p.keys.forEach(k => (p.tiles[k] = this.tiles[k]));
    return p;
  }

  /**
   * Remove a set of tiles from this pattern. If this
   * causes the number of tiles for a specific tile
   * face to reach 0, remove that tile from the tile set.
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
   * utility function to get the suit for an (assumed suited) tile.
   */
  getSuit(tile) {
    return ((tile/9)|0);
  }

  /**
   * utility function for confirming a specific tile is of a specific suit.
   */
  matchSuit(tile, suit) {
    return this.getSuit(tile) === suit;
  }

  /**
   * This lets us knowin whether or not there are a entries for [tile+1]
   * and [tile+2] in this hand, which lets us make decisions around whether
   * chows are a valid play strategy or not.
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
   * Part of `expand()`, but refactored into its own function: this code
   * checks to see whether a tile can be used to form a chow or not.
   * If it can, branch-recurse for all possible chow patterns (and it
   * could be used in up to three chow pattersn).
   */
  checkForChow(tile, result) {
    if (tile > 26) return false;
    if (!this.canChow) return false;
    let handled = false;
    let {t1, t2, suit} = this.getChowInformation(tile);
    if (t1 || t2) {
      let set = [], remove;
      if (t1 && t2) { // this is already a chow!
        set.push({ required: false, type: Constants.CHOW, tile });
        remove = [tile, tile+1, tile+2];
        handled = true;
      }
      else if (t1) { // connected pair, we need either a first or last tile.
        if (this.matchSuit(tile - 1, suit)) set.push({ required: tile-1, type: Constants.CHOW1, tile });
        if (this.matchSuit(tile + 2, suit)) set.push({ required: tile+2, type: Constants.CHOW3, tile });
        remove = [tile, tile + 1];
        handled = true;
      }
      else if (t2) { // gapped pair, we need the middle tile.
        set.push({ required: tile+1, type: Constants.CHOW2, tile });
        remove = [tile, tile + 2];
        handled = true;
      }
      this.recurse(remove, set, result);
    }
    return handled;
  }

  /**
   * Not which tile(s) is/are required to form the
   * set we were called with, remove the tiles that
   * were used to determine that set, and then recurse
   * if there are tiles left to work with.
   */
  recurse(processed, set, result) {
    //console.debug(`removing ${processed}, set:`,set);
    set.forEach(s => {
      if (s.required !== false && s.required !== undefined) {
        let tile = s.required;
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
   * Convert this pattern of loose tiles into a list
   * of possible sets that can be played for with those
   * tiles. We run this recursively by picking the first
   * tile, seeing what we can form with it, and then
   * branch-expanding for each possible set we can form.
   */
  expand(result=[]) {
    let tile = this.keys[0]|0;
    let count = this.tiles[tile];

    //console.debug(`expanding using ${tile} (there are ${count} of this tile)`);

    if (count===4) {
      // special case: if we already have four, we have all
      // the tiles that are in the game, and there isn't going
      // to be any discard to claim.
      let set = [{ required: false, type: Constants.KONG, tile }];
      this.recurse([tile, tile, tile, tile], set, result);
    } else {
      // But, if this is not a kong, then we'll want to see if we
      // can form a chow with this tile, even if it's already
      // involved in pair/pungs
      let handled = this.checkForChow(tile, result);
      if (!handled && count===1) {
        // We cannot claim pairs "normally", so we do not record it.
        // But, in crazy rulesets where we could claim pairs, the
        // following code would be required:
        //
        // let set = [{ required: tile, type: Constants.PAIR, tile }];
        //
        // and the "checked" conditional should be removed. However,
        // it's there for a good reason: without it, chows get reduced
        // by one tile, and then we end up in a situation where our
        // hand has [1,2,3] but because we chomped [1] the check for
        // the subsequent [2,3] will go "oh, we need 1!" and then a
        // bot will happily have [1,2,3], claim [1] for a chow and
        // then immediately discard the left over [1], which is dumb.
        let set = [];
        this.recurse([tile], set, result);
      }

      // If we have 2 of the same tile, then we have a pair, and
      // we can form a pung if we just get one more.
      if (count===2) {
        let set = [
          { required: false, type: Constants.PAIR, tile },
          { required: tile, type: Constants.PUNG, tile }
        ];
        this.recurse([tile, tile], set, result);
      }

      // If we have 3 of the same tile, then we have a pung,
      // which implies we also have a pair, and we can form
      // a kong if we just get one more.
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
   * add a set's hashprint to the list of winpath results
   */
  markWin(results, tile, subtype) {
    if (!results[tile]) results[tile] = [];
    let print = hash({type: Constants.WIN, tile, subtype});
    if (results[tile].indexOf(print) === -1) results[tile].push(print);
  }

  /**
   * The recursion function for `determineWin`, this function checks whether
   * a given count combination of singles, pairs, and sets constitutes a
   * winning combination (e.g. 4 sets and a pair is a winning path, but
   * seven singles and two pairs definitely isn't!)
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
      // four sets and a pair is totally a winning path.
      if (set.length===4 && pair.length===1 && single.length===0) {
        if (!results.win) results.win = [];
        results.win.push({pair, set});
      }
      // four sets and a single is one tile away from winning.
      else if (set.length===4 && pair.length===0 && single.length===1) {
        this.markWin(results, single[0], Constants.PAIR);
      }
      // three sets and two pairs are one tile away from winning.
      else if (set.length===3 && pair.length===2) {
        this.markWin(results, pair[0], Constants.PUNG);
        this.markWin(results, pair[1], Constants.PUNG);
      }
      // three sets, a pair, and two singles MIGHT be one tile away from winning.
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
      // everything else is not close enough to a win to reason about.
    }
  }

  /**
   * Determine which set compositions are possible with the current
   * list of tiles. Specifically, which count combination of singles,
   * pairs, and sets can we make with these tiles?
   */
  determineWin(paths=[], results=[], single=[], pair=[], set=[]) {
    //console.debug(`called with:`, pair, set, `- local tiles:`, this.tiles);

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

    let tile = (this.keys[0]|0); // remember: object keys are strings, we need to (int) them,
    let count = this.tiles[tile];
    let head = [];
    let toRemove = [];

    //console.debug(`evaluating tile`,tile);

    // If we're holding a kong, recurse with the set count increased by one,
    // which we do by adding this kong's hash print to the list of known sets.
    if (count>3) {
      head=[`4k-${tile}`];
      paths.push(head);
      toRemove = [tile, tile, tile, tile];
      this.recurseForWin(head, toRemove, results, single, pair, set.concat(head), paths);
    }

    // If we're (implied or only) holding a pung, also recurse with the set count increased by one.
    if (count>2) {
      head=[`3p-${tile}`];
      paths.push(head);
      toRemove = [tile, tile, tile];
      this.recurseForWin(head, toRemove, results, single, pair, set.concat(head), paths);
    }

    // If we're (implied or only) holding a pair, also recurse with the pair count increased by one.
    if (count>1) {
      head=[`2p-${tile}`];
      paths.push(head);
      toRemove = [tile, tile];
      this.recurseForWin(head, toRemove, results, single, pair.concat([tile]), set, paths);
    }

    // And of course, the final recursion is for treating the tile as "just a single".
    if (count===1) {
      this.recurseForWin(paths, [tile], results, single.concat([tile]), pair, set, paths);
    }

    // Now, if we're dealing with honour tiles, this is all we need to do.
    if (tile > 26) return { results, paths };

    // but if we're dealing with a suited number tile, we also need to check for chows.
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



// Node context
if (typeof process !== "undefined") {
  module.exports = Pattern;
}
