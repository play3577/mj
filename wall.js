let base = [...new Array(34)].map((_,i) => i);
const BASE = base.concat(base).concat(base).concat(base).concat([34,35,36,37,38,39,40,41]);

class Wall {
  constructor() {
    this.reset();
  }
  reset() {
    let tiles = BASE.slice();
    this.tiles = [];
    while (tiles.length) {
      let pos = (PRNG.nextFloat() * tiles.length)|0;
      this.tiles.push( tiles.splice(pos,1)[0] );
    }
    this.dead = false;
  }
  get(howmany=1) {
    this.dead = (this.tiles.length - howmany <= 0);
    if (howmany===1) return this.tiles.shift();
    return this.tiles.splice(0, howmany);
  }
  getProxy() {
    return {
      get: () => this.get(),
      dead: () => this.dead
    };
  }
}
