/**
 * A link between two nodes
 */
class Link {
  constructor(type="single", node1, node2) {
    this.node1 = node1;
    this.node2 = node2;
    this.type = type;
  }
}

class PairLink  extends Link { constructor(...args) { super("pair", ...args);  }}
class CPairLink extends Link { constructor(...args) { super("cpair", ...args); }}
class ChowLink  extends Link { constructor(...args) { super("chow", ...args);  }}
class PungLink  extends Link { constructor(...args) { super("pung", ...args);  }}
class KongLink  extends Link { constructor(...args) { super("lpmg", ...args);  }}

/**
 * A bidirectional node.
 */
class Node {
  constructor(value, parent, locked = false) {
    this.value = value;
    this.parent = parent;
    this.locked = locked;
    this.children = [];
  }

  addChild(node) {
    this.children.push(node);
  }

  valueOf() {
    return this.value;
  }

  toString() {
    if (this.children.length===0) return this.value;
    return `${this.value}(${this.children.map(v => v.toString()).join(`,`)})`;
  }
}

/**
 * Node representing an entire locked set.
 */
class SetNode extends Node {
  constructor(values, parent) {
    super(values, parent, true);
  }

  toString() {
    if (this.children.length===0) return `[${this.value}]`;
    return `[${this.value}](${this.children.map(v => v.toString()).join(`,`)})`;

  }
}

/**
 * Tile tree object.
 */
class Tree {
  constructor(tiles, locked=[]) {
    tiles = tiles.slice().sort((a,b)=>(a-b));
    locked = locked.slice();

    this.nodes = [];
    let parent;

    if (tiles.length) {
      let root = tiles.splice(0, 1)[0];
      parent = this.root = new Node(root);
      this.nodes.push(parent);
      tiles.forEach(tile => {
        let node = new Node(tile, parent);
        this.nodes.push(node);
        parent.addChild(node);
        parent = node;
      });
    }

    else {
      let root = locked.splice(0,1)[0];
      parent = this.root = new SetNode(root);
      this.nodes.push(parent);
    }

    locked.forEach(set => {
      let node = new SetNode(set, parent);
      this.nodes.push(node);
      parent.addChild(node);
      parent = node;
    });
  }

  valueOf() {
    return this;
  }

  toString() {
    return `Tree(${this.root.toString()})`;
  }
}

if (typeof process !== "undefined") {
  let t = new Tree([0,3,6, 9,14,15, 22,23,24,25, 3,9, 13], [[7,7,7,7], [32,32,32]]);
  console.log(t.toString());
}
