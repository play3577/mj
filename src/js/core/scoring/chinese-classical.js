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

    if (winningplayer === eastplayer) scores[eastplayer].log.push(`Player won as East`);
    else scores[eastplayer].log.push(`Player lost as East`);

    return adjustments;
  }

  /**
   * ...docs go here...
   */
  _tile_score(set, windTile, windOfTheRoundTile) {
    let name = config.TILE_NAMES;

    let locked = set.locked;
    let tile = set[0];

    let log = [];
    let value;
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
            score + value;
            log.push(`${value} for ${prefix}pung of terminals (${name[tile]})`);
          } else {
            value = locked ? 4 : 8;
            score + value;
            log.push(`${value} for ${prefix}pung of simple (${name[tile]})`);
          }
        } else if (tile < 31) {
          value = locked ? 4 : 8;
          score += value
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
          score += value
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

  checkAllTilesForLimit(allTiles, lockedSize) {
    let test;
    const reset = () => test = allTiles.slice().sort();

    // check for thirteen orphans (1/9 of each suit, each wind and dragon once, and a pairing tile)
    let thirteen = [0,8,9,17,18,26,27,28,29,30,31,32,33];
    reset();
    thirteen.forEach(t => { let pos = test.indexOf(t); if (pos>-1) test.splice(pos,1); });
    if (test.length === 1 && thirteen.indexOf(test[0])>-1) return `Thirteen orphans`;

    // check for nine gates (1,1,1, 2,3,4,5,6,7,8, 9,9,9, and a pairing tile)
    if (lockedSize<=2 && test.every(t => t<27)) {
      let suit = (test[0]/9) | 0;
      if (test.every(t =>  ((t/9)|0) === suit)) {
        let offset = suit * 9;
        let nine = [0,0,0, 1,2,3,4,5,6,7, 8,8,8].map(t => t+offset);
        nine.forEach(t => { let pos = test.indexOf(t); if (pos>-1) test.splice(pos,1); });
        if (test.length === 1 && offset < test[0] && test[0] < offset+8) return `Nine gates`;
      }
    }
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

    let name = config.TILE_NAMES;
    let hasOwnFlower = false;
    let hasOwnSeason = false;
    bonus.forEach(tile => {
      result.score += 4;
      result.log.push(`4 for bonus tile (${name[tile]})`);

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
