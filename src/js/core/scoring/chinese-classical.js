/**
 * Chinese Classical rules.
 */
class ChineseClassical extends Ruleset {
  constructor() {
    super("Chinese Classical");
    this.init();
  }

  init() {
    this.player_start_score = 2000;
    this.limit = 1000;
  }

  /**
   * Turn basic tilescores into score adjustments, by running
   * the "how much does the winner get" and "how much do the
   * losers end up paying" calculations.
   */
  settleScores(scores, winningplayer, eastplayer) {
    let adjustments = [0, 0, 0, 0];
    let eastwin = winningplayer === eastplayer ? 2 : 1;

    for (let i = 0; i < scores.length; i++) {
      if (i === winningplayer) continue;

      // every non-winner pays the winner.
      if (i !== winningplayer) {
        let wscore = scores[winningplayer].total;
        let east = i === eastplayer ? 2 : 1;
        let difference = wscore * Math.max(eastwin, east);
        adjustments[winningplayer] += difference;
        Logger.debug(`${winningplayer} gets ${difference} from ${i}`);
        adjustments[i] -= wscore * Math.max(eastwin, east);
        Logger.debug(`${i} pays ${difference} to ${winningplayer}`);
      }

      if (!config.LOSERS_SETTLE_SCORES) continue;

      // If losers should settle their scores amongst
      // themselves, make that happen right here:
      for (let j = i + 1; j < scores.length; j++) {
        if (j === winningplayer) continue;

        let east = i == eastplayer ? 2 : 1;
        let difference = (scores[i].total - scores[j].total) * east;
        Logger.debug(`${i} gets ${difference} from ${j}`);
        adjustments[i] += difference;
        Logger.debug(`${j} pays ${difference} to ${i}`);
        adjustments[j] -= difference;
      }
    }

    if (winningplayer === eastplayer)
      scores[eastplayer].log.push(`Player won as East`);
    else scores[eastplayer].log.push(`Player lost as East`);

    return adjustments;
  }

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

  checkWinnerHandPatterns(
    scorePattern,
    winset,
    selfdraw = false,
    windTile,
    windOfTheRoundTile,
    tilesLeft,
    scoreObject
  ) {
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
    let ownWindPung = false;
    let wotrPung = false;
    let ownWindKong = false;
    let wotrKong = false;

    let windPungCount = 0;
    let windKongCount = 0;
    let dragonPungCount = 0;
    let dragonKongCount = 0;
    let concealedCount = 0;
    let kongCount = 0;

    let suit = false,
      tile,
      tilesuit;
    scorePattern.forEach(set => {
      tile = set[0];
      tilesuit = (tile / 9) | 0;

      if (tile < 27) {
        if (suit === false) suit = tilesuit;
        else if (suit !== tilesuit) onesuit = false;
        if (set.some(t => t !== 0 || t !== 8)) {
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
          if (tile > 26 && tile < 31) {
            windPair = true;
            majorPair = true;
          }
          if (tile > 30) {
            dragonPair = true;
            majorPair = true;
          }
          if (tile === windTile) {
            ownWindPair = true;
            majorPair = true;
          }
          if (tile === windOfTheRoundTile) {
            wotrPair = true;
            majorPair = true;
          }
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
        scoreObject.log.push(
          `1 double for a one suit (${suit}) and honours hand`
        );
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
        scoreObject.log.push(
          `1 double for winning with the last available wall tile`
        );
      } else {
        scoreObject.log.push(`1 double for winning with the last discard`);
      }
    }

    // MISSING: supplement tile, robbing a kong, "waiting to win after initial deal".
  }

  /**
   * Determine the tile score for a collection of sets
   */
  getTileScore(
    scorePattern,
    windTile,
    windOfTheRoundTile,
    bonus,
    winset,
    winner = false,
    selfdraw = false,
    tilesLeft
  ) {
    Logger.debug(scorePattern.map(s => s.locked));

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
      this.checkWinnerHandPatterns(
        scorePattern,
        winset,
        selfdraw,
        windTile,
        windOfTheRoundTile,
        tilesLeft,
        result
      );

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
