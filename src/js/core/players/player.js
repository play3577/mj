// =========================================
//        Let's define a Player class!
// =========================================

class Player extends PlayerMeta {
  constructor(id) {
    super(id);
  }

  setActiveGame(game) {
    this.game = game;
  }

  async getDiscard(resolve) {
    return this.determineDiscard(resolve);
  }

  determineDiscard(resolve) {
    // players have a way to determine what the discard,
    // but we're not going to specify _how_ to determine
    // that here. We'll leave that up to the specific
    // player types instead.
    resolve(undefined);
  }

  async getClaim(pid, discard, resolve) {
    // in terms of universal behaviour, we want
    // to make sure that we exit early if this is
    // "our own" discard. No bidding on that please.
    if (pid == this.id) {
      return resolve({ claimtype: CLAIM.IGNORE });
    }

    new TaskTimer(
      timer => {
        this.determineClaim(pid, discard, claim => {
          if (!timer.hasTimedOut()) {
            resolve(claim);
          }
        }, () => timer.cancel());
      },
      () => resolve({ claimtype: CLAIM.IGNORE }),
      config.CLAIM_INTERVAL
    );
  }

  determineClaim(pid, discard, resolve, interrupt) {
    // Just like determineDiscard, players have a way
    // to determine whether they want a discard, and
    // for what, but we're not going to say how to
    // determine that in this class.
    resolve({ claimtype: CLAIM.IGNORE });
  }

  receiveDiscardForClaim(claim, discard) {
    this.lastClaim = claim;
    let tile = discard.getTileFace();
    let claimtype = claim.claimtype;

    let set = [];
    set.push(discard);
    set.locked = true;

    if (claimtype === CLAIM.WIN) {
      this.markWinner();
      if (!set.winning) claimtype = claim.wintype; // prevent double counting!
      set.winning = true;
      if (claimtype === CLAIM.CHOW) {
        claimtype = convertSubtypeToClaim(claimtype);
      }
    }

    this.append(discard, true);

    discard.dataset.locked = 'locked';
    if(this.has_won) discard.dataset.winning='winning';

    // lock related tiles if this was a pung/kong
    if (claimtype === CLAIM.PAIR || claimtype === CLAIM.PUNG || claimtype === CLAIM.KONG) {
      let count = 0;
      if (claimtype === CLAIM.PAIR) count = 1;
      if (claimtype === CLAIM.PUNG) count = 2;
      if (claimtype === CLAIM.KONG) count = 3;

      let tiles = this.getAllTilesInHand(tile);
      tiles = Array.from(tiles).slice(0,count);

      Array.from(tiles).forEach(t => {
        if (t.getTileFace() == tile) {
          delete t.dataset.hidden;
          t.dataset.locked = 'locked';
          if(this.has_won) t.dataset.winning='winning';
          set.push(t);
        }
      });

      this.lockClaim(set);
      return set;
    }

    // No pair, pung, or kong: must be a chow... but which type of chow?
    let t1, t2;
    if (claimtype === CLAIM.CHOW1) {
      t1 = this.getSingleTileFromHand(tile + 2);
      t2 = this.getSingleTileFromHand(tile + 1);
    }
    else if (claimtype === CLAIM.CHOW2) {
      t1 = this.getSingleTileFromHand(tile + 1);
      t2 = this.getSingleTileFromHand(tile - 1);
    }
    else if (claimtype === CLAIM.CHOW3) {
      t1 = this.getSingleTileFromHand(tile - 1);
      t2 = this.getSingleTileFromHand(tile - 2);
    }

    [t1, t2].forEach(t => {
      delete t.dataset.hidden;
      t.dataset.locked = 'locked';
      if(this.has_won) t.dataset.winning='winning';
      set.push(t);
    });

    this.lockClaim(set);
    return set;
  }

  lockClaim(tiles, concealed=false) {
    let kong = (tiles.length === 4);

    tiles.forEach(tile => {
      this.remove(tile);
      tile.dataset.locked = 'locked';
      if(kong) tile.dataset.concealed = 'concealed';
    });

    // claimed kong = concealed pung
    if (kong && !concealed) {
      delete tiles[0].dataset.concealed;
    }

    this.locked.push(tiles);
    if (this.ui) this.ui.lockClaim(tiles);
  }
}
