/**
 * This is a class that regulates, given a tile that a bot might
 * have the opportunity to claim, whether or not to claim it.
 */
class Personality {
  constructor(player) {
    this.player = player;
    this.tileCountBase = (new Array(42)).fill(0);

    // These flags determine how we treat available
    // discards and tiles we pick up for play.
    this.chicken = (config.PRNG.nextFloat() > config.BOT_CHICKEN_THRESHOLD);
    if (this.chicken) console.log(`player ${this.player.id} will be going for chicken hands!`);
    this.playClean = false;

    // For our panic threshold, we pick "4 turns"
    // (out of a possible 18 "turns" in a hand).
    this.basePanicThreshold = 16;
    this.panicThreshold = this.basePanicThreshold;
  }

  // utility function
  suit(t) { return (t/9)|0; }

  /**
   * Decide how panicky we are, based on the number
   * of draws we've seen for this hand so far.
   */
  setDraws(draws=0) {
    this.panicThreshold = this.basePanicThreshold + draws * this.basePanicThreshold;
    console.debug(`panic for ${this.player.id} set to ${this.panicThreshold}`);
  }

  /**
   * Analyze the start tiles in a hand, to see what a
   * reasonable policy is going to be for these tiles.
   */
  determinePersonality() {
    this.analyse();
  }

  /**
   * Decide whether or not a chowhand is acceptable
   */
  analyse() {
    let tiles = this.player.tiles.map(t => t.dataset.tile|0).sort();
    let locked = this.player.locked.map(s => s.map(t => t.dataset.tile|0).sort());
    let stats = this.buildStatsContainer(tiles, locked);

    // Should we play clean?
    if (!this.playClean) {
      let suitful = stats.suits.map((v,i) => v + stats.locked.suits[i]);
      let most = max(...suitful);
      let total = stats.numerals;
      if (most/total > 0.8) {
          this.playClean = stats.suits.indexOf(most);
      }
    }

    return stats;
  }

  /**
   * Do we want a particular tile?
   */
  want(tileNumber, reason, tilesRemaining) {
    // Are we the fowlest of chickens?
    if (this.chicken) {
      console.debug(this.player.id,'is going for chickens');
      return true;
    }

    // Are we in panic mode?
    if (tilesRemaining < this.panicThreshold) {
      console.debug(this.player.id,'PANIC MODE: claiming',tileNumber,'!','(',tilesRemaining,'left)');
      return true;
    }

    // Did we decide to play clean (i.e. any numbers in our hand must all be from the same suit)
    if (this.playClean && tileNumber < 27) {
      let tilesuit = this.suit(tileNumber);
      if (tilesuit !== this.playClean) {
        console.debug(this.player.id, 'not claiming ',tileNumber,'due to playing clean','(',tilesRemaining,'left)');
        return false;
      }
    }

    // If we get here, we need to actually decide what our play policy for this tile is.
    let stats = this.analyse();

    // Try not to chicken, part 1: don't go for chows if we're already playing pungs.
    if (CLAIM.CHOW <= reason && reason < CLAIM.PUNG) {
      // TODO: decide what to do if we "already have enough points"
      let couldChicken =  stats.bigpungs > 0 || stats.locked.bigpungs > 0;

      if (stats.locked.pungs > 0) { // && !couldChicken) {
        console.debug(this.player.id,'not claiming chow because we have a pung','(',tilesRemaining,'left)');
        return false;
      }
    }

    // Try not to chicken, part 2 don't go for pungs if we're going for a chow hand
    if (reason === CLAIM.PUNG || reason === CLAIM.KONG) {
      // TODO: decide what to do if we "already have enough points"
      let couldChicken =  stats.bigpungs > 0 || stats.locked.bigpungs > 0;
      let isBig = (tileNumber + 27 === this.player.wind) || (tileNumber + 27 === this.player.windOfTheRound) || (tileNumber > 30);

      if (stats.locked.chows > 0) { // && !couldChicken && !isBig) {
        console.debug(this.player.id,'not claiming pung/kong because we have a chow, and',tileNumber,'is not scoring','(',tilesRemaining,'left)');
        return false;
      }
    }

    // if we get here, nothing has ruled out this claim.
    return true;
  }

  /**
   * Do we want to win on a particular tile?
   */
  determineWhetherToWin(tileNumber, reason, tilesRemaining) {
    // TODO: refine this
    return this.want(tileNumber, reason, tilesRemaining);
  }

  /**
   * Build an object that represents "what we have"
   * so we can reason about what we might be able
   * to play for. E.g. if we have 3 chows, going for
   * a pung hand is probably not a good idea, and
   * if we have 10 tiles in one suit, and 1 tile
   * in the other two suits, we probably want to
   * try to get one suit hand.
   */
  buildStatsContainer(tiles, locked) {
    let tileCount = this.tileCountBase.slice();

    let stats = {
      cpairs: 0, // {t,t+1} or {t,t+2}
      pairs: 0,  // {t,t}
      chows: 0,  // {t, t+1, t+2}
      pungs: 0,  // {t, t, t}
      bigpungs: 0, // dragons, own wind, wotr
      tiles: 0,
      numerals: 0,
      terminals: 0,
      honours: 0,
      winds: 0,
      dragons: 0,
      suits: [0, 0, 0],
      // Separate container specific to locked sets:
      locked: { chows: 0, pungs: 0, bigpungs: 0, tiles: 0, numerals: 0, suits: [0, 0, 0] }
    };

    locked.forEach(set => {
      let tileNumber = set[0];
      if (tileNumber === set[1]) {
        stats.pungs++;
        stats.locked.pungs++;
        if (tileNumber < 27) { stats.locked.numerals += set.length; stats.locked.suits[this.suit(tileNumber)]++; }
        if (tileNumber + 27 === this.player.wind) { stats.bigpungs++; stats.locked.bigpungs++; }
        if (tileNumber + 27 === this.player.windOfTheRound) { stats.bigpungs++; stats.locked.bigpungs++; }
        if (tileNumber > 30) { stats.bigpungs++; stats.locked.bigpungs++; }
      } else {
        stats.chows++;
        stats.locked.chows++;
        stats.locked.suits[this.suit(tileNumber)]++;
      }
      stats.tiles += set.length;
      stats.locked.tiles += set.length;
    });

    tiles.forEach(tileNumber => {
      if (tileNumber <= 26) {
        stats.numerals++;
        let face = (tileNumber%9);
        if (face===0 || face===8) stats.terminals++;
        stats.suits[this.suit(tileNumber)]++;
      } else {
        stats.honours++;
        if (26 < tileNumber && tileNumber <= 30) stats.winds++;
        if (30 < tileNumber && tileNumber <= 33) stats.dragons++;
      }
      tileCount[tileNumber]++;
      stats.tiles++;
    });

    tileCount.forEach((count,tileNumber) => {
      // because we care about chow potential, we have
      // to basically run a three-tile sliding window.
      if (count && tileNumber <= 24) {
        let c2, c3;
        let tsuit = this.suit(tileNumber);
        let t2 = tileNumber + 1;
        if (this.suit(t2)===tsuit) {
          c2 = tileCount[t2];
          let t3 = tileNumber + 2;
          if (this.suit(t3)===tsuit) {
            c3 = tileCount[t3];
          }
        }
        if (c2 && c3) stats.chows++;
        else if (c2 || c3) stats.cpairs++;
      }
      if (count===2) stats.pairs++;
      if (count>=3) {
        stats.pungs++;
        if (tileNumber + 27 === this.player.wind) { stats.bigpungs++; }
        if (tileNumber + 27 === this.player.windOfTheRound) { stats.bigpungs++; }
        if (tileNumber > 30) { stats.bigpungs++; }
      }
    });

    return stats;
  }
}
