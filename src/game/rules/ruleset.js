const findTilesNeeded = require("./utils/find-tiles-needed.js");
const { POINTS_DOUBLES, FAAN_LAAK } = require("./utils/types.js");
const getHandState = require("./utils/get-hand-state.js");
const Computer = require("./computers/computer.js");
const PointComuter = require("./computers/point-computer.js");

class Ruleset {
  /**
   *  ...
   */
  constructor(name) {
    this.computer = Computer.get(name) || Computer.ChineseClassical
  }

  /**
   *
   */
  getRuleData() {
    return this.computer.getRuleData();
  }

  /**
   * ...
   */
  score(player, windOfTheRoundTile) {
    const { tiles, locked, bonus, wind } = player;

    let { evaluations } = findTilesNeeded(tiles, locked);
    // console.log(`Found ${evaluations.length} solutions`);

    const winningPaths = evaluations.some(e => e.winner) ? true : false;
    let points = evaluations.map(path => {
      const { tiles, composition, winner } = path;

      // Shortcut based on whether we know we should be
      // scoring winning hands or not.
      if (winningPaths && !winner) return;

      const points = this.determinePoints(
        tiles,
        composition,
        locked,
        bonus,
        wind,
        windOfTheRoundTile,
        winner,
        false // selfdrawn win
        // TODO: add in selfdrawn winning awareness
      );

      // TODO: is there a way that we can short circuit "hard to compute"
      //       hands? Like concealed 222,333,444,555,66 etc.?

      points.path = { tiles, composition };

      return points;
    }).filter(e => e);

    const noscore = PointComuter.NO_SCORE;
    return points.sort((a,b) => b.total - a.total)[0] || noscore;
  }

  /**
   *  ...
   */
  determinePoints(tiles, sets, lockedSets, bonusTiles, windTile, windOfTheRoundTile, winner = false, selfdraw = false) {
    // limit hand shortcut
    let limit = this.computer.compute.hasLimit(tiles, sets, lockedSets);
    if (limit) return {
      limit: 1000,
      score: 0,
      doubles: 0,
      total: 1000,
      log: [`${limit} limit hand`]
    };

    // determine all the properties of this hand as a whole
    const state = getHandState(
      sets,
      lockedSets,

      winner && !selfdraw ? lockedSets.slice(-1) : false, // winning set
      selfdraw,
      false, // selftile
      false, // robbed

      windTile,
      windOfTheRoundTile,
      144 // playable tiles left in the wall
    );

    // if (winner) console.log(state);

    const tilepoints = this.computer.compute.tilePoints(sets, lockedSets, windTile, windOfTheRoundTile);

    // then perform non-limit scoring
    return this.reduce(
      selfdraw,
      ...tilepoints,
      this.computer.compute.handPoints(state, sets),
      winner ? this.computer.compute.winPoints(state) : false,
      this.computer.compute.bonusPoints(bonusTiles, windTile)
    );
  }

  /**
   *  ...
   */
  reduce(selfdraw, ...pointentries) {
    const result = pointentries.flat().filter(v=>v).reduce(
      (tally, entry) => {
        tally.score += entry.score;
        tally.doubles += entry.doubles || 0;
        tally.log = tally.log.concat(entry.log);
        return tally;
      },
      { score: 0, doubles: 0, log: [] }
    );

    if (this.computer.scoretype === POINTS_DOUBLES) {
      result.total = this.computer.convertPoints(result.score, result.doubles);
      if (result.total > this.limit) {
        result.log.push(`Score of ${result.total} limited to ${this.limit}`);
        result.total = this.limit;
      }
    }

    if (this.computer.scoretype === FAAN_LAAK) {
      result.total = this.computer.convertFaan(result.score, selfdraw);
    }

    return result;
  }

  /**
   * ...
   */
  pointsToScores(points, winningSeat, eastSeat, discardingSeat) {
    return this.computer.pointsToScores(points, winningSeat, eastSeat, discardingSeat)
  }
}

module.exports = Ruleset;
