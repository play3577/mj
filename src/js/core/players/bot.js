/**
 * This guy should be obvious: bots are simply
 * automated processes that follow play rules
 * and simply do what the code says to do.
 */
class BotPlayer extends Player {
  constructor(id) {
    super(id);
  }

  showTilesAnyway() {
    if (!config.FORCE_OPEN_BOT_PLAY) return;

    // HACK: this function only exists to allow bot play debugging.
    if (PLAYER_BANKS.banks && this.id !== 2) {
      let bank = PLAYER_BANKS.banks[this.id];
      bank.innerHTML = '';

      this.getTileFaces().forEach(t => {
        t = create(t);
        bank.appendChild(t);
      })

      this.locked.forEach(s => {
        s.forEach(t => {
          t = create(t.dataset.tile);
          t.dataset.locked = 'locked';
          bank.appendChild(t);
        });
      })

      this.bonus.forEach(t => {
        t = create(t);
        t.dataset.locked = 'locked';
        t.dataset.bonus = 'bonus';
        bank.appendChild(t);
      });
    }
  }

  append(tile, claimed) {
    let _ = super.append(tile, claimed);
    this.showTilesAnyway();
    return _;
  }

  remove(tile) {
    super.remove(tile);
    this.showTilesAnyway();
  }


  determineDiscard(resolve) {
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
    let {lookout, waiting, composed, winpaths} = tilesNeeded(this.getTileFaces(), this.locked);

    if(winpaths > 0) {

      // We have indeed won! Mark this as a self-drawn win, because
      // if it was a claimed win we would have exited this function
      // already, and then let the play.js game loop discover we've
      // won by not discarding anything.
      if (!this.latest.dataset.from) {
        this.selfdraw = true;
        console.log(`Self-drawn win for player ${this.id} on ${this.latest.dataset.tile}`);
      } else {
        // FIXME: the fact that we can get here means that we performed
        //        a claim that we didn't think was a win, but it _was_
        //        so that's a bug in determineClaim and the following
        //        code should not be necessary when that's fixed:
        this.locked.slice(-1)[0].winning = true;
      }
      return resolve(undefined);
    }

    // Now then. We haven't won, let's figure out which tiles are worth keeping,
    // and which tiles are worth throwing away.

      // TODO: can we use the lookout/composed information computed above?

    // First, let's see how many of each tile we have.
    let tileCount = [];
    let ids = Array.from(tiles).map(tile => {
      let id = tile.getTileFace();
      if (!tileCount[id]) { tileCount[id] = 0; }
      tileCount[id]++;
      return id;
    });

    // Cool. With that sorted out, let's start ranking
    // tiles in terms of what they will let us form.
    let tileValues = [];
    ids.forEach( id => {
      let value = 0;
      if (tileCount[id] >= 3) {
        value = CLAIM.KONG;
      } else

      if (tileCount[id] === 2) {
        value = CLAIM.PUNG;
      } else

      if (tileCount[id] === 1) {
        if (id < 27) {
          let face = id % 9;
          if (face > 0 && tileCount[id-1] > 0) {
            // note: this works because undefined <=> 0 are all false,
            // whereas if tileCount[id-1] is an actual number, it's
            // going to be at least 1.
            value = CLAIM.CHOW;
          }
          else if (face < 8 && tileCount[id+1] > 0) {
            value = CLAIM.CHOW;
          }
        }
      }
      else {
        value = this.tileValue(id);
      }

      tileValues[id] = value;
    });

    // so, which tile scores the lowest?
    let tile = 0;
    let l = Number.MAX_VALUE;
    tileValues.forEach((value,pos) => { if (value < l) { l = value; tile = pos; }});

    let discard = this.getSingleTileFromHand(tile);
    resolve(discard);
  }

  /**
   * Automated claim policy, see `tilesNeeded` in `./mgen.js`
   */
  async determineClaim(pid, discard, resolve, interrupt) {
    // which tile is this?
    let tile = discard.getTileFace();

    // build a quick list of what we might actually be interested in
    let canChow = ((pid+1)%4 == this.id);
    let {lookout, waiting, composed} = tilesNeeded(this.getTileFaces(), this.locked, canChow);
    this.markWaiting(waiting);

    // is the current discard in the list of tiles we want?
    let claim = CLAIM.IGNORE, wintype;
    if (lookout[tile]) {
      lookout[tile].map(print => unhash(print,tile)).forEach(set => {
        let type = set.type;
        if (type === Constants.PAIR) return;
        if (type === Constants.CHOW) {
          if ((pid+1)%4 != this.id) return;
          type = convertSubtypeToClaim(set.subtype);
        }
        if (type === CLAIM.WIN) {
          wintype = set.subtype ? set.subtype : 'normal';
        }
        if (type > claim) {
          claim = type;
        }
      });
      return resolve({claimtype: claim, wintype});
    }

    return resolve({claimtype: CLAIM.IGNORE});
  }
}
