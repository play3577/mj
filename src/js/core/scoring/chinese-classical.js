if (typeof process !== "undefined") {
  if (typeof Ruleset === "undefined") {
    Ruleset = require('./ruleset');
  }
}

/**
 * Chinese Classical rules.
 */
class ChineseClassical extends Ruleset {
  constructor() {
    super(2000, 1000, true, true);
  }

  /**
   * ...docs go here...
   */
  _tile_score(set, windTile, windOfTheRoundTile) {
    let name = config.TILE_NAMES;

    let locked = set.locked;
    let tile = set[0];

    let log = [];
    let value = 0;
    let score = 0;
    let doubles = 0;

    // Kongs get to change this prefix, because they can be one
    // of three forms, with one being both locked AND concealed
    // (namely, a locked kong formed out of a concealed pung).
    let prefix = (locked && !set.concealed) ? "" : "concealed ";

    // Pairs
    if (set.length === 2) {
      if (tile > 30) {
        value = 2;
        score += value;
        log.push(`${value} for pair of dragons (${name[tile]})`);
      }
      if (tile === windTile) {
        value = 2;
        score += value;
        log.push(`${value} for pair of own wind (${name[tile]})`);
      }
      if (tile === windOfTheRoundTile) {
        value = 2;
        score += value;
        log.push(`${value} for pair of wind of the round (${name[tile]})`);
      }
    }

    // Triplets
    if (set.length === 3) {
      // chows score nothing.
      let s1 = set[1];
      s1 = s1.dataset ? parseInt(s1.dataset.tile) : s1;
      if (s1 === tile) {
        if (tile < 27) {
          if (tile % 9 === 0 || tile % 9 === 8) {
            value = locked ? 4 : 8;
            score += value;
            log.push(`${value} for ${prefix}pung of terminals (${name[tile]})`);
          } else {
            value = locked ? 2 : 4;
            score += value;
            log.push(`${value} for ${prefix}pung of simple (${name[tile]})`);
          }
        } else if (tile < 31) {
          value = locked ? 4 : 8;
          score += value;
          log.push(`${value} for ${prefix}pung of winds (${name[tile]})`);
          if (tile === windTile) {
            doubles += 1;
            log.push(`1 double for a pung of player's own wind (${name[tile]})`);
          }
          if (tile === windOfTheRoundTile) {
            doubles += 1;
            log.push(`1 double for a pung of wind of the round (${name[tile]})`);
          }
        } else {
          value = locked ? 4 : 8;
          score += value;
          log.push(`${value} for ${prefix}pung of dragons (${name[tile]})`);
          doubles += 1;
          log.push(`1 double for a pung of dragons (${name[tile]})`);
        }
      }
    }

    // goodness, a kong!
    if (set.length === 4) {

      // Is this a melded kong (locked, not concealed), a
      // claimed kong (locked, concealed=3 for pung), or
      // a self-drawn kong (locked, concealed=4 for kong)?
      let ccount = set.concealed;

      if (!ccount) {
        prefix = `melded `
      } else if (ccount ===3) {
        prefix = `claimed `
      } else if (ccount ===3) {
        prefix = `concealed `
      }

      if (tile < 27) {
        if (tile % 9 === 0 || tile % 9 === 8) {
          value = (locked || ccount===3) ? 16 : 32;
          score += value;
          log.push(`${value} for ${prefix}kong of terminals (${name[tile]})`);
        } else {
          value = (locked || ccount===3) ? 8 : 16;
          score += value;
          log.push(`${value} for ${prefix}kong of simple (${name[tile]})`);
        }
      } else if (tile < 31) {
        value = (locked || ccount===3) ? 16 : 32;
        score += value;
        log.push(`${value} for ${prefix}kong of winds (${name[tile]})`);
        if (tile === windTile) {
          doubles += 1;
          log.push(`1 double for a kong of player's own wind`);
        }
        if (tile === windOfTheRoundTile) {
          doubles += 1;
          log.push(`1 double for a kong of wind of the round`);
        }
      } else {
        value = (locked || ccount===3) ? 16 : 32;;
        score += value;
        log.push(`${value} for ${prefix}kong of dragons (${name[tile]})`);
        doubles += 1;
        log.push(`1 double for a kong of dragons (${name[tile]})`);
      }
    }

    return { score, doubles, log };
  }

  /**
   * ...docs go here...
   */
  checkWinnerHandPatterns(scorePattern, winset, selfdraw, selftile, windTile, windOfTheRoundTile, tilesLeft, scoreObject) {
    let suits = config.SUIT_NAMES;

    let state = this.getState(scorePattern, winset, selfdraw, selftile, windTile, windOfTheRoundTile, tilesLeft);

    if (state.selfdraw) {
      scoreObject.score += 2;
      scoreObject.log.push(`2 for self-drawn win`);
    }

    if (state.outonPair) {
      scoreObject.score += 2;
      scoreObject.log.push(`2 for winning on a pair`);
    }

    if (state.outonPair && state.majorPair) {
      scoreObject.score += 2;
      scoreObject.log.push(`2 for winning on a major pair`);
    }

    if (state.allchow && !state.majorPair) {
      scoreObject.doubles += 1;
      scoreObject.log.push(`1 double for a chow hand`);
    }

    if (state.onesuit) {
      if (state.honours) {
        scoreObject.doubles += 1;
        scoreObject.log.push(
          `1 double for a one suit (${suits[state.suit]}) and honours hand`
        );
      } else {
        scoreObject.doubles += 3;
        scoreObject.log.push(`3 doubles for a clean one suit hand (${suits[state.suit]})`);
      }
    }

    if (state.allterminals) {
      scoreObject.limit = `all terminals hand`;
    }

    if (state.allhonours) {
      scoreObject.limit = `all honours hand`;
    }

    if (state.terminal && state.honours) {
      scoreObject.doubles += 1;
      scoreObject.log.push(`1 double for terminals an honours hand`);
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

    if (state.allGreen) {
      scoreObject.limit = `"All Green" (bamboos 2, 3, 4, 6, 8 and/or green dragons)`;
    }
  }

  /**
   * Determine the tile score for a collection of sets
   */
  getTileScore(scorePattern, windTile, windOfTheRoundTile, bonus, winset, winner=false, selfdraw=false, selftile=false, tilesLeft) {
    let result = this.aggregateScorePattern(scorePattern, windTile, windOfTheRoundTile);
    let name = config.TILE_NAMES;
    let hasOwnFlower = false;
    let hasOwnSeason = false;
    bonus.forEach(tile => {
      result.score += 4;
      result.log.push(`4 for bonus tile (${name[tile]})`);

      if (this.ownFlower(tile, windTile)) {
        hasOwnFlower = true;
      }

      if (this.ownSeason(tile, windTile)) {
        hasOwnSeason = true;
      }
    });

    if (hasOwnFlower && hasOwnSeason) {
      result.doubles += 1;
      result.log.push(`1 double for own flower and season`);
    }

    if (this.allFlowers(bonus)) {
      result.doubles += 2;
      result.log.push(`1 more double for having all flowers`);
    }

    if (this.allSeasons(bonus)) {
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
    if (winner) this.checkWinnerHandPatterns(scorePattern, winset, selfdraw, selftile, windTile, windOfTheRoundTile, tilesLeft, result);

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
}

// register as a ruleset
Ruleset.register(ChineseClassical);


// ====================================
//         TESTING CODE
// ====================================


if (typeof process !== "undefined") {
  (function() {
    config = require('../../../config.js');
    tilesNeeded = require("../algorithm/tiles-needed.js");
    Logger = console;

    // shortcut if we're merely being required
    let invocation = process.argv.join(" ");
    if (invocation.indexOf("chinese-classical.j") === -1) return;

    let rules = new ChineseClassical();

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
      },
      {
        id: 0,
        wotr: 0,
        tilesLeft: 50,
        winner: true,
        selfdraw: false,
        concealed: [5,5,5, 11,12,13],
        locked: lock([[20,21,22], [24,25,26], [11,11]], 3),
        bonus: [],
        wind: 1
      },
    ];

    tests.forEach((test,id) => {
      if (id < 1) return;

      console.log(test.concealed, test.locked.map(set => set.map(t => t.dataset.tile)), test.bonus);
      let scores = rules.scoreTiles(test, test.id, test.wotr, test.tilesLeft);
      console.log(scores);
    });
  })();
}
