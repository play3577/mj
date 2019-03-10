/**
 * We need a way to debug play with specific walls, so...
 */
const WallHack = {
  hacks: {
    self_drawn_win_clean: [
      1,1,1,   2,2,2,   3,3,3,   4,4,4,      5, // p0
      16,16,16,17,17,17,18,18,18,19,19,19,  27, // p1
      11,11,11,12,12,12,13,13,13,14,14,14,  15, // p2
      6,6,6,7,7,7,8,8,8,9,9,9,              10, // p3
      5 // p0 win
    ],

    self_drawn_win: [
      1,1,1,  23,23,23,  2,3,4,   24,24,24,  5, // p0
      16,16,16,17,17,17,18,18,18,19,19,19,  27, // p1
      11,11,11,12,12,12,13,13,13,14,14,14,  15, // p2
      6,6,6,7,7,7,8,8,8,9,9,9,              10, // p3
      5 // p0 win
    ],

    form_melded_kong_off_initial: [
      0,3,6, 9,21,15, 18,21,24, 12,3,9, 13,    // p0
      1,1,1, 2,2,2, 12,19,21, 4,4,4, 0,        // p1
      7,7,7, 8,8,8, 10,10,10, 11,11,11, 0,     // p2
      16,16,16, 17,17,17, 20,20,20, 6,6,6, 25, // p3
      5, // p0 discard
      5, // p1 discards 21, p0 pungs, discard 24
      9, // p1 not a win, discards
      13, // p2 not a win, discards
      12, // p3 not a win, discard
      21, // p0 can now meld a kong
    ],

    kong_in_initial_deal: [
      1,1,1,     2,2,2,     3,3,3,     4,4,4,4, // p0
      16,16,16,17,17,17,18,18,18,19,19,19,   5, // p1
      11,11,11,12,12,12,13,13,13,14,14,14,  15, // p2
      6,6,6,7,7,7,8,8,8,9,9,9,              10, // p3
      5, // p0 supplement
      5  // p0 win
    ],

    kong_from_first_discard: [
      1,1,1,   2,2,2,   3,3,3,   4,4,4,      5, // p0
      16,16,16,17,17,17,18,18,18,19,19,19,   4, // p1
      11,11,11,12,12,12,13,13,13,14,14,14,  15, // p2
      6,6,6,7,7,7,8,8,8,9,9,9,              10, // p3
      16, // p1 kong
      5   // p0 win
    ],

    chow_by_player_1: [
      1,1,1,   2,2,2,   3,3,3,   4,4,4,      5, // p0
      16,16,16,17,17,17,20,20,20, 23,24,26,  5, // p1
      11,11,11,12,12,12,13,13,13,14,14,14,  26, // p2
      6,6,6,7,7,7,8,8,8,9,9,9,              10, // p3
      25 // chow for p1
    ],

    all_bonus_to_player: [
      34,35,36,37,38,39,40,41,                  // p0 bonus tiles
      1,1,24,2,2,26,3,3,28,4,4,30,5,            // p0
      16,16,16,17,17,17,18,18,18,19,19,19,   5, // p0
      11,11,11,12,12,12,13,13,13,14,14,14,  26, // p0
      6,6,6,7,7,7,8,8,8,9,9,9,              10, // p0
    ],

    thirteen_orphans: [
      0,8,9,17,18,26,27,28,29,30,31,32,33,    // p0
      16,16,16,17,17,17,18,18,18,19,19,19,5,  // p1
      11,11,11,12,12,12,13,13,13,14,14,14,26, // p2
      6,6,6,7,7,7,8,8,8,9,9,9,10,             // p3
      27 // p0 win
    ],

    all_green: [
      1,2,3,   2,2,2,   5,5,5,   7,7,7,     31, // p0
      16,16,16,17,17,17,18,18,18,19,19,19,   5, // p1
      11,11,11,12,12,12,13,13,13,14,14,14,  26, // p2
      6,6,6,7,7,7,8,8,8,9,9,9,              10, // p3
      31 // p0 win (pair)
    ],

    nine_gates: [
      0,0,0, 1,2,3,4,5,6,7, 8,8,8,              // p0
      16,16,16,17,17,17,18,18,18,19,19,19,  5,  // p1
      11,11,11,12,12,12,13,13,13,14,14,14,  26, // p2
      6,6,6,7,7,7,8,8,8,9,9,9,              10, // p3
      3 // p0 win
    ],

    little_three_dragons: [
      1,1,1,  23,23,23,  2,3,4,  24,24,24,   5, // p0
      31,31,31,32,32,32,33,33,18,19,19,19,  27, // p1, pung of green, pung of red, pair of white
      11,11,11,12,12,12,13,13,13,14,14,14,  15, // p2
      6,6,6,7,7,7,8,8,8,9,9,9,              10, // p3
      5 // p0 win
    ]
  },

  set(wall, tiles) {
    tiles = tiles.slice();

    // If we're wall hacking, we want to ensure that the
    // PRNG is seeded with a known value. If there is a
    // config object as element [0], use its seed value,
    // use that. If not, seed it with the value 1.
    if (typeof tiles[0] === "object") {
      let conf = tiles.splice(0,1)[0];
      config.PRNG.seed(conf.seed || 1);
    } else config.PRNG.seed(1);

    let base = wall.getBase();
    tiles.forEach(tile => base.splice(base.indexOf(tile),1));
    wall.tiles = tiles.concat(wall.shuffle(base));
  }
};


if (typeof process !== "undefined") {
  module.exports = WallHack;
}
