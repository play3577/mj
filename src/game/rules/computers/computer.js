const { ChineseClassical, Cantonese } = require("../presets");
const { FAAN_LAAK } = require("../utils/types.js");

const PointComputer = require("./point-computer.js");
const FaakLaakTable = require("./faan-laak-table.js");

class Computer {
  /**
   *
   */
  constructor(pointcomputer = new PointComputer()) {
    const config = pointcomputer.getConfiguration();

    this.compute = pointcomputer;
    this.scoretype = config.scoretype;

    this.player_start_score = config.player_start_score;
    this.limit = config.limit;
    this.points_for_winning = config.points_for_winning;
    this.no_point_score = config.no_point_score;
    this.losers_settle_scores = config.losers_settle_scores;
    this.east_doubles_up = config.east_doubles_up;
    this.selfdraw_pays_double = config.selfdraw_pays_double;
    this.discard_pays_double = config.discard_pays_double;
    this.reverse_wind_direction = config.reverse_wind_direction;
    this.pass_on_east_win = config.pass_on_east_win;

    if (config.scoretype === FAAN_LAAK) {
      this.limit = config.limit[0];
      this.faan_laak_limits = config.limit;
      this.setupFaanLaakTable(this.no_point_score, config.limit);
    }
  }

  /**
   * This is its own function, so that subclasses can override it with different values.
   */
  setupFaanLaakTable(no_point_score, limits) {
    this.faan_laak_table = new FaakLaakTable(no_point_score, limits);
  }

  /**
   * Get all the configuration options for this ruleset.
   */
  getRuleData() {
    return this.compute.getConfiguration();
  }

  /**
   * calculate the actual number of points awarded under point/double rules.
   */
  getPointsDoubleLimit() {
    return this.limit;
  }

  /**
   * calculate the actual number of points awarded under point/double rules.
   */
  getFaanLaakLimit(selfdraw) {
    return this.faan_laak_table.get(0, selfdraw, true);
  }

  /**
   * perform standard Faan conversion
   */
  convertFaan(points, selfdraw, limit) {
    return this.faan_laak_table.get(points, selfdraw, limit);
  }

  /**
   * perform points/doubles conversion
   */
  convertPoints(points, doubles) {
    if (!points && this.no_point_score) points = this.no_point_score;
    return points * 2 ** doubles;
  }

  /**
   * Turn basic tilescores into score adjustments, by running
   * the "how much does the winner get" and "how much do the
   * losers end up paying" calculations.
   */
  pointsToScores(points, winningSeat, eastSeat, discardingSeat) {
    let adjustments = points.map(v => 0);
    let eastWinFactor = winningSeat === eastSeat ? 2 : 1;
    let wscore = points[winningSeat].total;
    let selfdraw = discardingSeat === false;

    for (let seat = 0; seat < points.length; seat++) {
      if (seat === winningSeat) continue;

      // every non-winner pays the winner.
      if (seat !== winningSeat) {
        let difference = wscore;
        if (this.east_doubles_up) {
          let paysAsEast = seat === eastSeat ? 2 : 1;
          difference *= Math.max(eastWinFactor, paysAsEast);
        }
        if (
          (this.discard_pays_double && seat === discardingSeat) ||
          (this.selfdraw_pays_double && selfdraw)
        ) {
          difference *= 2;
        }
        adjustments[winningSeat] += difference;
        // console.debug(`${winningSeat} gets ${difference} from ${seat}`);
        adjustments[seat] -= difference;
        // console.debug(`${seat} pays ${difference} to ${winningSeat}`);
      }

      if (!this.losers_settle_scores) continue;

      // If losers should settle their scores amongst
      // themselves, make that happen right here:
      for (let other = seat + 1; other < points.length; other++) {
        if (other === winningSeat) continue;

        let difference = points[seat].total - points[other].total;
        if (this.east_doubles_up) {
          let paysAsEast = seat === eastSeat ? 2 : 1;
          difference *= paysAsEast;
        }
        // console.debug(`${seat} gets ${difference} from ${other}`);
        adjustments[seat] += difference;
        // console.debug(`${other} pays ${difference} to ${seat}`);
        adjustments[other] -= difference;
      }
    }

    if (this.east_doubles_up) {
      if (winningSeat === eastSeat)
        points[eastSeat].log.push(`Player won as East: receive double`);
      else points[eastSeat].log.push(`Player lost as East: pay double`);
    }

    return adjustments;
  }
}

Computer.ChineseClassical = new Computer(new ChineseClassical());
Computer.Cantonese = new Computer(new Cantonese());

Computer.get = function(name) {
  if (name === `Chinese Classical`) return Computer.ChineseClassical;
  if (name === `Cantonese`) return Computer.Cantonese;
};

module.exports = Computer;
