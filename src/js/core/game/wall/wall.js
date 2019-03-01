let base = [...new Array(34)].map((_,i) => i);
const BASE = base.concat(base).concat(base).concat(base).concat([34,35,36,37,38,39,40,41]);

/**
 * This basically represents a shuffled a pile of tiles
 * for dealing from during a hand of play.
 */
class Wall {
  constructor(players) {
    this.players = players;
    this.reset();
  }

  /**
   * Reset the wall to a full set of tiles, then shuffle them.
   */
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

    // if there's a wall hack active, throw away what
    // we just did and use the hacked wall instead.
    if (config.WALL_HACK) {
      WallHack.set(this, WallHack.hacks[config.WALL_HACK]);
    }
  }

  /**
   * Get one or more tiles from this pile of tiles.
   */
  get(howmany=1) {
    let left = this.tiles.length - howmany;
    this.remaining = left - this.deadSize;
    this.players.forEach(p => p.markTilesLeft(this.remaining));
    this.dead = (this.tiles.length - howmany <= this.deadSize);
    if (howmany===1) return this.tiles.shift();
    return this.tiles.splice(0, howmany);
  }
}
