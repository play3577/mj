let base = [...new Array(34)].map((_,i) => i);
const BASE = base.concat(base).concat(base).concat(base).concat([34,35,36,37,38,39,40,41]);

class Wall {
  constructor(players) {
    this.players = players;
    this.ui = document.querySelector('.wall.data');
    this.reset();
  }

  reset() {
    let tiles = BASE.slice();
    this.tiles = [];
    while (tiles.length) {
      let pos = (config.PRNG.nextFloat() * tiles.length)|0;
      this.tiles.push( tiles.splice(pos,1)[0] );
    }
    this.deadSize = 16;
    this.dead = false;
    this.remaining = this.tiles.length - this.dead;
    console.debug(`using wall:\n[${this.tiles}]`);

    if (config.WALL_HACK) {
      WallHack.set(this, WallHack.hacks[config.WALL_HACK]);
    }
  }

  get(howmany=1) {
    let left = this.tiles.length - howmany;
    this.players.forEach(p => p.markTilesLeft(left, this.deadSize));
    this.markRemaining(left, this.deadSize);
    this.dead = (this.tiles.length - howmany <= this.deadSize);
    if (howmany===1) return this.tiles.shift();
    return this.tiles.splice(0, howmany);
  }

  markRemaining(left, dead) {
    this.remaining = left - dead;
    if (!this.ui) return;
    this.ui.textContent = `${this.remaining} tiles left`;
  }
}
