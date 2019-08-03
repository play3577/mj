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
