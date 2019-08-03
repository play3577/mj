let Random = require("../../utils/prng.js");
let WallHack = require("./wall-hack.js");

// Standard wall definition.
let base = [...new Array(34)].map((_, i) => i);
const BASE = base
  .concat(base)
  .concat(base)
  .concat(base)
  .concat([34, 35, 36, 37, 38, 39, 40, 41]);

/**
 * This basically represents a shuffled a pile of
 * tiles for dealing from during a hand of play.
 */
class Wall {
  constructor(config) {
    this.config = config;
    this.hacked = config.wallhack.value;
    this.dead = 16;
    this.reset();
  }

  /**
   *  shuffle utility function, also used by WallHack
   */
  shuffle(list) {
    list = list.slice();
    let shuffled = [];
    while (list.length) {
      let pos = (this.prng.nextFloat() * list.length) | 0;
      shuffled.push(list.splice(pos, 1)[0]);
    }
    return shuffled;
  }

  /**
   * Reset the wall to a full set of tiles, then shuffle them.
   */
  reset() {
    this.prng = new Random(this.config.prng_seed.value);
    this.seed = this.prng.seed();
    this.tiles = this.hacked
      ? WallHack.getTiles(this, this.hacked)
      : this.shuffle(this.getBase());
  }

  /**
   * Get one or more tiles from the wall.
   */
  get(n = 1) {
    let slice = this.tiles.splice(0, n);
    if (n === 1) return slice[0];
    return slice;
  }

  /**
   * Get the current wall information
   */
  getDetails() {
    return {
      prng_seed: this.seed,
      size: this.tiles.length,
      dead: this.dead,
      remaining: this.tiles.length - this.dead
    };
  }

  /**
   * get the base wall tiles
   */
  getBase() {
    return BASE.slice();
  }
}

Wall.getDetails = function() {
  return {
    prng_seed: 0,
    size: 144,
    dead: 16,
    remaining: 128
  };
};

module.exports = Wall;
