(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.findTilesNeeded = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{"../../../utils/suit.js":6,"./build-graph.js":2,"./graph/expand.js":3}],2:[function(require,module,exports){
const Node = require("./graph/graph-node");
const suit = require("../../../utils/suit.js");

function buildGraph(tiles, ignoreChowPairs = false) {
  let root = new Node();
  build(tiles, root, ignoreChowPairs);
  return root;
}

function build(tiles, currentNode, ignoreChowPairs) {
  if (!tiles.length) return;
  let data;
  let t = tiles[0];

  // singles
  data = extract(tiles, [t]);
  if (data.head && data.tail)
    build(data.tail, currentNode.addOutgoing(data.head));

  // pair?
  data = extract(tiles, [t, t]);
  if (data.head && data.tail)
    build(data.tail, currentNode.addOutgoing(data.head));

  // connected pair?
  if (!ignoreChowPairs && suit(t) === suit(t + 1)) {
    data = extract(tiles, [t, t + 1]);
    if (data.head && data.tail)
      build(data.tail, currentNode.addOutgoing(data.head));
  }

  // gapped pair?
  if (!ignoreChowPairs && suit(t) === suit(t + 2)) {
    data = extract(tiles, [t, t + 2]);
    if (data.head && data.tail)
      build(data.tail, currentNode.addOutgoing(data.head));
  }

  // pung?
  data = extract(tiles, [t, t, t]);
  if (data.head && data.tail)
    build(data.tail, currentNode.addOutgoing(data.head));

  // chow?
  if (suit(t) === suit(t + 2)) {
    data = extract(tiles, [t, t + 1, t + 2]);
    if (data.head && data.tail)
      build(data.tail, currentNode.addOutgoing(data.head));
  }

  // kong?
  data = extract(tiles, [t, t, t]);
  if (data.head && data.tail)
    build(data.tail, currentNode.addOutgoing(data.head));

  return currentNode;
}


// TODO: rewrite this to a straight iteration?
function extract(tiles, targets) {
  let extracted = [];
  let copy = tiles.slice();
  targets.forEach(tilenumber => {
    let pos = copy.indexOf(tilenumber);
    if (pos > -1) {
      extracted.push(tilenumber);
      copy.splice(pos, 1);
    }
  });
  if (extracted.length !== targets.length) return {};

  return { head: targets, tail: copy };
}

module.exports = { buildGraph };

},{"../../../utils/suit.js":6,"./graph/graph-node":5}],3:[function(require,module,exports){
// helper function: is a partial path already entailed by
// the full path we know?
// E.g. [2,5] is entailed by [1,2,3,4,5,6].
function entailed(target, paths) {
  return paths.some(path =>
    target.every(tset => path.some(set => set.entails(tset)))
  );
}

/**
 * Expand a graph starting at `root` into a set of unique paths
 * from the root to the end of the graph (signalled by not having
 * any outbound links).
 */
module.exports = function expand(root, ignoreChowPairs, paths = [], sofar = []) {
  let outbound = root.outbound;

  if (outbound.length === 0 && sofar.length && !entailed(sofar, paths)) {
    paths.push(sofar);
  }

  outbound
    .sort((a, b) => b.tiles.length - a.tiles.length)
    .forEach(link => {
      let next = sofar.slice();
      let tiles = link.tiles;
      if (tiles.length > 1) {
        if (ignoreChowPairs && tiles.length===2 && tiles[0] !== tiles[1]) {}
        else next.push(tiles);
      }
      expand(link.targetNode, ignoreChowPairs, paths, next);
    });

  return paths;
};

},{}],4:[function(require,module,exports){
class Link {
  constructor(tiles, targetNode, forward = true) {
    this.tiles = tiles;
    this.targetNode = targetNode;
    this.forward = forward;
  }

  reverse(node) {
    return new Link(this.tiles, node, !this.forward);
  }

  toString() {
    return this.valueOf();
  }

  valueOf() {
    return `${this.forward ? `forward` : `backward`} link to ${
      this.targetNode.id
    } via [${this.tiles}]`;
  }
}

module.exports = Link;

},{}],5:[function(require,module,exports){
const Link = require("./graph-link.js");

// A silly little helper function, but it beats having
// a uuid() dependency!
const uuid = (function() {
  let id = 1;
  return () => id++;
})();

/**
 * A directed acyclic graph (DAG) node that either acts as root,
 * or as downstream node in the graph with the graph's node set
 * specified as a known quantity.
 */
class Node {
  constructor(tiles = [], nodelist = {}) {
    this.id = uuid();
    this.tiles = tiles.slice();
    this.nodelist = nodelist;
    this.inbound = [];
    this.outbound = [];
    this.recordNode(this);
  }

  recordNode(node) {
    const depth = node.tiles.length;
    this.nodelist[depth] = this.nodelist[depth] || [];
    this.nodelist[depth].push(node);
  }

  addIncoming(link) {
    let found = this.inbound.find(link => this.tiles.equals(link.tiles));
    if (!found) this.inbound.push(link);
  }

  addOutgoing(tiles) {
    let heap = [...this.tiles, ...tiles];
    let node = this.getNode(heap);
    let link = this.outbound.find(l => l.tiles.equals(tiles));
    if (!link) {
      link = new Link(tiles, node);
      this.outbound.push(link);
      node.addIncoming(link.reverse(this));
    }
    return node;
  }

  getNode(tiles) {
    const depth = tiles.length;
    this.nodelist[depth] = this.nodelist[depth] || [];
    let node = this.nodelist[depth].find(node => tiles.equals(node.tiles));
    return node || new Node(tiles, this.nodelist);
  }

  toString() {
    return this.valueOf();
  }

  valueOf() {
    return `${this.id}:
  heap=[${this.tiles}]
  depth=${this.tiles.length}
${
      this.inbound.length === 0
        ? ``
        : `  inbound links=[
    ${this.inbound.join(`\n    `)}
  ]
`
      }${
      this.outbound.length === 0
        ? ``
        : `  outbound links=[
    ${this.outbound.join(`\n    `)}
  ]`
      }`;
  }

  toFullString() {
    return Node.toString(this);
  }
}

Node.toString = function toString(node) {
  return Object
    .keys(node.nodelist)
    .sort((a, b) => (a | 0) - (b | 0))
    .map(depth => node.nodelist[depth].map(n => n.toString()).join('\n'))
    .join('\n');
};

module.exports = Node;

},{"./graph-link.js":4}],6:[function(require,module,exports){
function suit(t) {
  // exploit ((NaN === NaN) === false) for honours
  if (t >= 27) return NaN;
  return (t / 9) | 0;
}

module.exports = suit;

},{}]},{},[1])(1)
});
