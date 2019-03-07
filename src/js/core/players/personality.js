/**
 * This is a class that regulates, given a tile that a bot might
 * have the opportunity to claim, whether or not to claim it.
 */
class Personality {
  constructor(player, sliders={}) {
    this.player = player;
    this.sliders = {
      quick: sliders.quick || config.BOT_CHICKEN_THRESHOLD,
      clean: sliders.clean || config.BOT_CLEAN_THRESHOLD,
      limit: sliders.limit || config.BOT_LIMIT_THRESHOLD,
    };
    this.handtypes = { CHICKEN: 0, CHOW: 1, PUNG: 2 };
  }

  /**
   * Analyze the start tiles in a hand, to see what a
   * reasonable policy is going to be for these tiles.
   */
  determinePersonality(tiles) {
    this.handtype = this.determineHand(tiles);
  }

  /**
   * Decide whether or not a chowhand is acceptable
   */
  determineHand(tiles) {
    // ... code goes here ...
    return this.handtypes.CHICKEN;
  }

  /**
   * This is a simple stats gathering function that we can use
   * to understand the effect of removing a tile from a hand,
   * by looking the stats prior to, and after removal.
   */
  getLookoutStats(tile) {
    let tiles = this.player.getTileFaces();
    let pos = tiles.indexOf(tile);
    tiles.splice(pos, 1);
    let testPattern = new Pattern(tiles, true);

    let { results } = testPattern.expand();
    delete results.win;

    let stats = {
      discard: tile,
      chowCount: 0,
      pungCount: 0,
      suit: [0, 0, 0],
      winds: 0,
      dragons: 0,
    };

    let suit;

    tiles.forEach(tile => {
      if (tile <= 26) { suit = (tile/9)|0; stats.suit[suit]++; }
      if (tile > 26 && tile < 31) stats.winds++;
      if (tile > 31 && tile < 34) stats.dragons++;
    });

    results.forEach((v,tile) => {
      if (v >= CLAIM.CHOW && v < CLAIM.PUNG) stats.chowCount++;
      if (v >= CLAIM.PUNG && v < CLAIM.WIN) stats.pungCount++; // we're counting kongs as pungs
    });

    return stats;
  }

  /**
   * Do we want to claim a particular tile?
   */
  determineWhetherToClaim(tile, concealed, open, reason) {
    let types = this.handtypes;
    let type = this.handtype;

    if (CLAIM.CHOW <= reason && reason < CLAIM.PUNG) {
      if (type !== types.CHICKEN && type !== this.CHOW) return false;

      // for now we're just basing chow-ness on the bot's "quick" slider value
      return (config.PRNG.nextFloat() < this.sliders.quick);
    }

    // Do we want this kind of tile?
    // - do we want numbers?
    //   - if we do, do we want this suit?
    // - do we want honours?
    //   - if we do, do we want this particular one?
    // If this is a win: is this how we want to win?
    // - do we want to win on a pair

    // if we get here, nothing's ruled out this claim.
    return true;
  }

}
