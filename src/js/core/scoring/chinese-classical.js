// Different rules have different starting conditions
const PLAYER_STARTING_SCORE = 1000;

// maximum number of points a hand can score:
const LIMIT = 1000;

// helper functions
const getWindTile = wind => 27 + wind;
const ownFlower = (tile, windTile) => (tile - 34) === (windTile - 27);
const ownSeason = (tile, windTile) => (tile - 38) === (windTile - 27);
const allFlowers = bonus => [34,35,36,37].every(t => bonus.indexOf(t) > -1);
const allSeasons = bonus => [38,39,40,41].every(t => bonus.indexOf(t) > -1);

/**
 * The basic scoring system uses Chinese Classical scoring,
 * as documented in the "Four Winds 2" documentation, which
 * shouldn't be too hard to find given that you found this
 * source code on Github so presumably know how to use
 * something like duckduckgo or google.
 */
function _tile_score(set, windTile, windOfTheRoundTile) {
  let locked = set.locked;
  let tile = set[0];

  let log = [];
  let score = 0;
  let doubles = 0;

  // Pairs
  if (set.length === 2) {
    if (tile > 30) {
      score += 2;
      log.push(`2 for pair of dragons (${tile})`);
    }
    if (tile === windTile) {
      score += 2;
      log.push(`2 for pair of own wind (${tile})`);
    }
    if (tile === windOfTheRoundTile) {
      score += 2;
      log.push(`2 for pair of wind of the round (${tile})`);
    }
  }

  const prefix = locked ? '' : 'concealed ';

  // Triplets
  if (set.length === 3) {
    // chows score nothing.
    let s1 = set[1];
    s1 = s1.dataset ? parseInt(s1.dataset.tile) : s1;
    if (s1 === tile) {
      if (tile < 27) {
        if (tile%9 === 0 || tile%9 === 8) {
          score += locked? 4 : 8;
          log.push(`${locked? 4 : 8} for ${prefix}pung of terminals (${tile})`);
        } else {
          score += locked? 2 : 4;
          log.push(`${locked? 2 : 4} for ${prefix}pung of simple (${tile})`);
        }
      }
      else if (tile < 31) {
        score += locked? 4 : 8;
        log.push(`${locked? 4 : 8} for ${prefix}pung of winds (${tile})`);
        if (tile === windTile) {
          doubles += 1;
          log.push(`1 double for a pung of player's own wind (${tile})`);
        }
        if (tile === windOfTheRoundTile) {
          doubles += 1;
          log.push(`1 double for a pung of wind of the round (${tile})`);
        }
      }
      else {
        score += locked? 4 : 8;
        log.push(`${locked? 4 : 8} for ${prefix}pung of dragons (${tile})`);
        doubles += 1;
        log.push(`1 double for a pung of dragons (${tile})`);
      }
    }
  }

  // goodness, a kong!
  if (set.length === 4) {
    if (tile < 27) {
      if (tile%9 === 0 || tile%9 === 8) {
        score += locked? 16 : 32;
        log.push(`${locked? 16 : 32} for ${prefix}kong of terminals (${tile})`);
      } else {
        score += locked? 8 : 16;
        log.push(`${locked? 8 : 16} for ${prefix}kong of simple (${tile})`);
      }
    }
    else if (tile < 31) {
      score += locked? 16 : 32;
      log.push(`${locked? 16 : 32} for ${prefix}kong of winds (${tile})`);
      if (tile === windTile) {
        doubles += 1;
        log.push(`1 double for a kong of player's own wind`);
      }
      if (tile === windOfTheRoundTile) {
        doubles += 1;
        log.push(`1 double for a kong of wind of the round`);
      }
    }
    else {
      score += locked? 16 : 32;
      log.push(`${locked? 16 : 32} for ${prefix}kong of dragons (${tile})`);
      doubles += 1;
      log.push(`1 double for a kong of dragons (${tile})`);
    }
  }

  return { score, doubles, log };
}

/**
 * In addition to straight up points, certain combinations
 * of sets come with additional points in the form of doubles
 */
function checkWinnerHandPatterns(scorePattern, winset, selfdraw=false, windTile, windOfTheRoundTile, tilesLeft, scoreObject) {
  // We start with some assumptions, and we'll
  // invalidate them as we see more sets.

  let allchow = true;
  let onesuit = true;
  let honours = false;
  let allhonours = true;
  let terminals = true;
  let allterminals = true;
  let punghand = true;

  let outonPair = true;
  let majorPair = false;
  let dragonPair = false;
  let windPair = false;
  let ownWindPair = false;
  let wotrPair = false;

  let windPungCount = 0;
  let windKongCount = 0;
  let dragonPungCount = 0;
  let dragonKongCount = 0;
  let concealedCount = 0;
  let kongCount = 0;

  let suit = false, tile, tilesuit;
  scorePattern.forEach(set => {
    tile = set[0];
    tilesuit = (tile/9)|0;

    if (tile < 27) {
      if (suit === false) suit = tilesuit;
      else if (suit !== tilesuit) onesuit = false;
      if (set.some(t => t!==0 || t!==8)) {
        terminals = false;
        allterminals = false;
      }
      allhonours = false;
    } else {
      honours = true;
      allterminals = false;
    }

    if (set.length === 2) {
      if (!winset || winset.length !== 2) {
        // We check the winset because SOMEHOW if we set newset.winning = true
        // in the code that converts locked[] into tile number sets, that flag
        // goes missing between computing basic tile scores, and computing
        // the winning hand scores here. Super weird. FIXME: figure out why?
        outonPair = false;
      } else {
        if (tile > 26 && tile < 31) { windPair = true; majorPair = true; }
        if (tile > 30) { dragonPair = true; majorPair = true; }
        if (tile === windTile) { ownWindPair = true; majorPair = true; }
        if (tile === windOfTheRoundTile) { wotrPair = true; majorPair = true; }
      }
    }

    if (set.length === 3) {
      if (tile === set[1]) {
        if (tile > 26 && tile < 31) {
          windPungCount++;
          if (tile === windTile) ownWindPung = true;
          if (tile === windOfTheRoundTile) wotrPung = true;
        }
        if (tile > 30) dragonPungCount++;
        allchow = false;
      } else punghand = false;
    }

    if (set.length === 4) {
      kongCount++;
      if (tile > 26 && tile < 31) {
        windKongCount++; // implies pung
        if (tile === windTile) ownWindKong = true; // implies windPunt
        if (tile === windOfTheRoundTile) wotrKong = true; // implies wotrKong
      }
      if (tile > 30) dragonKongCount++; // implies pung
      allchow = false;
    }

    if (!set.locked) concealedCount++;
  });

  // Now then, how many extra points and/or doubles does this hand get?

  if (selfdraw) {
    scoreObject.score += 2;
    scoreObject.log.push(`2 points for self-drawn win`);
  }

  if (outonPair) {
    scoreObject.score += 2;
    scoreObject.log.push(`2 points for winning on a pair`);
  }

  if (outonPair && majorPair) {
    scoreObject.score += 2;
    scoreObject.log.push(`2 points for winning on a major pair`);
  }

  if (allchow && !majorPair) {
    scoreObject.doubles += 1;
    scoreObject.log.push(`1 double for a chow hand`);
  }

  if (onesuit) {
    if (honours) {
      scoreObject.doubles += 1;
      scoreObject.log.push(`1 double for a one suit (${suit}) and honours hand`);
    } else {
      scoreObject.doubles += 3;
      scoreObject.log.push(`3 doubles for a clean one suit hand (${suit})`);
    }
  }

  if (allterminals) {
    scoreObject.limit = `all terminals hand`;
  }

  if (allhonours) {
    scoreObject.limit = `all honours hand`;
  }

  if (punghand) {
    scoreObject.doubles += 1;
    scoreObject.log.push(`1 double for an all pung hand`);
  }

  if (kongCount === 4) {
    scoreObject.limit = `All kong hand`;
  }

  if (dragonPungCount + dragonKongCount === 3) {
    scoreObject.limit = `Three great scholars (pung or kong of each dragon)`;
  }

  if (windPungCount + windKongCount === 3 && windPair) {
    scoreObject.limit = `Little four winds (pung or kong of three wind, pair of last wind)`;
  }

  if (windPungCount + windKongCount === 4) {
    scoreObject.limit = `Big four winds (pung or kong of each wind)`;
  }

  if (concealedCount === 5) {
    scoreObject.doubles += 1;
    scoreObject.log.push(`1 double for a fully concealed hand`);
  }

  if (concealedCount === 5 && punghand) {
    scoreObject.limit = `Fully concealed pung hand`;
  }

  if (tilesLeft <= 0) {
    scoreObject.doubles += 1;
    if (selfdraw) {
      scoreObject.log.push(`1 double for winning with the last available wall tile`);
    } else {
      scoreObject.log.push(`1 double for winning with the last discard`);
    }
  }

  // MISSING: supplement tile, robbing a kong, "waiting to win after initial deal".
}

/**
 * Determine the tile score for a collection of sets
 */
function getTileScore(scorePattern, windTile, windOfTheRoundTile, bonus, winset, winner=false, selfdraw=false, tilesLeft) {
  Logger.debug(scorePattern.map(s => s.locked));

  let result = scorePattern
  .map(set => _tile_score(set, windTile, windOfTheRoundTile))
  .reduce((t,v)=>{
    t.score += v.score;
    t.doubles += v.doubles;
    t.log = t.log.concat(v.log);
    return t;
  }, {
    score: 0,
    doubles: 0,
    log:[]
  });

  let hasOwnFlower = false;
  let hasOwnSeason = false;
  bonus.forEach( tile => {
    result.score += 4;
    result.log.push(`4 for bonus tile (${tile})`);

    if(ownFlower(tile, windTile)) {
      hasOwnFlower = true;
    }

    if(ownSeason(tile, windTile)) {
      hasOwnSeason = true;
    }
  });

  if (hasOwnFlower && hasOwnSeason) {
    result.doubles += 1
    result.log.push(`1 double for own flower and season`);
  }

  if (allFlowers(bonus)) {
    result.doubles += 2;
    result.log.push(`1 more double for having all flowers`);
  }

  if (allSeasons(bonus)) {
    result.doubles += 2;
    result.log.push(`1 more double for having all seasons`);
  }

  if (winner) {
    result.score += 10;
    result.log.push(`10 for winning`);
  }

  result.wind = windTile;
  result.wotd = windOfTheRoundTile;

  // also determine points/doubles based on the full hand
  if (winner) checkWinnerHandPatterns(scorePattern, winset, selfdraw, windTile, windOfTheRoundTile, tilesLeft, result);

  if (result.limit) {
    result.score = LIMIT;
    result.doubles = 0;
    result.total = LIMIT;
  } else {
    result.total = result.score * (2**result.doubles);
    if (result.total > LIMIT) {
      result.log.push(`Score limited from ${result.total} to ${LIMIT}`);
      result.total = LIMIT;
    }
  }

  return result;
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
function scoreTiles(disclosure, id, windOfTheRound, tilesLeft) {
  // Let's get the administrative data:
  let winner = disclosure.winner;
  let selfdraw = disclosure.selfdraw;
  let tiles = disclosure.concealed;
  let locked = disclosure.locked;
  let bonus = disclosure.bonus;
  let winset = false;
  let windTile = getWindTile(disclosure.wind);
  let windOfTheRoundTile = getWindTile(windOfTheRound);

  Logger.debug(`player ${id}`);
  Logger.debug(disclosure);

  // And then let's see what our tile-examining
  // algorithm has to say about the tiles we have.
  let tileInformation = tilesNeeded(tiles, locked);
  Logger.debug(tileInformation);

  let openCompositions = tileInformation.composed;

  locked = locked.map(set => {
    let winning = !!set[0].dataset.winning;
    let newset = set.map(s => parseInt(s.dataset.tile))
    newset.locked = 'locked';
    if (winning) winset = newset;
    return newset;
  });

  // If there is nothing to be formed with the tiles in hand,
  // then we need to create an empty path, so that we at
  // least still compute score based on just the locked tiles.
  if (!winner && openCompositions.length === 0) openCompositions.push([]);

  // If this is the winner, though, then we _know_ there is at
  // least one winning path for this person to have won.
  if (winner) {
    openCompositions = tileInformation.winpaths;
  }

  // Run through each possible interpetation of in-hand
  // tiles, and see how much they would score, based on
  // the getTileScore() function up above.
  let possibleScores = openCompositions.map(chain => {
    Logger.debug(`testing ${id}, chain:`, chain);

    let scorePattern = chain.map(s => {
      let terms = s.split('-');
      let c = terms[0];
      let count = parseInt(c);
      let tile = parseInt(terms[1]);
      let locked = (terms[2] && terms[2]==='!');

      let set;
      if (s.indexOf('c') > -1) set = [tile, tile+1, tile+2];
      else set = [tile, tile, tile, tile].slice(0,count);
      set.locked = locked;
      return set;
    }).concat(winner ? [] : locked);

    return getTileScore(scorePattern, windTile, windOfTheRoundTile, bonus, winset, winner, selfdraw, tilesLeft);
  });


  // And then make sure we award each player the highest
  // score they're elligible for.
  let finalScore = possibleScores.sort( (a,b) => { a = a.total; b = b.total; return a - b; }).slice(-1)[0];
  Logger.debug(finalScore);
  return finalScore;
}

/**
 * Turn basic tilescores into score adjustments, by running
 * the "how much does the winner get" and "how much do the
 * losers end up paying" calculations.
 */
function settleScores(scores, winningplayer, eastplayer) {
  let adjustments = [0,0,0,0];
  let eastwin = (winningplayer === eastplayer) ? 2 : 1;

  for(let i=0; i<scores.length; i++) {
    if (i === winningplayer) continue;

    // every non-winner pays the winner.
    if (i !== winningplayer) {
      let wscore = scores[winningplayer].total;
      let east = (i === eastplayer) ? 2 : 1;
      let difference = wscore * Math.max(eastwin, east);
      adjustments[winningplayer] += difference;
      Logger.debug(`${winningplayer} gets ${difference} from ${i}`);
      adjustments[i] -= wscore * Math.max(eastwin, east);
      Logger.debug(`${i} pays ${difference} to ${winningplayer}`);
    }

    if(!config.LOSERS_SETTLE_SCORES) continue;

    // If losers should settle their scores amongst
    // themselves, make that happen right here:
    for(let j=i+1; j<scores.length; j++) {
      if (j===winningplayer) continue;

      let east = (i==eastplayer ? 2 : 1)
      let difference = (scores[i].total - scores[j].total) * east;
      Logger.debug(`${i} gets ${difference} from ${j}`);
      adjustments[i] += difference;
      Logger.debug(`${j} pays ${difference} to ${i}`);
      adjustments[j] -= difference;
    }
  }

  if (winningplayer === eastplayer) scores[eastplayer].log.push(`Player won as East`);
  else scores[eastplayer].log.push(`Player lost as East`);

  return adjustments;
}


// ====================================
//         TESTING CODE
// ====================================


if (typeof process !== "undefined")  { (function() {

  tilesNeeded = require('../mgen.js');
  Logger = console;
  module.exports = scoreTiles;

  // shortcut if we're merely being required
  let invocation = process.argv.join(' ');
  if (invocation.indexOf('chinese-classical.j') === -1) return;

  function lock(sets, win) {
    return sets.map((set,sid) => set.map(t => {
      let dataset = { tile: t, locked: 'locked' };
      if (sid===win) dataset.winning = 'winning';
      return { dataset };
    }));
  }

  let tests = [
    {
      id: 0,
      wotr: 0,
      tilesLeft: 50,
      winner: true,
      selfdraw: false,
      concealed: [32,32,32],
      locked: lock([
        [1,2,3],
        [2,3,4],
        [3,4,5],
        [6,6],
      ], 3),
      bonus: [],
      wind: 1,
    }
  ];

  tests.forEach(test => {
    scoreTiles(test, test.id, test.wotr, test.tilesLeft);
  });

})()}
