/**
 * A link between two nodes
 */
class Link {
  constructor(type="unknown", node1, node2) {
    this.node1 = node1;
    this.node2 = node2;
    this.type = type;
  }
}

// Actual link types
class SingleLink  extends Link { constructor(...args) { super("single", ...args);  }}
class PairLink  extends Link { constructor(...args) { super("pair", ...args);  }}
class CPairLink extends Link { constructor(...args) { super("cpair", ...args); }}
class ChowLink  extends Link { constructor(...args) { super("chow", ...args);  }}
class PungLink  extends Link { constructor(...args) { super("pung", ...args);  }}
class KongLink  extends Link { constructor(...args) { super("kong", ...args);  }}

// a static types property for finding "the actual link type" class by name
Link.types = {
  "single": SingleLink,
  "pair": PairLink,
  "cpair": CPairLink,
  "chow": ChowLink,
  "pung": PungLink,
  "kong": KongLink
};


/**
 * A bidirectional node.
 */
class Node {
  constructor(value, locked = false) {
    this.id = Node.uid();
    this.value = value;
    this.locked = locked;
    this._links = [];
  }

  link(node, type="single") {
    let LinkType = Link.types[type];
    this._links.push(new LinkType(this, node));
  }

  links(type, node=false) {
    let found = this._links.filter(link => link.type===type)[0];
    if (node) return found ? node===found.node2 : false;
    return found ? found.node2 : false;
  }

  next(type) {
    let link = this._links.filter(link => link.type===type)[0];
    if (link) return link.node2;
    return false;
  }

  valueOf() {
    return this.value;
  }

  toString() {
    return `Node(id: ${this.id}, value: ${this.value}, out: [${this._links.map(link => `{id:${link.node2.id},type:${link.type}}`)}])`;
  }
}

Node.uid = (function generateUIDfunction() {
  let uid = 1;
  return () => uid++;
})();

/**
 * Node representing an entire locked set.
 */
class SetNode extends Node {
  constructor(values) {
    super(values, true);
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

    tiles.forEach(tile => {
      let node = new Node(tile);
      this.nodes.push(node);
    });

    locked.forEach(set => {
      let node = new SetNode(set);
      this.nodes.push(node);
    });

    // initial link
    this.link();
  }

  link() {
    let root = this.root = this.nodes[0], next;
    for(let i=1, e=this.nodes.length; i<e; i++) {
      next = this.nodes[i];
      if (next instanceof SetNode) {}
      else root.link(next);
      root = next;
    }

    this.linkPairs();
  }

  linkPairs() {
    let root = this.root, next=true;
    while (next) {
      next = root.next("single");
      if (next) {
        if (root.value === next.value) root.link(next, "pair");
        if (root.value + 1 === next.value) root.link(next, "cpair");
        root = next;
      }
    }

    this.linkSets();
  }

  linkSets() {
    let root = this.root, next=true, third=false;
    while (next) {
      next = root.next("single");
      if (next) {
        third = next.links("pair");
        if (root.links("pair", next) && third) root.link(third, "pung");
        third = next.links("cpair");
        if (root.links("cpair", next) && third) root.link(third, "chow");
        root = next;
      }
    }

    this.linkKongs();
  }

  linkKongs() {
    let root = this.root, next=true, target=false, fourth=false;
    while (root) {
      target = root.links("pung");
      if (target) {
        fourth = target.links("pair");
        if (fourth && fourth.value === root.value) root.link(fourth, "kong");
      }
      root = root.next("single");;
    }
  }

  valueOf() {
    return this;
  }

  toString(type) {
    return this.nodes.map(node => node.toString());
  }
}

if (typeof process !== "undefined") {
  let t = new Tree([0,3,3, 9,14,15, 22,23,24,25, 3,9, 13,3], [[7,7,7,7], [32,32,32]]);
  console.log(t.toString());
}
