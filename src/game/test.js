require("../utils/array-updates.js");

const Ruleset = require('./rules/ruleset.js');
const rules = new Ruleset();
const findTilesNeeded = require('./rules/utils/find-tiles-needed.js');
const { legalClaims } = require('../utils/claims.js');

let tiles, locked = [], bonus = [], start, end;

// tiles = [1, 2, 3, 10, 11, 20, 21, 22, 33, 33];
// locked = [[15, 15, 15]];

// tiles = [1, 4, 7, 10, 11, 15, 19, 21, 24, 27, 30, 31, 33];

// tiles = [1, 2, 3, 10, 11, 12, 20, 21, 22, 33, 33];
// locked = [[15,15,15]];
// bonus = [34, 38, 42];

// tiles = [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 6, 6, 6];

// tiles = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4];
// locked = [[6,6]];

// tiles = [11,12,13, 11,12,13, 13,14,15, 14,14];
// locked = [[10,11,12]];

// tiles = [6,6,6, 7,7,7, 8,8,8, 10,10,10];
// locked = [[10,10]];

// tiles = [1,1,1, 10,11,12, 19,19,  9,9,9, 25,26,27];

// tiles = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33, 33];

// tiles = [6,6,7,7,8,8,8,9,9,33];
// locked = [[5,6,7]];

// tiles = [4,5,5,6,8,16,16,18,18,29,32]
// locked = [[33,33,33]]

tiles = [1,1,1, 2,2,2, 3,3, 4,4, 5]
locked = [[3,4,5]]

const includeChows = true;
findTilesNeeded(tiles, locked, includeChows).evaluations.forEach(e => {
  console.log(e);
  console.log();
});

process.exit(0);

const windOfTheRound = 0;
const othertiles = [1, 4, 7, 10, 11, 15, 19, 21, 24, 27, 30, 31, 33];

const players = [
  { seat: 0, wind: 0, tiles, locked, bonus},
  { seat: 1, wind: 1, tiles: othertiles.slice(), locked: [], bonus: [] },
  { seat: 2, wind: 2, tiles: othertiles.slice(), locked: [], bonus: [] },
  { seat: 3, wind: 3, tiles: othertiles.slice(), locked: [], bonus: [] },
]

start = Date.now();
const points = players.map(p => rules.score(p, windOfTheRound, p.wind===0));
end = Date.now();
console.log(`run took ${end - start}ms to score`);

start = Date.now();
let scores = rules.pointsToScores(
  points,
  0,        // winning seat
  0,        // east seat
  undefined // discarding player's seat
);
end = Date.now();
console.log(`run took ${end - start}ms to resolve points`);

players.forEach((p,seat) => {
  let pts = points[seat];
  console.log(p);
  console.log(`evalution: `, pts.path)
  console.log(`points: ${pts.total} (${pts.score}/${pts.doubles})`);
  console.log(`because:`, pts.log);
  console.log(`winnings:`, scores[seat]);
  console.log();
})


// TODO: we could, technically, generate a full game prediction now,
//       by taking a player's "current hand", and then iterating on
//       what they might need, simulating them getting that, and
//       expanding a tree of possible plays. Of course, this would
//       need to be recomputed each time a new tile is drawn from
//       the wall, which makes this a weirdly useful AND futile thing.
