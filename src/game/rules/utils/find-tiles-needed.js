const suit = require("../../../utils/suit.js");
const { buildGraph } = require("./build-graph.js");
const expand = require("./graph/expand.js");

/**
 * Find all the tiles that we might need, and what they can be used for,
 * by building the tile graph for the indicated hand, expanding that
 * graph to all unique paths, and then evaluating each path in terms of
 * tiles needed, and for what (claims + winning claims).
 *
 * takes:
 *
 *   tiles = array of tile numbers (e.g. [1,2,3,4])
 *   locked = array of array of tile numbers (e.g. [[1,2,3], [4,4,4]])
 *   ignoreChowPairs = boolean that determines whether to expand e.g. [2,3] or not.
 *
 * returns:
 *
 *   {
 *     root: the top node in the tile graph
 *
 *     paths: [
 *       each unique path through the tile graph
 *     ]
 *
 *     evalutions: [
 *       an object of the following form, one for each path:
 *
 *       {
 *         tiles: all tiles left over after removing viable tiles
 *         composition: the path composition of the hand tiles (excluding the locked tiles)
 *         allSets: array of tilenumber sets in this path
 *         claimable: claim object, or array of, that apply to this path
 *         winner: true if this evaluation is a winning pattern
 *       }
 *     ]
 *   }
 */
module.exports = function findTilesNeeded(tiles, locked, ignoreChowPairs = true) {
  let root = buildGraph(tiles, ignoreChowPairs);
  let paths = expand(root, ignoreChowPairs);
  let evaluations = paths.map(path => findPathRequirements(tiles, locked, path));

  // TODO: compact the evaluations into a global unique claims set?
  //       For instance, [1,2,2,2,3,3,3,4,4,5,6,7] does _amazing_ things.

  // FIXME: it would appear that when holding [...,2,3,4,4,...] there is
  //        no conclusion that 3 would be good to get, which would allow
  //        [2,3,4] to be played, with [3,4] left in hand.

  return { root, paths, evaluations };
}

/**
 * Determine which tile claims will turn this path into a winning path.
 */
function findPathRequirements(tiles, locked, path) {
  let sets = 0;
  let pairs = 0;
  let claimable = [];

  // How many sets/pairs do we have, and what can we claim to form more sets?
  const pathlength = path.length;
  const lockedSets = locked.map(l => l.tiles ? l.tiles : l);
  const allSets = path.concat(lockedSets);
  allSets.forEach((set, pos) => {
    // true pair?
    if (set.length === 2 && set[0] === set[1]) complete = !!++pairs;
    // chow/pung/kong?
    if (set.length >= 3) complete = !!++sets;
    // which claims can we form here? (ignoring locked sets)
    if (pos < pathlength) claimable[pos] = findClaims(set);
  });

  // Is this a winning pattern already?
  let winner = pairs === 1 && sets === 4;

  // If not, are we one tile away from winning?
  if (!winner) {
    findSingleTilewinClaims(tiles, path, pairs, sets, allSets, claimable);
  }

  return {
    tiles: remove(tiles, path),
    composition: path,
    allSets,
    claimable: claimable.flat().filter(f => f),
    winner
  };
}

/**
 * Find (all) the winning claim(s) that
 */
function findSingleTilewinClaims(tiles, path, pairs, sets, allSets, claimable) {
  let whittled = tiles.slice().remove(path.flat());

  if (pairs === 0 && sets === 4) {
    // We need to turn our remaining single(s) into a pair to win
    claimable.push(claim(whittled[0], "win", "pair"));
    // and if it's our turn, we have two tiles with which
    // to form pairs.
    if (whittled.length === 2) {
      claimable.push(claim(whittled[1], "win", "pair"));
    }
  }

  else if (pairs === 1 && sets === 3) {
    // we need to turn our remaining singles into a chow to win
    if (whittled.length === 2) {
      const t1 = whittled[0];
      const t2 = whittled[1];
      if (t2 === t1 + 1) {
        // two possible chows
        let tp = t1 - 1;
        let tn = t2 + 1;
        if (suit(tp) === suit(t2)) claimable.push(claim(tp, "win", "chow1"));
        if (suit(tn) === suit(t1)) claimable.push(claim(tn, "win", "chow3"));
      }
      if (t2 === t1 + 2 && suit(t1) === suit(t2)) {
        // one possible chow
        claimable.push(claim(t1 + 1, "win", "chow2"));
      }
    }
  }

  else if (pairs === 2 && sets === 3) {
    // We need to turn one of our pairs into a pung to win
    allSets.forEach((set, pos) => {
      if (set.length !== 2) return;
      let claims = claimable[pos];
      if (!claims) claimable.push(claim(set[0], "win", "pung"));
      else {
        if (claims.forEach) claims.forEach(makeWin);
        else makeWin(claims);
      }
    });
  }
}

/**
 * Generate the list of tiles that can complete (or improve) this set.
 */
function findClaims(set) {
  let t = set[0];

  // pung => kong
  if (set.length == 3) return t === set[1] ? claim(t, "kong") : false;

  // pair => pung, chow pair => chow
  if (set.length == 2) {
    if (t === set[1]) return claim(t, "pung");

    if (set[1] === t + 2) return claim(t + 1, "chow2");
    if (set[1] === t + 1) {
      let claims = []
      if (suit(t) === suit(t+2)) claims.push(claim(t + 2, "chow3"));
      if (suit(t) === suit(t-1)) claims.push(claim(t - 1, "chow1"));
      return claims.filter(v => v);
    }
  }


}

/**
 *
 */
function remove(tiles, sets) {
  tiles = tiles.slice();
  sets.forEach(set => {
    set.forEach(t => {
      tiles.splice(tiles.indexOf(t), 1)
    })
  });
  return tiles;
}

/**
 * claim generator
 */
function claim(tilenumber, claimtype, wintype = undefined) {
  if(claimtype.indexOf('chow') === 0 && tilenumber > 26)
    return false; // can't chow honours

  let claim = { tilenumber, claimtype };
  if (wintype) claim.wintype = wintype;
  return claim;
}

/**
 * turn a normal claim into a winning claim
 */
function makeWin(claim) {
  claim.wintype = claim.claimtype;
  claim.claimtype = "win";
}
