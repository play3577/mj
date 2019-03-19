if (typeof process !== "undefined") {
  Ruleset = require('./ruleset.js');
}

/**
 * Cantonese rules.
 */
class Cantonese extends Ruleset {

  constructor() {
    super(
      Ruleset.FAAN_LAAK,
      2000,  // start points
      16,    // limit
      0,     // points for winning
      false, // losers settle their scores after paying the winner
      false, // east pays and receives double
      true,  // discarding player pays double
      true,  // player winds rotate counter to the wind of the round
      true,  // pass the deal if east wins
    );
  }

  /**
   * What are considered point-scoring pungs in this ruleset?
   */
  getPungValue(tile, locked, concealed, names, windTile, windOfTheRoundTile) {
    let prefix = (locked && !concealed) ? "" : "concealed ";

    if (tile > 26) {
      if (tile > 30) {
        return { score: 1, log: [`1 faan for pung of dragons (${names[tile]})`] };
      }

      let scoreObject = { score: 0, log: [] };
      if (tile === windTile) {
        scoreObject.score += 1;
        scoreObject.log.push(`1 faan for pung of player's own wind (${names[tile]})`);
      }
      if (tile === windOfTheRoundTile) {
        scoreObject.score += 1;
        scoreObject.log.push(`1 faan for pung of wind of the round (${names[tile]})`);
      }
      return scoreObject;
    }
  }

  /**
   * What are considered point-scoring kongs in this ruleset?
   */
  getKongValue(tile, locked, concealed, names, windTile, windOfTheRoundTile) {
    if (tile > 26) {
      if (tile > 30) {
        return { score: 1, log: [`1 faan for kong of dragons (${names[tile]})`] };
      }

      let scoreObject = { score: 0, log: [] };
      if (tile === windTile) {
        scoreObject.score += 1;
        scoreObject.log.push(`1 faan for kong of player's own wind (${names[tile]})`);
      }
      if (tile === windOfTheRoundTile) {
        scoreObject.score += 1;
        scoreObject.log.push(`1 faan for kong of wind of the round (${names[tile]})`);
      }
      return scoreObject;
    }
  }

  /**
   * There are special points that any player can get
   * at the end of the hand. Calculate those here:
   */
  checkHandPatterns(scorePattern, windTile, windOfTheRoundTile, tilesLeft, scoreObject) {
    // this ruleset only awards points for little three dragons.
    let r, g, w;

    scorePattern.forEach(set => {
      let tile = set[0];
      if (tile===31) g = set.length;
      if (tile===32) r = set.length;
      if (tile===33) w = set.length;
    });

    if (r + g + w >= 8 && (r===2 || g===2 || w===2)) {
      scoreObject.score += 4;
      scoreObject.log.push(`4 faan for little three dragons`);
    }
  }

  /**
   * There are special points that you can only get
   * by winning the hand. Calculate those here:
   */
  checkWinnerHandPatterns(scorePattern, winset, selfdraw, selftile, windTile, windOfTheRoundTile, tilesLeft, scoreObject) {
    let suits = config.SUIT_NAMES;

    let state = this.getState(scorePattern, winset, selfdraw, selftile, windTile, windOfTheRoundTile, tilesLeft);

    if (state.allchow && !state.majorPair) {
      scoreObject.score += 1;
      scoreObject.log.push(`1 faan for chow hand`);
    }

    if (state.onesuit) {
      if (state.honours) {
        scoreObject.score += 3;
        scoreObject.log.push(`3 faan for one suit (${suits[state.suit]}) and honours hand`);
      } else {
        scoreObject.score += 6;
        scoreObject.log.push(`6 faan for clean one suit hand (${suits[state.suit]})`);
      }
    }

    if (state.allterminals) {
      scoreObject.limit = `all terminals hand`;
    }

    if (state.allhonours) {
      scoreObject.score += 6;
      scoreObject.log.push(`7 faan for all honours hands`);
    }

    if (state.punghand) {
      scoreObject.score += 3;
      scoreObject.log.push(`3 faan for all pung hand`);
    }

    if (state.dragonPungCount + state.dragonKongCount === 3) {
      scoreObject.limit = `Three great scholars (pung or kong of each dragon)`;
    }

    if (state.windPungCount + state.windKongCount === 3 && state.windPair) {
      scoreObject.limit = `Little four winds (pung or kong of three wind, pair of last wind)`;
    }

    if (state.windPungCount + state.windKongCount === 4) {
      scoreObject.limit = `Big four winds (pung or kong of each wind)`;
    }

    if (state.concealedCount === 5) {
      scoreObject.score += 1;
      scoreObject.log.push(`1 faan for fully concealed hand`);
    }

    if (state.lastTile) {
      scoreObject.score += 1;
      if (selfdraw) {
        scoreObject.log.push(`1 faan for winning with the last available wall tile`);
      } else {
        scoreObject.log.push(`1 faan for winning with the last discard`);
      }
    }
  }

  /**
   * Award points based on bonus tiles.
   */
  checkBonusTilePoints(bonus, windTile, names, result) {
    let hasOwnFlower = false;
    let hasOwnSeason = false;

    bonus.forEach(tile => {
      if (this.ownFlower(tile, windTile)) hasOwnFlower = true;
      if (this.ownSeason(tile, windTile)) hasOwnSeason = true;
    });

    if (bonus.length === 0) {
      result.score += 1;
      result.log.push(`1 faan for no flowers or seasons`);
    }

    if (hasOwnFlower) {
      result.score += 1;
      result.log.push(`1 faan for own flower and season`);
    }

    if (hasOwnSeason)  {
      result.score += 1;
      result.log.push(`1 faan for own flower and season`);
    }

    if (this.allFlowers(bonus)) {
      result.score += 1;
      result.log.push(`1 faan for having all flowers`);
    }

    if (this.allSeasons(bonus)) {
      result.score += 1;
      result.log.push(`1 faan for having all seasons`);
    }
  }
}

// register as a ruleset
Ruleset.register(Cantonese);
