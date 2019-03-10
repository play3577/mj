if (typeof process !== "undefined") {
  LimitHands = require('./limit-hands.js');
}

/**
 * The generic ruleset object that specific
 * rulesets can extend off of.
 */
class Ruleset {

  // helper functions
  getWindTile(wind) { return 27 + wind }
  ownFlower(tile, windTile) { return tile - 34 === windTile - 27 }
  ownSeason(tile, windTile) { return tile - 38 === windTile - 27 }
  allFlowers(bonus) { return [34, 35, 36, 37].every(t => bonus.indexOf(t) > -1); }
  allSeasons(bonus) { return [38, 39, 40, 41].every(t => bonus.indexOf(t) > -1); }

  constructor(startscore, limit, points_for_winning, losers_settle_scores=config.LOSERS_SETTLE_SCORES, east_doubles_up=false, reverse_wind_direction=false) {
    this.player_start_score = startscore;
    this.limit = limit;
    this.points_for_winning = points_for_winning;
    this.losers_settle_scores = losers_settle_scores;
    this.east_doubles_up = east_doubles_up;
    this.reverse_wind_direction = reverse_wind_direction;
    this.limits = new LimitHands();
  }

  /**
   * The base ruleset covers two classic limit hands.
   */
  checkForLimit(allTiles, lockedSize) {
    if (allTiles.length < 14) return;
    const tiles = () => allTiles.slice().map(t => t|0).sort();
    if (this.limits.hasThirteenOrphans(tiles())) return `Thirteen orphans`;
    if (this.limits.hasNineGates(tiles(), lockedSize)) return `Nine gates`;
  }

  /**
   * Turn basic tilescores into score adjustments, by running
   * the "how much does the winner get" and "how much do the
   * losers end up paying" calculations.
   */
  settleScores(scores, winningplayer, eastplayer) {
    let adjustments = [0, 0, 0, 0];
    let eastwin = winningplayer === eastplayer ? 2 : 1;

    console.debug(`%cSettling payment`, `color: red`);

    for (let i = 0; i < scores.length; i++) {
      if (i === winningplayer) continue;

      // every non-winner pays the winner.
      if (i !== winningplayer) {
        let wscore = scores[winningplayer].total;
        let east = 1;
        if (this.east_doubles_up) east = (i === eastplayer) ? 2 : 1;
        let difference = wscore * Math.max(eastwin, east);
        adjustments[winningplayer] += difference;
        console.debug(`${winningplayer} gets ${difference} from ${i}`);
        adjustments[i] -= wscore * Math.max(eastwin, east);
        console.debug(`${i} pays ${difference} to ${winningplayer}`);
      }

      if (!this.losers_settle_scores) continue;

      // If losers should settle their scores amongst
      // themselves, make that happen right here:
      for (let j = i + 1; j < scores.length; j++) {
        if (j === winningplayer) continue;

        let east = 1;
        if (this.east_doubles_up) east = (i === eastplayer) ? 2 : 1;
        let difference = (scores[i].total - scores[j].total) * east;
        console.debug(`${i} gets ${difference} from ${j}`);
        adjustments[i] += difference;
        console.debug(`${j} pays ${difference} to ${i}`);
        adjustments[j] -= difference;
      }
    }

    if (winningplayer === eastplayer) scores[eastplayer].log.push(`Player won as East`);
    else scores[eastplayer].log.push(`Player lost as East`);

    return adjustments;
  }

  // implemented by subclasses
  getPairValue() { return false; }
  getChowValue() { return false; }
  getPungValue() { return false; }
  getKongValue() { return false; }

  /**
   * ...docs go here...
   */
  _tile_score(set, windTile, windOfTheRoundTile) {
    let locked = set.locked;
    let concealed = set.concealed;
    let tile = set[0];
    let names = config.TILE_NAMES;

    if (set.length === 2) return this.getPairValue(tile, locked, concealed, names, windTile, windOfTheRoundTile);
    if (set.length === 3) {
      if (set[0] !== set[1]) return this.getChowValue(tile, locked, concealed, names, windTile, windOfTheRoundTile);
      else return this.getPungValue(tile, locked, concealed, names, windTile, windOfTheRoundTile);
    }
    if (set.length === 4) return this.getKongValue(tile, locked, concealed, names, windTile, windOfTheRoundTile);
  }

  // implemented by subclasses
  checkBonusTilePoints(bonus, windTile, names, result) {}
  checkHandPatterns(scorePattern, windTile, windOfTheRoundTile, tilesLeft, result) {}
  checkWinnerHandPatterns(scorePattern, winset, selfdraw, windTile, windOfTheRoundTile, tilesLeft, scoreObject) {}

  // Aggregate all the points for individual sets into a single score object
  aggregateScorePattern(scorePattern, windTile, windOfTheRoundTile) {
    return scorePattern
      .map(set => this._tile_score(set, windTile, windOfTheRoundTile))
      .filter(v => v)
      .reduce((t, v) => {
        t.score += v.score;
        t.doubles += (v.doubles||0);
        t.log = t.log.concat(v.log);
        return t;
      },{ score: 0, doubles: 0, log: [] });
  }

  /**
   * ...docs go here...
   */
  getTileScore(scorePattern,windTile,windOfTheRoundTile,bonus,winset,winner=false,selfdraw=false,selftile=false,tilesLeft) {
    let names = config.TILE_NAMES;
    let result = this.aggregateScorePattern(scorePattern, windTile, windOfTheRoundTile);
    result.wind = windTile;
    result.wotd = windOfTheRoundTile;

    this.checkBonusTilePoints(bonus, windTile, names, result);
    this.checkHandPatterns(scorePattern, windTile, windOfTheRoundTile, tilesLeft, result);
    if (winner) {
      if (this.points_for_winning > 0) {
        result.score += this.points_for_winning;
        result.log.push(`${this.points_for_winning} for winning`);
      }
      this.checkWinnerHandPatterns(scorePattern, winset, selfdraw, selftile, windTile, windOfTheRoundTile, tilesLeft, result);
    }

    if (result.limit) {
      result.score = this.limit;
      result.doubles = 0;
      result.total = this.limit;
      result.log.push(`Limit hand: ${result.limit}`);
    } else {
      result.total = result.score * 2 ** result.doubles;
      if (result.total > this.limit) {
        result.log.push(`Score limited from ${result.total} to ${this.limit}`);
        result.total = this.limit;
      }
    }

    return result;
  }

  /**
   * All possible flags and values necessary for performing scoring, used in checkWinnerHandPatterns
   */
  getState(scorePattern, winset, selfdraw, selftile, windTile, windOfTheRoundTile, tilesLeft) {
    // We start with some assumptions, and we'll invalidate them as we see more sets.
    let state = {
      allchow: true,
      onesuit: true,
      honours: false,
      allhonours: true,
      terminals: true,
      allterminals: true,
      punghand: true,
      outonPair: true,
      majorPair: false,
      dragonPair: false,
      windPair: false,
      ownWindPair: false,
      wotrPair: false,
      ownWindPung: false,
      wotrPung: false,
      ownWindKong: false,
      wotrKong: false,
      chowCount: 0,
      windPungCount: 0,
      windKongCount: 0,
      dragonPungCount: 0,
      dragonKongCount: 0,
      concealedCount: 0,
      kongCount: 0,
      suit: false,
      selfdraw: selfdraw,
      lastTile: (tilesLeft<=0)
    };

    // classic limit hands
    state.allGreen = scorePattern.every(set => set.every(t => [1,2,3,5,7,31].indexOf(t) > -1));

    // FIXME: still missing
    //        - out on supplement tile
    //        - out by robbing a kong
    //        - ready after initial deal
    //        - winning 13 times in a row as East

    let tile, tilesuit;
    scorePattern.forEach(set => {
      tile = set[0];
      tilesuit = (tile / 9) | 0;

      if (tile < 27) {
        if (state.suit === false) state.suit = tilesuit;
        else if (state.suit !== tilesuit) state.onesuit = false;
        if (set.some(t => t !== 0 || t !== 8)) {
          state.terminals = false;
          state.allterminals = false;
        }
        state.allhonours = false;
      } else {
        state.honours = true;
        state.allterminals = false;
      }

      if (set.length === 2) {
        if (winset) {
          state.outonPair = (winset.length===2 && winset[0]===set[0]);
        }
        else if (!winset && selfdraw && set[0] === selftile) {
          state.outonPair = true;
        }
        else {
          state.outonPair = false;

          if (tile > 26 && tile < 31) {
            state.windPair = true;
            state.majorPair = true;
          }
          if (tile > 30) {
            state.dragonPair = true;
            state.majorPair = true;
          }
          if (tile === windTile) {
            state.ownWindPair = true;
            state.majorPair = true;
          }
          if (tile === windOfTheRoundTile) {
            state.wotrPair = true;
            state.majorPair = true;
          }
        }
      }

      if (set.length === 3) {
        if (tile === set[1]) {
          if (tile > 26 && tile < 31) {
            state.windPungCount++;
            if (tile === windTile) state.ownWindPung = true;
            if (tile === windOfTheRoundTile) state.wotrPung = true;
          }
          if (tile > 30) state.dragonPungCount++;
          state.allchow = false;
        } else {
          state.chowCount++;
          state.punghand = false;
        }
      }

      if (set.length === 4) {
        state.kongCount++;
        if (tile > 26 && tile < 31) {
          state.windKongCount++; // implies pung
          if (tile === windTile) state.ownWindKong = true; // implies windPunt
          if (tile === windOfTheRoundTile) state.wotrKong = true; // implies wotrKong
        }
        if (tile > 30) state.dragonKongCount++; // implies pung
        state.allchow = false;
      }

      if (!set.locked || set.concealed) state.concealedCount++;
    });

    return state;
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
  scoreTiles(disclosure, id, windOfTheRound, tilesLeft) {
    console.debug(id, disclosure, windOfTheRound, tilesLeft);

    // Let's get the administrative data:
    let winner = disclosure.winner;
    let selfdraw = disclosure.selfdraw;
    let selftile = disclosure.selftile ? disclosure.selftile.getTileFace() : false;
    let tiles = disclosure.concealed;
    let locked = disclosure.locked;
    let bonus = disclosure.bonus;
    let winset = false;
    let windTile = this.getWindTile(disclosure.wind);
    let windOfTheRoundTile = this.getWindTile(windOfTheRound);
    let allTiles = tiles.slice();

    // Move kong tile concealments out of the tile datasets
    // and into the sets themselves, instead.
    locked = locked.map(set => {
      if (set.length === 4) {
        let ccount = set.reduce((tally,t) => tally + (t.dataset.concealed ? 1 : 0), 0);
        if (ccount >= 3) set.concealed = `${ccount}`;
      }
      return set;
    });

    // And then let's see what our tile-examining
    // algorithm has to say about the tiles we have.
    let tileInformation = tilesNeeded(tiles, locked);
    let openCompositions = tileInformation.composed;


    // Then, flatten the locked sets from tile elements
    // to simple numerical arrays, but with the set
    // properties (locked/concealed) preserved:
    locked = locked.map(set => {
      let winning = !!set[0].dataset.winning;
      let newset = set.map(t => t.getTileFace ? t.getTileFace() : (t.dataset.tile|0)); // FIXME: this should be a create(t)'d tile!
      newset.locked = 'locked';
      if (set.concealed) newset.concealed = set.concealed;
      if (winning) winset = newset;
      allTiles.push(...newset);
      return newset;
    });

    // If this is the winner, though, then we _know_ there is at
    // least one winning path for this person to have won.
    if (winner) {
      // first check for non-standard-pattern limit hands
      let limit = this.checkForLimit(allTiles, locked.reduce((t,s) => t + s.length, 0));
      if (limit) return { limit:limit, log: [`Limit hand: ${limit}`], score: this.limit, doubles: 0, total: this.limit };

      // no limit: proceed to score hand based on normal win paths.
      openCompositions = tileInformation.winpaths;
    }

    // If there is nothing to be formed with the tiles in hand,
    // then we need to create an empty path, so that we at
    // least still compute score based on just the locked tiles.
    else if(openCompositions.length === 0) openCompositions.push([]);

    // Run through each possible interpetation of in-hand
    // tiles, and see how much they would score, based on
    // the getTileScore() function up above.
    let possibleScores = openCompositions.map(chain => {

      // turn the winpath string representations for sets
      // back into actual sets of tile face numbers, tagged
      // with the appropriate locked/concealed information:
      let scorePattern = chain.map(s => {
        let terms = s.split('-');
        let c = terms[0];
        let count = parseInt(c);
        let tile = parseInt(terms[1]);

        let set;
        if (s.indexOf('c') > -1) set = [tile, tile+1, tile+2];
        else set = [tile, tile, tile, tile].slice(0,count);

        if (terms[2]) {
          let cl = terms[2];
          if (cl === '!') set.locked = locked;
          else set.concealed = (cl|0);
        }

        return set;
      }).concat(winner ? [] : locked);

      return this.getTileScore(scorePattern, windTile, windOfTheRoundTile, bonus, winset, winner, selfdraw, selftile, tilesLeft);
    });

    // And then make sure we award each player the highest score they're elligible for.
    let finalScore = possibleScores.sort( (a,b) => { a = a.total; b = b.total; return a - b; }).slice(-1)[0];

    console.debug(finalScore);
    return finalScore;
  }
}

/**
 * Set up ruleset registration/fetching by name. Note that
 * we add spaces in between camelcasing to make things
 * easier to work with: `Ruleset.getRuleset("Chinese Classical")`
 * is just friendlier for human code maintainers/editors.
 */
(() => {
  let rulesets = {};

  Ruleset.register = function(RulesetClass) {
    let naturalName = RulesetClass.name.replace(/([a-z])([A-Z])/g, (_, b, c) => `${b} ${c}`);
    rulesets[naturalName] = new RulesetClass();
  };

  Ruleset.getRuleset = name => rulesets[name];
})();


// Node context
if (typeof process !== "undefined") {
  module.exports = Ruleset;

  // make sure CC rules are loaded.
  require('./chinese-classical');
}
