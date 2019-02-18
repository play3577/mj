// helper functions
const getWindTile = wind => 27 + wind;
const ownFlower = (tile, windTile) => tile - 34 === windTile - 27;
const ownSeason = (tile, windTile) => tile - 38 === windTile - 27;
const allFlowers = bonus => [34, 35, 36, 37].every(t => bonus.indexOf(t) > -1);
const allSeasons = bonus => [38, 39, 40, 41].every(t => bonus.indexOf(t) > -1);

class Ruleset {
  constructor() {
    this.init();
  }

  init() {
    // extended by subclasses
    this.player_start_score = 0;
    this.limit = 0;
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

  getTileScore(scorePattern,windTile,windOfTheRoundTile,bonus,winset,winner = false,selfdraw = false,tilesLeft) {
    // extended by subclasses
    return { score: 0, doubles: 0, total: 0, limit: undefined, log: ['master ruleset does not perform any scoring'] };
  }

  /**
   * All possible flags and values necessary for performing scoring, used in checkWinnerHandPatterns
   */
  getState() {
    return {
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
      suit: false
    };
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
    let tiles = disclosure.concealed;
    let locked = disclosure.locked;
    let bonus = disclosure.bonus;
    let winset = false;
    let windTile = getWindTile(disclosure.wind);
    let windOfTheRoundTile = getWindTile(windOfTheRound);

    Logger.debug(`player ${id}`);
    Logger.debug(disclosure);

    // And then let's see what our tile-examining
    // algorithm has to say about the tiles we have.
    let tileInformation = tilesNeeded(tiles, locked);
    Logger.debug(tileInformation);

    let openCompositions = tileInformation.composed;

    locked = locked.map(set => {
      let winning = !!set[0].dataset.winning;
      let newset = set.map(s => parseInt(s.dataset.tile))
      newset.locked = 'locked';
      if (winning) winset = newset;
      return newset;
    });

    // If there is nothing to be formed with the tiles in hand,
    // then we need to create an empty path, so that we at
    // least still compute score based on just the locked tiles.
    if (!winner && openCompositions.length === 0) openCompositions.push([]);

    // If this is the winner, though, then we _know_ there is at
    // least one winning path for this person to have won.
    if (winner) {
      openCompositions = tileInformation.winpaths;
    }

    // Run through each possible interpetation of in-hand
    // tiles, and see how much they would score, based on
    // the getTileScore() function up above.
    let possibleScores = openCompositions.map(chain => {
      Logger.debug(`testing ${id}, chain:`, chain);

      let scorePattern = chain.map(s => {
        let terms = s.split('-');
        let c = terms[0];
        let count = parseInt(c);
        let tile = parseInt(terms[1]);
        let locked = (terms[2] && terms[2]==='!');

        let set;
        if (s.indexOf('c') > -1) set = [tile, tile+1, tile+2];
        else set = [tile, tile, tile, tile].slice(0,count);
        set.locked = locked;
        return set;
      }).concat(winner ? [] : locked);

      return this.getTileScore(scorePattern, windTile, windOfTheRoundTile, bonus, winset, winner, selfdraw, tilesLeft);
    });


    // And then make sure we award each player the highest
    // score they're elligible for.
    let finalScore = possibleScores.sort( (a,b) => { a = a.total; b = b.total; return a - b; }).slice(-1)[0];
    Logger.debug(finalScore);
    return finalScore;
  }
}

Ruleset.rulesets = {};
Ruleset.register = RulesetClass => (Ruleset.rulesets[RulesetClass.name] = new RulesetClass());
Ruleset.getRuleset = name => Ruleset.rulesets[name];
