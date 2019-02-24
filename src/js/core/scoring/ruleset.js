// helper functions
const getWindTile = wind => 27 + wind;
const ownFlower = (tile, windTile) => tile - 34 === windTile - 27;
const ownSeason = (tile, windTile) => tile - 38 === windTile - 27;
const allFlowers = bonus => [34, 35, 36, 37].every(t => bonus.indexOf(t) > -1);
const allSeasons = bonus => [38, 39, 40, 41].every(t => bonus.indexOf(t) > -1);

class Ruleset {
  constructor(startscore, limit) {
    this.player_start_score = startscore;
    this.limit = limit;
  }

  settleScores(scores, winningplayer, eastplayer) {
    // extended by subclasses
    return [0,0,0,0];
  }

  _tile_score(set, windTile, windOfTheRoundTile) {
    // extended by subclasses
    return 0;
  }

  checkWinnerHandPatterns(scorePattern,winset,selfdraw = false,windTile,windOfTheRoundTile,tilesLeft,scoreObject) {
    // extended by subclasses
  }

  getTileScore(scorePattern,windTile,windOfTheRoundTile,bonus,winset,winner=false,selfdraw=false,selftile=false,tilesLeft) {
    // extended by subclasses
    return { score: 0, doubles: 0, total: 0, limit: undefined, log: ['master ruleset does not perform any scoring'] };
  }

  checkAllTilesForLimit(allTiles) {
    // extended by subclasses
    return false;
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
    state.allGreen = scorePattern.every(set => set.every(t => [1,2,3,5,7,31].indexOf(t) > -1))

    // FIXME: still missing
    //        - out on supplement tile
    //        - out by robbing a kong
    //        - ready after initial deal

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
        if (winset && winset.length !== 2) {
          state.outonPair = false;
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
        } else state.punghand = false;
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
    // Let's get the administrative data:
    let winner = disclosure.winner;
    let selfdraw = disclosure.selfdraw;
    let selftile = disclosure.selftile ? disclosure.selftile.getTileFace() : false;
    let tiles = disclosure.concealed;
    let locked = disclosure.locked;
    let bonus = disclosure.bonus;
    let winset = false;
    let windTile = getWindTile(disclosure.wind);
    let windOfTheRoundTile = getWindTile(windOfTheRound);
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

    // If there is nothing to be formed with the tiles in hand,
    // then we need to create an empty path, so that we at
    // least still compute score based on just the locked tiles.
    if (!winner && openCompositions.length === 0) openCompositions.push([]);

    // If this is the winner, though, then we _know_ there is at
    // least one winning path for this person to have won.
    if (winner) {
      // first check for non-standard-pattern limit hands
      let limit = this.checkAllTilesForLimit(allTiles, locked.reduce((t,s) => t + s.length, 0));
      if (limit) return { limit:limit, log: [`Limit hand: ${limit}`], score: this.limit, doubles: 0, total: this.limit };

      // no limit: proceed to score hand based on normal win paths.
      openCompositions = tileInformation.winpaths;
    }

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
