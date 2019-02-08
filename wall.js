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
    this.debugTiles();
    console.log(`using wall:\n[${this.tiles}]`);
  }
  debugTiles() {
    // once we're done with development, this function will disappear.
    this.tiles = [17,23,4,16,9,1,36,25,10,27,39,11,10,10,34,25,33,22,5,15,30,32,29,15,32,24,30,12,0,20,32,30,20,0,15,28,33,7,28,16,2,38,2,13,9,19,1,28,21,22,2,17,4,8,8,26,24,13,18,8,19,18,5,25,3,8,17,24,11,22,11,41,26,1,14,7,1,12,27,0,4,12,22,21,19,40,6,18,31,35,26,10,9,16,3,20,29,33,29,0,21,6,30,3,13,14,25,11,5,27,27,9,18,6,31,7,17,24,2,33,21,23,19,4,31,13,5,6,12,28,20,15,3,26,31,23,23,16,7,37,14,29,32,14];
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
