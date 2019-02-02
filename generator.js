/**
 * This object takes a hand in the form of a heap of concealed tiles,
 * and an ordered set of declared sets, and determines which tiles
 * are required to form a good hand, and which tiles should be
 * discarded while the required tiles are being picked up.
 */

const Constants = {
  NOTHING:        -1,
  SINGLE:          0,
  GAPPED:          1,
  CONNECTED:       2,
  CHOW:            4,
  PAIR:            8,
  PUNG:           16,
  KONG:           32,
  CONCEALED_KONG: 64,
  SET:           128,
  REQUIRED:      256,
  WIN:           512,
};

const getTileType = (tile, tiles) => {
  var bestType = Constants.SINGLE;

  // progressively test for pair/pung/kong
  var count = tiles.reduce((sum,v) => (v === tile) ? sum+1 : sum, 0);
  if (count===3) bestType = Constants.KONG;
  if (count===2) bestType = Constants.PUNG;
  if (count===1) bestType = Constants.PAIR;

  // We can't chow honours. This might "break" some rule sets in which you're allowed
  // to form a ESWN chow, or an FCP chow, but we're going to ignore those for now.
  if (tile > 26) return bestType;

  var suit = (tile/9)|0;
  var face = tile % 9;
  var test = [tile-2, tile-1, tile+1, tile+2];
  var [p2, p1, n1, n2] = test.map(v => tiles.indexOf(v) > - 1);

  if(face>=2 && (p1||p2)) {
      if (!p1) { bestType = Math.max(bestType, Constants.GAPPED); }
      else if(!p2) { bestType = Math.max(bestType, Constants.CONNECTED); }
      else { bestType = Math.max(bestType, Constants.CHOW); }
  }

  if(face >=1 && face <= 7 && (p1||n1)) {
      if(!p1 || !n1) { bestType = Math.max(bestType, Constants.CONNECTED); }
      else { bestType = Math.max(bestType, Constants.CHOW); }
  }

  if(face <= 6 && (n1||n2)) {
      if (!n1) { bestType = Math.max(bestType, Constants.GAPPED); }
      else if (!n2) { bestType = Math.max(bestType, Constants.CONNECTED); }
      else { bestType = Math.max(bestType, Constants.CHOW); }
  }

  return bestType;
};



class Generator {
// generate the set of (reasonably) possible hands
generate(tiles) {
  return this.expand(tiles.slice(0).sort((a,b) => a-b));
}

// Generate all possible answers to the question "what do
// we need to discard, and what do we need to pick up, to
// get to a good hand?", using the provided information.
expand(sorted) {
  var t = sorted.length,
      tileNumber,
      pruned = [],
      tileTypes = [],
      singles = 0,
      results = { required: [], role: [], discard: [] };

  // first, determine "what do I have in my hand involving each tile"?
  while(t-->0) {
    tileNumber = sorted[t];
    pruned = sorted.slice(0);
    pruned.splice(t,1);
    tileTypes[t] = getTileType(tileNumber, pruned);
    if (tileTypes[t] === Constants.SINGLE) singles++;
  }

  // Then, filter out all the single tiles. Except for a limit
  // hand, or hands that only require a pair to be a winning hand,
  // single tiles do not contribute to a good stategy.
  t = sorted.length;
  while(t-->0) {
    if(tileTypes[t]===Constants.SINGLE) {
      let tile = sorted.splice(t,1)[0];
      if (singles === 1) {
        results.required.push(tile);
        results.role.push(Constants.WIN);
      } else {
        results.discard.push(tile);
      }
      tileTypes.splice(t,1);
    }
  }

  // With the remaining good tiles, and a knowledge of which
  // patterns they can be used in, determine which tiles we
  // would need to form full sets.
  //
  // (How the hand is then actually finished is entirely up
  // to the A.I. "speed vs. score vs. not losing" algorithm.)
  for(let t=0, p; t<sorted.length; t++) {
    p = this.fulfill(t, sorted, tileTypes);
    if(p.tile) {
      results.required.push(p.tile);
      results.role.push(p.type);
    }
  }

  var match = 1;
  while(tileTypes.length && match <= Constants.WIN) {
    t = tileTypes.length;
    let bin = [];
    while(t--) {
      if(tileTypes[t]===match) {
        let tile = sorted[t];
        if (results.required.indexOf(tile) === -1) {
          bin.push(sorted[t]);
        }
        sorted.splice(t,1);
        tileTypes.splice(t,1);
      }
    }
    results.discard = results.discard.concat(bin);
    match <<= 2; // NOTE: we can iterate by multiplying only because the set type constants are powers of two.
  }

  return results;
}

// This function determines whether certain tiles are
// required to fill certain sets based on in-hand tiles.
fulfill(idx, sorted, types) {
  var tile = sorted[idx],
      face = tile < 27 ? tile % 9 : undefined,
      type = types[idx];
  if (type === Constants.PAIR) return {tile, type};
  if (type === Constants.PUNG) return {tile, type};
  if (type === Constants.CONNECTED || type === Constants.GAPPED) {
    if (face > 1) {
      if(sorted.indexOf(tile-1) > -1) return {tile:tile-2, type};
      if(sorted.indexOf(tile-2) > -1) return {tile:tile-1, type};
    }
    if (face < 7) {
      if(sorted.indexOf(tile+1) > -1) return {tile:tile+2, type};
      if(sorted.indexOf(tile+2) > -1) return {tile:tile+1, type};
    }
  } // else: already a set
  return {};
}
};

var g = new Generator();
let hand = [1,1,3,4,6,12,13,15, 15, 15, 26, 28, 30 ];
// hand = [1,1,1,6,6,6,9,9,9,14,14,14,27];
// hand = [1,2,3, 6,6,6, 10,11,12, 26,26,26, 27];
 hand = [1,1,1, 1,2,3, 3,3,3, 4,5,6, 7];
console.log("current hand:", hand);
console.log(g.expand(hand, {}));