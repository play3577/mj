const LimitHands = require("./limit-hands");

class PointComputer {
  constructor(type) {
    this.limits = new LimitHands(type);
  }

  ownFlower(tile, windTile) {
    return tile - 34 === windTile - 27;
  }

  ownSeason(tile, windTile) {
    return tile - 38 === windTile - 27;
  }

  allFlowers(bonus) {
    return [34, 35, 36, 37].every(t => bonus.indexOf(t) > -1);
  }

  allSeasons(bonus) {
    return [38, 39, 40, 41].every(t => bonus.indexOf(t) > -1);
  }

  /**
   *  ...
   */
  hasLimit(tiles, sets, lockedSets) {
    let limit = this.limits.test(tiles, sets, lockedSets);
    if (limit) return limit;
  }


  /**
   *  ...
   */
  tilePoints(sets, playerWind, windOfTheRound, locked = false) {
    return sets.map(tiles => {
      let tile = tiles[0];
      let pointScoringFn = () => ({ score: 0, double: 0, log: [] });
      if (tiles.length === 2 && tile === tiles[1]) pointScoringFn = this.getPairValue;
      if (tiles.length === 3)
        if (tile !== tiles[1]) pointScoringFn = this.getChowValue;
        else pointScoringFn = this.getPungValue;
      if (tiles.length === 4) pointScoringFn = this.getKongValue;
      return pointScoringFn(tile, playerWind, windOfTheRound, locked);
    });
  }


  /**
   *  ...
   */
  getPairValue(tile, playerWind, windOfTheRound, locked) {
    let score = (tile === playerWind || tile === windOfTheRound || tile >= 31) ? 2 : 0;
    return {
      score,
      doubles: 0,
      log: [`${score} for a pair of ${tile}`]
    };
  }

  /**
   *  ...
   */
  getChowValue(tile, _wind, _wotr, locked) {
    let score = locked ? 0 : 0.5;
    return {
      score,
      doubles: 0,
      log: [`${score} for a chow ${tile},${tile+1},${tile+2}`]
    };
  }

  /**
   *  ...
   */
  getPungValue(tile, playerWind, windOfTheRound, locked) {
    let score = locked ? 2 : 4;
    let doubles = (tile === playerWind || tile === windOfTheRound || tile > 30) ? 1 : 0;
    return {
      score,
      doubles,
      log: [`${score} for a pung of ${tile} (${doubles} doubles)`]
    };
  }

  /**
   *  ...
   */
  getKongValue(tile, playerWind, windOfTheRound, locked) {
    let score = locked ? 4 : 8;
    let doubles = (tile === playerWind || tile === windOfTheRound || tile > 30) ? 1 : 0;
    return {
      score,
      doubles,
      log: [`${score} for a kong of ${tile} (${doubles} doubles)`]
    };
  }

  /**
   *  ...
   */
  bonusPoints(bonusTiles, playerWind) {
    return {
      score: bonusTiles.length,
      doubles: 0,
      log: [`${bonusTiles.length}x bonus`]
    };
  }

  /**
   *  ...
   */
  handPoints(state, sets, lockedSets, playerWind, windOfTheRound) {
    return {
      score: 0,
      doubles: 0,
      log: [`no points for hand computed`]
    };
  }

  /**
   *  ...
   */
  winPoints(state, sets, lockedSets, playerWind, windOfTheRound) {
    return {
      score: 1,
      doubles: 0,
      log: [`1 point for winning`]
    };
  }
}

Object.defineProperty(PointComputer, 'NO_SCORE', {
  get: () => ({ score: 0, doubles: 0, total: 0, log: [] })
});

module.exports = PointComputer;
