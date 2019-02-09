/**
 *
 */
function getTileScore(scorePattern) {
  return scorePattern.map(s => {
    let tile = s[0];
    if (s.length === 2) return (tile > 30) ? 2 : 0;
    if (s.length === 3) {
      if (tile + 1 != s[1]) return 0;
      return (tile < 27) ? 2 : 4;
    }
    if (s.length === 4) return (tile < 27) ? 4 : 8;
  }).reduce((t,v)=>t+v,0);;
}

/**
 *
 */
function scoreTiles(player) {

  let winner = player.has_won;
  let tiles = player.getTileFaces();
  let locked = player.locked.map(
    s => s.map(
      t => parseInt(t.dataset.tile)
    ).sort()
  );
  let openCompositions = tilesNeeded(tiles, locked).composed;

  if (openCompositions.length === 0) return 0;

  let possibleScores = openCompositions.map(chain => {
    let scorePattern = chain.map(s => {
      let terms = s.split('-');
      let c = terms[0];
      let count = parseInt(c);
      let tile = parseInt(terms[1]);
      if (c.indexOf('c') > -1) return [tile, tile+1, tile+2];
      return [tile, tile, tile, tile].slice(0,count);
    }).concat(locked);

    let score = getTileScore(scorePattern);
    return score;
  });

  let best = possibleScores.sort().slice(-1)[0];
  return best + (winner ? 10 : 0);
}

/*
if (typeof process !== "undefined" && process.argv) {
  let tilesNeeded = require('../mgen.js');

  let locked = [ [11,10,12], [26,26,26] ].map(s => s.map(t => {
    return {
      dataset: {
        tile: t
      }
    };
  }));

  let player = {
    has_won: true,
    getTileFaces: () => [9,9, 14,15,16, 18,19,20],
    locked
  };

  let score = scoreTiles(player, tilesNeeded);

  console.log(score);
}
*/