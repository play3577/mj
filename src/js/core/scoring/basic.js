/**
 * What's that? Just generate some basic numbers? You got it!
 */
function _tile_score(set) {
  let locked = set.locked;
  if (set[0].dataset) set = set.map(s => parseInt(s.dataset.tile));
  let tile = set[0];

  let score = 0;

  // Only pairs of dragons score points.
  if (set.length === 2 && tile > 30) score = 2;

  // Triples means either a chow or a pung, but only pungs score points.
  if (set.length === 3) {
    let s1 = set[1];
    s1 = s1.dataset ? parseInt(s1.dataset.tile) : s1;
    // honours score more than numbers.
    if (s1 === tile) score = (tile < 27) ? 2 : 4;
  }

  // goodness, a kong or numbers / honours!
  if (set.length === 4) score = (tile < 27) ? 4 : 8;

  // concealed points are worth more!
  return locked ? score : 2 * score;
}

/**
 * Determine the tile score for a collection of sets
 */
function getBasicTileScore(scorePattern) {
  return scorePattern.map(_tile_score).reduce((t,v)=>t+v, 0);
}

/**
 * Scoring tiles means first seeing how many different 
 * things can be formed with the not-revelead tiles,
 * and then for each of those things, calculate the
 * total hand score by adding in the locked tiles.
 *
 * Whichever combination of pattersn scores highest
 * is the score the player will be assigned.
 */
function scoreTiles(disclosure) {
  // Let's get the administrative data:
  let winner = disclosure.winner;
  let tiles = disclosure.concealed;
  let locked = disclosure.locked;
  let bonus = disclosure.bonus;

  // And then let's see what our tile-examining
  // algorithm has to say about the tiles we have.
  let openCompositions = tilesNeeded(tiles, locked).composed;

  // If there is nothing to be formed with the tiles in hand,
  // then we need to create an empty path, so that we at
  // least still compute score based on just the locked tiles.
  if (openCompositions.length === 0) {
    openCompositions.push([]);
  }

  // Run through each possible interpetation of in-hand
  // tiles, and see how much they would score, based on
  // the getBasicTileScore() function up above.
  let possibleScores = openCompositions.map(chain => {
    let scorePattern = chain.map(s => {
      let terms = s.split('-');
      let c = terms[0];
      let count = parseInt(c);
      let tile = parseInt(terms[1]);
      if (c.indexOf('c') > -1) return [tile, tile+1, tile+2];
      return [tile, tile, tile, tile].slice(0,count);
    }).concat(locked);

    let score = getBasicTileScore(scorePattern);
    return score + (winner?10:0);
  });

  // And then make sure we award each player the highest
  // score they're elligible for.
  return possibleScores.sort().slice(-1)[0] + (bonus.length * 4);
}

/**
 * Turn basic tilescores into score adjustments, by running
 * the "how much does the winner get" and "how much do the
 * losers end up paying" calculations.
 */
function settleScores(scores, winningplayer) {
  let adjustments = [0,0,0,0];

  for(let i=0; i<scores.length; i++) {
    if (i === winningplayer) continue;

    // every non-winner pays the winner.
    if (i !== winningplayer) {
      let wscore = scores[winningplayer];
      adjustments[winningplayer] += wscore;
      adjustments[i] -= wscore;
    }

    if(!LOSERS_SETTLE_SCORES) continue;

    // and then they settle their scores amongst themselves
    for(let j=0; j<scores.length; j++) {
      if (j===i) continue;
      if (j===winningplayer) continue;
      adjustments[i] += (scores[i] - scores[j]);
    }
  }

  return adjustments;
}
