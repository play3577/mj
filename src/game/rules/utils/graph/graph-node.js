const Link = require("./graph-link.js");

// A silly little helper function, but it beats having
// a uuid() dependency!
const uuid = (function() {
  let id = 1;
  return () => id++;
})();

/**
 * A directed acyclic graph (DAG) node that either acts as root,
 * or as downstream node in the graph with the graph's node-set
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
  return Object.keys(node.nodelist)
    .sort((a, b) => (a | 0) - (b | 0))
    .map(depth => node.nodelist[depth].map(n => n.toString()).join("\n"))
    .join("\n");
};

module.exports = Node;
