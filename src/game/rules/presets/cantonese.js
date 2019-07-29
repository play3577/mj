const { FAAN_LAAK } = require("../utils/types.js");
const PointComputer = require("../computers/point-computer.js");

const { TILE_NAMES, SUIT_NAMES } = require("../utils/../../../utils/mj-names.js");
const names = TILE_NAMES;
const suits = SUIT_NAMES;

const CONFIG = {
  scoretype: FAAN_LAAK,
  player_start_score: 500,
  limit: [5, 7, 10],
  points_for_winning: 0,
  no_point_score: 0.5,
  losers_settle_scores: false,
  east_doubles_up: false,
  selfdraw_pays_double: true,
  discard_pays_double: true,
  reverse_wind_direction: true,
  pass_on_east_win: true
};

class Cantonese extends PointComputer {
  getConfiguration() {
    return CONFIG;
  }

  getPairValue(tile, playerWind, windOfTheRound, locked) {
    return PointComputer.NO_SCORE;
  }

  getChowValue(tile, playerWind, windOfTheRound, locked) {
    return PointComputer.NO_SCORE;
  }

  /**
   * What are considered point-scoring pungs in this ruleset?
   */
  getPungValue(tile, playerWind, windOfTheRound, locked) {
    let prefix = locked ? "" : "concealed ";

    if (tile > 26) {
      if (tile > 30) {
        return {
          score: 1,
          log: [`1 faan for pung of dragons (${names[tile]})`]
        };
      }

      let scoreObject = { score: 0, log: [] };
      if (tile === windTile) {
        scoreObject.score += 1;
        scoreObject.log.push(
          `1 faan for pung of player's own wind (${names[tile]})`
        );
      }
      if (tile === windOfTheRoundTile) {
        scoreObject.score += 1;
        scoreObject.log.push(
          `1 faan for pung of wind of the round (${names[tile]})`
        );
      }
      return scoreObject;
    }
  }

  /**
   * What are considered point-scoring kongs in this ruleset?
   */
  getKongValue(tile, playerWind, windOfTheRound, locked) {
    if (tile > 26) {
      if (tile > 30) {
        return {
          score: 1,
          log: [`1 faan for kong of dragons (${names[tile]})`]
        };
      }

      let scoreObject = { score: 0, log: [] };
      if (tile === windTile) {
        scoreObject.score += 1;
        scoreObject.log.push(
          `1 faan for kong of player's own wind (${names[tile]})`
        );
      }
      if (tile === windOfTheRoundTile) {
        scoreObject.score += 1;
        scoreObject.log.push(
          `1 faan for kong of wind of the round (${names[tile]})`
        );
      }
      return scoreObject;
    }
  }

  /**
   * Award points based on bonus tiles.
   */
  bonusPoints(bonus, playerWind) {
    const scoreObject = PointComputer.NO_SCORE;

    let hasOwnFlower = false;
    let hasOwnSeason = false;

    bonus.forEach(tile => {
      if (this.ownFlower(tile, playerWind)) hasOwnFlower = true;
      if (this.ownSeason(tile, playerWind)) hasOwnSeason = true;
    });

    if (bonus.length === 0) {
      scoreObject.score += 1;
      scoreObject.log.push(`1 faan for no flowers or seasons`);
    }

    if (hasOwnFlower) {
      scoreObject.score += 1;
      scoreObject.log.push(`1 faan for own flower and season`);
    }

    if (hasOwnSeason) {
      scoreObject.score += 1;
      scoreObject.log.push(`1 faan for own flower and season`);
    }

    if (this.allFlowers(bonus)) {
      scoreObject.score += 1;
      scoreObject.log.push(`1 faan for having all flowers`);
    }

    if (this.allSeasons(bonus)) {
      scoreObject.score += 1;
      scoreObject.log.push(`1 faan for having all seasons`);
    }

    return scoreObject;
  }

  /**
   * There are special points that any player can get
   * at the end of the hand. Calculate those here:
   */
  handPoints(state) {
    const scoreObject = PointComputer.NO_SCORE;

    if (state.little_dragons) {
      scoreObject.doubles += 1;
      scoreObject.log.push(`1 double for little three dragons`);
    }

    return scoreObject;

  }

  /**
   * There are special points that you can only get
   * by winning the hand. Calculate those here:
   */
  winPoints(state) {
    const scoreObject = PointComputer.NO_SCORE;

    if (state.selfdraw) {
      scoreObject.score += 1;
      scoreObject.log.push(`1 faan for self-drawn win (${names[selftile]})`);
    }

    if (state.robbed) {
      scoreObject.score += 1;
      scoreObject.log.push(`1 faan for robbing a kong (${names[winset[0]]})`);
    }

    if (state.chowhand && !state.majorPair) {
      scoreObject.score += 1;
      scoreObject.log.push(`1 faan for chow hand`);
    }

    if (state.onesuit) {
      if (state.honours) {
        scoreObject.score += 1;
        scoreObject.log.push(
          `1 faan for one suit (${suits[state.suit]}) and honours hand`
        );
      } else {
        scoreObject.score += 5;
        scoreObject.log.push(
          `5 faan for clean one suit hand (${suits[state.suit]})`
        );
      }
    }

    if (state.allterminals) {
      scoreObject.limit = `all terminals hand`;
    }

    if (state.allhonours) {
      scoreObject.limit = `all honours hand`;
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

    // no point hand?
    if (scoreObject.score === 0) {
      scoreObject.log.push(`${this.no_point_score} for no-point hand`);
    }

    return scoreObject;
  }
}

module.exports = Cantonese;
