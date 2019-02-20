/**
 * Chinese Classical rules.
 */
class ChineseClassical extends Ruleset {
  constructor() {
    super(2000, 1000);
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
        let east = i === eastplayer ? 2 : 1;
        let difference = wscore * Math.max(eastwin, east);
        adjustments[winningplayer] += difference;
        console.debug(`${winningplayer} gets ${difference} from ${i}`);
        adjustments[i] -= wscore * Math.max(eastwin, east);
        console.debug(`${i} pays ${difference} to ${winningplayer}`);
      }

      if (!config.LOSERS_SETTLE_SCORES) continue;

      // If losers should settle their scores amongst
      // themselves, make that happen right here:
      for (let j = i + 1; j < scores.length; j++) {
        if (j === winningplayer) continue;

        let east = i == eastplayer ? 2 : 1;
        let difference = (scores[i].total - scores[j].total) * east;
        console.debug(`${i} gets ${difference} from ${j}`);
        adjustments[i] += difference;
        console.debug(`${j} pays ${difference} to ${i}`);
        adjustments[j] -= difference;
      }
    }

    if (winningplayer === eastplayer)
      scores[eastplayer].log.push(`Player won as East`);
    else scores[eastplayer].log.push(`Player lost as East`);

    return adjustments;
  }

  /**
   * ...docs go here...
   */
  _tile_score(set, windTile, windOfTheRoundTile) {
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

    const prefix = locked ? "" : "concealed ";

    // Triplets
    if (set.length === 3) {
      // chows score nothing.
      let s1 = set[1];
      s1 = s1.dataset ? parseInt(s1.dataset.tile) : s1;
      if (s1 === tile) {
        if (tile < 27) {
          if (tile % 9 === 0 || tile % 9 === 8) {
            score += locked ? 4 : 8;
            log.push(
              `${locked ? 4 : 8} for ${prefix}pung of terminals (${tile})`
            );
          } else {
            score += locked ? 2 : 4;
            log.push(`${locked ? 2 : 4} for ${prefix}pung of simple (${tile})`);
          }
        } else if (tile < 31) {
          score += locked ? 4 : 8;
          log.push(`${locked ? 4 : 8} for ${prefix}pung of winds (${tile})`);
          if (tile === windTile) {
            doubles += 1;
            log.push(`1 double for a pung of player's own wind (${tile})`);
          }
          if (tile === windOfTheRoundTile) {
            doubles += 1;
            log.push(`1 double for a pung of wind of the round (${tile})`);
          }
        } else {
          score += locked ? 4 : 8;
          log.push(`${locked ? 4 : 8} for ${prefix}pung of dragons (${tile})`);
          doubles += 1;
          log.push(`1 double for a pung of dragons (${tile})`);
        }
      }
    }

    // goodness, a kong!
    if (set.length === 4) {
      if (tile < 27) {
        if (tile % 9 === 0 || tile % 9 === 8) {
          score += locked ? 16 : 32;
          log.push(
            `${locked ? 16 : 32} for ${prefix}kong of terminals (${tile})`
          );
        } else {
          score += locked ? 8 : 16;
          log.push(`${locked ? 8 : 16} for ${prefix}kong of simple (${tile})`);
        }
      } else if (tile < 31) {
        score += locked ? 16 : 32;
        log.push(`${locked ? 16 : 32} for ${prefix}kong of winds (${tile})`);
        if (tile === windTile) {
          doubles += 1;
          log.push(`1 double for a kong of player's own wind`);
        }
        if (tile === windOfTheRoundTile) {
          doubles += 1;
          log.push(`1 double for a kong of wind of the round`);
        }
      } else {
        score += locked ? 16 : 32;
        log.push(`${locked ? 16 : 32} for ${prefix}kong of dragons (${tile})`);
        doubles += 1;
        log.push(`1 double for a kong of dragons (${tile})`);
      }
    }

    return { score, doubles, log };
  }

  /**
   * ...docs go here...
   */
  checkWinnerHandPatterns(scorePattern, winset, selfdraw = false, windTile, windOfTheRoundTile, tilesLeft, scoreObject) {
    let state = this.getState(scorePattern, winset, selfdraw, windTile, windOfTheRoundTile, tilesLeft);

    if (state.selfdraw) {
      scoreObject.score += 2;
      scoreObject.log.push(`2 points for self-drawn win`);
    }

    if (state.outonPair) {
      scoreObject.score += 2;
      scoreObject.log.push(`2 points for winning on a pair`);
    }

    if (state.outonPair && state.majorPair) {
      scoreObject.score += 2;
      scoreObject.log.push(`2 points for winning on a major pair`);
    }

    if (state.allchow && !state.majorPair) {
      scoreObject.doubles += 1;
      scoreObject.log.push(`1 double for a chow hand`);
    }

    if (state.onesuit) {
      if (state.honours) {
        scoreObject.doubles += 1;
        scoreObject.log.push(
          `1 double for a one suit (${state.suit}) and honours hand`
        );
      } else {
        scoreObject.doubles += 3;
        scoreObject.log.push(`3 doubles for a clean one suit hand (${state.suit})`);
      }
    }

    if (state.allterminals) {
      scoreObject.limit = `all terminals hand`;
    }

    if (state.allhonours) {
      scoreObject.limit = `all honours hand`;
    }

    if (state.punghand) {
      scoreObject.doubles += 1;
      scoreObject.log.push(`1 double for an all pung hand`);
    }

    if (state.kongCount === 4) {
      scoreObject.limit = `All kong hand`;
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
      scoreObject.doubles += 1;
      scoreObject.log.push(`1 double for a fully concealed hand`);
    }

    if (state.concealedCount === 5 && state.punghand) {
      scoreObject.limit = `Fully concealed pung hand`;
    }

    if (state.lastTile) {
      scoreObject.doubles += 1;
      if (selfdraw) {
        scoreObject.log.push(
          `1 double for winning with the last available wall tile`
        );
      } else {
        scoreObject.log.push(`1 double for winning with the last discard`);
      }
    }
  }

  /**
   * Determine the tile score for a collection of sets
   */
  getTileScore(scorePattern, windTile, windOfTheRoundTile, bonus, winset, winner = false, selfdraw = false, tilesLeft) {
    let result = scorePattern
      .map(set => this._tile_score(set, windTile, windOfTheRoundTile))
      .reduce(
        (t, v) => {
          t.score += v.score;
          t.doubles += v.doubles;
          t.log = t.log.concat(v.log);
          return t;
        },
        {
          score: 0,
          doubles: 0,
          log: []
        }
      );

    let hasOwnFlower = false;
    let hasOwnSeason = false;
    bonus.forEach(tile => {
      result.score += 4;
      result.log.push(`4 for bonus tile (${tile})`);

      if (ownFlower(tile, windTile)) {
        hasOwnFlower = true;
      }

      if (ownSeason(tile, windTile)) {
        hasOwnSeason = true;
      }
    });

    if (hasOwnFlower && hasOwnSeason) {
      result.doubles += 1;
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
    if (winner)
      this.checkWinnerHandPatterns(scorePattern, winset, selfdraw, windTile, windOfTheRoundTile, tilesLeft, result);

    if (result.limit) {
      result.score = this.limit;
      result.doubles = 0;
      result.total = this.limit;
    } else {
      result.total = result.score * 2 ** result.doubles;
      if (result.total > this.limit) {
        result.log.push(`Score limited from ${result.total} to ${this.limit}`);
        result.total = this.limit;
      }
    }

    return result;
  }
}

// register as a ruleset
Ruleset.register(ChineseClassical);


// ====================================
//         TESTING CODE
// ====================================


if (typeof process !== "undefined") {
  (function() {
    tilesNeeded = require("../algorithm/tiles-needed.js");
    Logger = console;
    module.exports = scoreTiles;

    // shortcut if we're merely being required
    let invocation = process.argv.join(" ");
    if (invocation.indexOf("chinese-classical.j") === -1) return;

    function lock(sets, win) {
      return sets.map((set, sid) =>
        set.map(t => {
          let dataset = { tile: t, locked: "locked" };
          if (sid === win) dataset.winning = "winning";
          return { dataset };
        })
      );
    }

    let tests = [
      {
        id: 0,
        wotr: 0,
        tilesLeft: 50,
        winner: true,
        selfdraw: false,
        concealed: [32, 32, 32],
        locked: lock([[1, 2, 3], [2, 3, 4], [3, 4, 5], [6, 6]], 3),
        bonus: [],
        wind: 1
      }
    ];

    tests.forEach(test => {
      scoreTiles(test, test.id, test.wotr, test.tilesLeft);
    });
  })();
}
