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

/**
 * We need a way to debug play with specific walls, so...
 */
const WallHack = {
  hacks: {
    self_drawn_win: [
      // human player hand
      1,1,1,
      2,2,2,
      3,3,3,
      4,4,4,
      5,

      // bot player hands
      16,16,16,17,17,17,18,18,18,19,19,19,  5,
      11,11,11,12,12,12,13,13,13,14,14,14,  15,
      6,6,6,7,7,7,8,8,8,9,9,9,              10,

      // winning tile for player 0
      5,

      // rest of the fake wall
      22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
      22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22
    ],

    kong_in_initial_deal: [
      // human player hand
      1,1,1,
      2,2,2,
      3,3,3,
      4,4,4,4,

      // bot player hands
      16,16,16,17,17,17,18,18,18,19,19,19,  5,
      11,11,11,12,12,12,13,13,13,14,14,14,  15,
      6,6,6,7,7,7,8,8,8,9,9,9,              10,

      // winning tile for player 0
      5,5,

      // rest of the fake wall
      22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
      22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22
    ],

    chow_by_player_1: [
      // human player hand
      1,1,1,2,2,2,3,3,3,4,4,4,5,

      // bot player hands
      16,16,16,17,17,17,18,18,18,19,19,19,  5,
      11,11,11,12,12,12,13,13,13,14,14,14,  26,
      6,6,6,7,7,7,8,8,8,9,9,9,              10,

      // non-winning tile for player 0
      20,22,22,15,

      // rest of the fake wall
      22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
      22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22
    ]
  },

  set(wall, tiles) { wall.tiles = tiles.slice(0); }
};
