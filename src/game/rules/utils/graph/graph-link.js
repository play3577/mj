/**
 * A directed acyclic graph (DAG) link that encodes the transition
 * from one node to the next node, encoding the transition value
 * (i.e. the value that must be matched for this link to be
 * traversed in DFA processing) as the `tiles` property.
 */
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
