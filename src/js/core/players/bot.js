/**
 * This guy should be obvious: bots are simply
 * automated processes that follow play rules
 * and simply do what the code says to do.
 */
class BotPlayer extends Player {
  constructor(id) {
    super(id);
    this.personality = new Personality(this);

    // Don't bind this function unless the config says we should.
    if (config.FORCE_OPEN_BOT_PLAY) this.enableShowTilesAnyway();
  }

  /**
   * Inform the personality object how many draws
   * we've seen for the hand we're about to play,
   * because that will change how much we'll be
   * willing to go harder-to-achieve hands.
   */
  reset(hand, wind, windOfTheRound, draws) {
    super.reset(hand, wind, windOfTheRound, draws);
    if (this.personality) this.personality.setDraws(this.draws);
  }

  // We only assign this a function body in the constructor,
  // and use an empty function so that calls don't error out.
  showTilesAnyway() {}

  // And this is where we do that assigning.
  enableShowTilesAnyway() {
    this.showTilesAnyway = () => {
      if (!config.FORCE_OPEN_BOT_PLAY) return;
      if (window.PLAYER_BANKS && this.id !== 0) {
        let bank = window.PLAYER_BANKS[this.id];
        bank.innerHTML = '';
        this.getTileFaces().forEach(t => { t = create(t); bank.appendChild(t); });
        this.locked.forEach((s,sid) => {
          s.forEach(t => {
            t = t.cloneNode();
            t.dataset.locked = 'locked';
            t.dataset.locknum = 1 + sid;
            bank.appendChild(t);
          });
        })
        this.bonus.forEach(t => { t = create(t); t.dataset.locked = 'locked'; bank.appendChild(t); });
        if (this.waiting) bank.classList.add('waiting'); else bank.classList.remove('waiting');
        window.PLAYER_BANKS.sortTiles(bank);
      }
    }
  }

  // pass-through for "show tiles anyway" functionality
  append(tile, claimed, supplement) {
    let _ = super.append(tile, claimed, supplement);
    this.showTilesAnyway();
    return _;
  }

  // pass-through for "show tiles anyway" functionality
  remove(tile) {
    super.remove(tile);
    this.showTilesAnyway();
  }

  /**
   * When real play is about to start, examine our start
   * tiles to determine the kind of plays we'll make.
   */
  playWillStart() {
    super.playWillStart();
    this.personality.determinePersonality();
  }

  /**
   * This is the override for the function that Player calls in order
   * to determine which tile to remove from the hand. The `resolve` function
   * is a promise callback that will allow the game to "unpause" itself.
   *
   * Bot discards are based on what can be meaningfully formed with the
   * tiles currently in hand, and throwing out the tile that contributes
   * the least. Tile availability based on the bot's local knowledge of
   * which tiles might still be available in the game is used to determine
   * whether things like pairs or chows can still be formed.
   *
   * Additionally, the tile value is balanced against its score potential.
   * For example, in a one-suit hand that also has a set of a second suit,
   * the potential payoff for getting rid of that already formed set may
   * outweigh the fact that the tiles involved are already contributing
   * to winning the hand.
   *
   * Note: returning an falsey value leads to the game understanding that
   * as meaning this play has won.
   */
  determineDiscard(tilesRemaining, resolve) {
    // If we were awarded a winning claim, then by the
    // time we are asked to discard, we will already be
    // marked as having won:
    if (this.has_won) return resolve(undefined);

    // we only consider tiles that we can legally play with, meaning
    // (obvious) not bonus tiles, and not any tile already involved
    // in a play-claim earlier.
    let tiles = this.getAvailableTiles();

    // if we have no concealed tiles, that means it became our turn by
    // declaring a win off of a discard. So... don't discard!
    if (!tiles.length) return resolve(undefined);

    // If we have concealed tiles still, did the tile we just received
    // actually make us win?
    let { winpaths } = tilesNeeded(this.getTileFaces(), this.locked);

    if(winpaths.length > 0) {
      // We may very well have won! ...except not if our play policy
      // has requirements that this win is not allowed under.
      if (this.personality.isValidWin(tilesRemaining)) {
        // We have indeed won! Mark this as a self-drawn win, because
        // if it was a claimed win we would have exited this function
        // already (due to `this.has_won`), and then let the game.js
        // game loop discover we've won by not discarding anything.
        this.selfdraw = true;
        console.debug(`Self-drawn win for player ${this.id} on ${this.latest.dataset.tile}`);
        return resolve(undefined);
      }
      // If we get here, we have not won.
      this.waiting = false;
    }

    // If we're waiting to win, then this was not (one of)
    // our winning tile(s), so in the absence of determining
    // whether something would be more points, we immediately
    // get rid of this tile again.
    if (this.waiting) return resolve(this.determineWhatToWaitFor());

    // Did we self-draw a limit hand?
    let allTiles = this.getTileFaces(true).filter(t => t<34);
    let limithand = this.rules.checkForLimit(allTiles);
    if (limithand) return resolve(undefined);

    // Now then. We haven't won, let's figure out which tiles are worth keeping,
    // and which tiles are worth throwing away.
    this.determineDiscardCarefully(tilesRemaining, resolve);
  }

  /**
   * If we're waiting on a pair, then we can throw out either the
   * tile we already had, or the tile we just got. So, decide on
   * which to throw based on how nice the tile is for the hand.
   *
   * If we're _not_ waiting on a pair, but we reached this
   * function, then we're simply not interested in the tile we
   * just picked up: get rid of it.
   */
  determineWhatToWaitFor() {
    console.debug(this.id,"waiting to win but",this.latest,"is not in our wait list",this.waiting);

    let winTiles = Object.keys(this.waiting);
    if (winTiles.length === 1) {
      let tileNumber = (winTiles[0]|0); // remember: object keys are strings, but we need a number!
      let ways = this.waiting[tileNumber];

      if (ways.length === 1 && ways[0] === "32s1") {
        // Waiting on a pair: do some checking
        let had = this.getSingleTileFromHand(tileNumber);
        let received = this.latest;
        console.debug(`${this.id} has two singles in hand:`, had, received);
        let tile = this.determineWhichPairTileToThrow(had, received);
        console.debug(`${this.id} wants to throw out:`, tile);

        // If we throw out the tile we already had, then we'll have to update
        // our "waiting" object so it's set to wait for the right tile.
        if (tile === had) {
          let nid = received.getTileFace();
          let oid = had.getTileFace();
          console.debug(`${this.id} swapping win information from ${oid} to ${nid}`);
          this.waiting[nid] = this.waiting[oid];
          delete this.waiting[oid];
          console.debug(`${this.id} post-swap:`, this.waiting);
        }
        return tile;
      }
    }

    // Not waiting on a pair: get rid of this tile.
    return this.latest;
  }

  /**
   * Determine what the inate value of a tile is in terms
   * of using it to win on a pair, given the rest of our hand.
   */
  determineWhichPairTileToThrow(had, received) {
    // absolute base step 1: can we even GET another copy of this tile?
    if (this.tracker.get(had.getTileFace()) === 0) return had;
    if (this.tracker.get(received.getTileFace()) === 0) return received;

    // If both tiles are viable pair tiles, we check some more things.
    let tiles = this.getAvailableTiles(true).slice();
    let pos = tiles.indexOf(had);
    tiles.splice(pos,1);

    // For instance: is one of these tiles nicer for our suit composition?
    let suits = [0, 0, 0, 0, 0];
    tiles.forEach(tile => {
      suits[tile.getTileSuit()]++;
    });
    let hsuit = had.getTileSuit();
    let rsuit = received.getTileSuit();
    // If either tile "introduces a new suit", get rid of it.
    if (hsuit < 3 && suits[hsuit] === 0) return had;
    if (rsuit < 3 && suits[rsuit] === 0) return received;

    // if not, going out on a major pair is always nicer
    let hnum = had.getTileFace();
    let rnum = received.getTileFace();
    if (hnum > 26) {
      if (rnum > 26) {
        // keep any dragon, player wind, or wind of the round.
        if (hnum > 30) return received;
        if (hnum === 27 + this.wind) return received;
        if (hnum === 27 + this.windOfTheRound) return received;
        // if the tile was had was none of those, is the received tile?
        if (rnum > 30) return had;
        if (rnum === 27 + this.wind) return had;
        if (rnum === 27 + this.windOfTheRound) return had;
        // okay, so at this point it doesn't matter: just stick with what we had.
        return received;
      }
      return received;
    }

    if (rnum > 26) return had;

    // If we get here, it also doesn't matter: stick with what we had.
    return received;
  }

  /**
   * This is the second part of determineDiscard, which handles all
   * the "we didn't just win" cases.
   */
  determineDiscardCarefully(tilesRemaining, resolve) {
    let tiles = this.getAvailableTiles();
    let tileCount = [];
    let immediateValue = [];

    // First, let's see how many of each tile we have.
    let faces = Array.from(tiles).map(tile => {
      let id = tile.getTileFace();
      if (!tileCount[id]) { tileCount[id] = 0; }
      tileCount[id]++;
      return id;
    });

    // Cool. With that sorted out, let's start ranking
    // tiles in terms of how valuable they are to us.
    faces.forEach(tile => {
      let value = 0;
      let availability = this.tracker.get(tile);

      // Step 1: are there any tiles that our play policy
      // says need to go? If so, discard any of those.
      if (this.personality.deadTile(tile, tilesRemaining)) {
        return (immediateValue[tile] = 0);
      }

      // Step 2: our play policy has nothing to say here,
      // so values are based on "can we get more". If not,
      // then however many tile we have is all we'll get.

      if (tileCount[tile] >= 3) value = max(value, availability>0 ? 100 : 90);
      else if (tileCount[tile] === 2) value = max(value, availability>0 ? 90 : 50);
      else if (tileCount[tile] === 1) {
        if (tile < 27) value = max(value, this.determineDiscardValueForChow(value, tile, tileCount));
        value = max(value, availability ? 40 : 0);
      }

      // Record the (by definition) highest value for this tile.
      immediateValue[tile] = value;
    });

    // We will find the lowest scoring tile, and discard that one
    let sorted = immediateValue.map((score, tile) => ({ tile, score })).sort((a,b) => (a.score - b.score));

    // "randomly" pick one of the lowest scoring tiles to discard
    let lowest = sorted[0];
    let candidates = sorted.filter(v => v.score===lowest.score);
    let idx = (config.PRNG.nextFloat() * candidates.length)|0;
    let candidate = candidates[idx].tile;

    resolve(this.getSingleTileFromHand(candidate));
  }

  /**
   * determineDiscard helper function dedicated to determining
   * whether chows are an option or not.
   */
  determineDiscardValueForChow(value, tile, tileCount) {
    let face = tile % 9;
    let m2 = tileCount[tile - 2] > 0;
    let m1 = tileCount[tile - 1] > 0;
    let p1 = tileCount[tile + 1] > 0;
    let p2 = tileCount[tile + 2] > 0;
    let m2a = this.tracker.get(tile - 2) > 0;
    let m1a = this.tracker.get(tile - 1) > 0;
    let p1a = this.tracker.get(tile + 1) > 0;
    let p2a = this.tracker.get(tile + 2) > 0;

    // X?? chow check
    if (face<7) {
      if (p1 && p2) value = max(value, 90) // already in hand
      else if (p1 && p2a) value = max(value, 80) // possible
      else if (p1a && p2) value = max(value, 70) // possible (gap)
    }

    // ?X? chow check
    if (face>0 && face<8) {
      if (m1 && p1) value = max(value, 90) // already in hand
      else if (m1 && p1a) value = max(value, 80) // possible
      else if (m1a && p1) value = max(value, 80) // possible
    }

    // ??X chow check
    if (face>1) {
      if (m2 && m1) value = max(value, 90) // already in hand
      else if (m2 && m1a) value = max(value, 70) // possible (gap)
      else if (m2a && m1) value = max(value, 80) // possible
    }

    return value;
  }

  /**
   * Automated claim policy, see `tilesNeeded` in `./mgen.js`
   */
  async determineClaim(pid, discard, tilesRemaining, resolve, interrupt, claimTimer) {
    let claim = CLAIM.IGNORE, wintype;
    let tile = discard.getTileFace();
    let canChow = ((pid+1)%4 == this.id);
    let tiles = this.getTileFaces();
    tiles.sort();

    let {lookout, waiting, composed} = tilesNeeded(tiles, this.locked, canChow);

    // Are we waiting to win?
    if (waiting) {
      console.debug(this.id, "we're waiting to win!", lookout);

      let winTiles = {};
      lookout.forEach((list,tileNumber) => {
        if (list) {
          list = list.filter(v => v.indexOf('32') === 0);
          if (list.length) winTiles[tileNumber] = list;
        }
      });
      this.markWaiting(winTiles);

      // If this is not (one of) the tile(s) we need, ignore it, unless we can form a kong.
      let ways = winTiles[tile];
      if (!ways || !ways.length) {
        if (lookout[tile] && lookout[tile].indexOf('16') !== -1) return resolve({claimtype: CLAIM.KONG });
        return resolve({claimtype: CLAIM.IGNORE});
      }

      // (one of) the tile(s) we need: claim a win, if we can.
      let wintype = ways.map(v => parseInt(v.substring(3))).sort((a,b)=>(b-a))[0];

      let allowed = this.personality.determineWhetherToWin(tile, wintype, tilesRemaining);
      if (allowed === false) return resolve({claimtype: CLAIM.IGNORE});
      if (allowed === wintype) {
        // When the result of determineWhetherToWin is a claim constant,
        // then while we can't win on this tile due to policy violations
        // (e.g trying win on pung of winds while we're not clean yet)
        // this IS a valid regular claim as far as our play policy is
        // concerned, so resolve it as such.
        if (CLAIM.CHOW <= allowed && allowed < CLAIM.PUNG && !canChow) {
          // just remember that if the claim was a chow, that might not
          // actually be legal if we're not winning on this tile so make
          // sure to check for that.
          return resolve({ claimtype: CLAIM.IGNORE });
        }
        return resolve({claimtype: allowed });
      }
      return resolve({claimtype: CLAIM.WIN, wintype });
    }


    // If we get here, we're NOT waiting to win: perform normal claim check.
    if (lookout[tile]) {
      lookout[tile].map(print => unhash(print,tile)).forEach(set => {
        let type = set.type;
        console.debug(`lookout for ${tile} = type: ${type}, canChow: ${canChow}`);
        if (type === Constants.CHOW1 || type === Constants.CHOW2 || type === Constants.CHOW3) {
          if (!canChow) return;
        }
        if(!this.personality.want(tile, type, tilesRemaining)) return;
        if (type === CLAIM.WIN) wintype = set.subtype ? set.subtype : 'normal';
        if (type > claim) claim = type;
      });

      return resolve({claimtype: claim, wintype});
    }

    return resolve({claimtype: CLAIM.IGNORE});
  }
}
