// =========================================
//        Let's define a Player class!
// =========================================

class Player {
  constructor(id) {
    this.el = document.createElement('div');
    this.el.setAttribute('class', 'player');
    this.el.id = id;
    this.id = id;
    this.tracker = new TileTracker(this.id);
    this.ui = new TileBank(this.id);
    this.wincount = 0;
    this._score = 0;
    this.reset();
  }

  reset() {
    this.locked = [];
    this.bonus = [];
    this.wind = false;
    this.windOfTheRound = false;
    this.has_won = false;
    this.selfdraw = false;
    this.tracker.reset();
    this.el.innerHTML = '';
    this.el.classList.remove('winner');
    this.ui.reset();
  }

  handWillStart() {
    this.ui.handWillStart();
  }

  getDisclosure() {
    let hand = this.getTileFaces();
    return {
      // tile information
      concealed: hand.filter(v => v < 34),
      locked: this.locked,
      bonus: this.bonus,
      // player information
      wind: this.wind,
      winner: this.has_won,
      wincount: this.getWinCount(),
      // If this player has won, did they self-draw their winning tile?
      selfdraw: this.has_won ? this.selfdraw : false,
      // If this player has won, the last-claimed tile can matter.
      final: this.has_won ? this.latest.dataset.tile : false
    };
  }

  endOfHand(disclosure) {
    this.ui.endOfHand(disclosure);
  }

  endOfGame(scores) {
    this.ui.endOfGame(scores);
  }

  recordScores(values) {
    this._score += values[this.id];
    this.ui.recordScores(values);
  }

  getScore() {
    return this._score;
  }

  markHand(hand) {
    this.wind = ((hand-1) + (this.id|0)) % 4;
    this.windOfTheRound = (hand/4)|0;
    this.ui.markHand(hand, this.wind);
  }

  activate(id) {
    this.ui.activate(id);
  }

  disable() {
    this.ui.disable();
  }

  markWaiting(val) {
    this.ui.markWaiting(val)
  }

  markWinner() {
    this.has_won = true;
    this.wincount++;
    this.ui.markWinner(this.wincount);
  }

  getWinCount() {
    return this.wincount;
  }

  winner() {
    this.ui.winner();
  }

  append(t, concealed) {
    let revealed;
    if (typeof t !== 'object') {
      if (t > 33) {
        revealed = t;
        this.bonus.push(t);
      }
      t = create(t, concealed);
    }
    this.latest = t;
    this.tracker.seen(t.dataset.tile);
    this.ui.append(t);
    return revealed;
  }

  remove(tile) {
    this.ui.remove(tile);
  }

  checkKong(tile) {
    let tiles = this.getTileFaces().filter(t => t===tile);
    if (tiles.length === 4) {
      tiles = tiles.map((t,pos) => {
        let tile = this.getSingleTileFromHand(t);
        this.remove(tile);
        tile.dataset.locked = 'locked';
        tile.dataset.hidden = 'hidden';
        this.ui.see(t, this, false, true, pos<3);
        return tile.cloneNode();
      });
      delete tiles[3].dataset.hidden;
      this.locked.push(tiles);
      return tiles;
    }
  }

  // FIXME: is this function still necessary?
  // Does it matter that it was a discard?
  removeDiscard(discard) {
    this.remove(discard);
  }

  see(tiles, player, discard, locked) {
    if (player === this) return;
    if (!tiles.map) tiles = [tiles];
    tiles.forEach((tile, pos) => {
      let ignore = false, concealed=false, from;
      if (typeof tile === 'object') {
        from = tile.dataset.from;
        if (from && from == this.id) ignore = true;
        concealed = !!tile.dataset.hidden;
        // revert tile to plain number
        tile = tile.dataset.tile;
      }
      if (!ignore) { this.tracker.seen(tile); }
      this.ui.see(tile, player, discard, locked, concealed);
    });
  }

  receivedTile(player) {
    this.ui.receivedTile(player);
  }

  seeClaim(tiles, player) {
    // Due to the fact that the ui version of see()
    // gets called on a tile-by-tile basis, we need
    // to make sure that the UI is ready for see()
    // calls following a claim separately.
    this.ui.prepareForClaim(player);

    // With that out of the way, process the tiles.
    this.see(tiles, player, false, true);
  }

  nextPlayer() {
    this.ui.nextPlayer();
  }

  getAvailableTiles() {
    return this.ui.getAvailableTiles();
  }

  getSingleTileFromHand(tile) {
    return this.ui.getSingleTileFromHand(tile);
  }

  getAllTilesInHand(tile) {
    return this.ui.getAllTilesInHand(tile);
  }

  getTiles(allTiles) {
    return this.ui.getTiles(allTiles);
  }

  getTileFaces(allTiles) {
    return this.ui.getTileFaces(allTiles);
  }

  getLockedTileFaces() {
    return this.locked.map(set => `[${set.map(v=>v.dataset.tile|0)}]${set.winning?'!':''}`);
  }

  getDuplicates(tile) {
    return this.ui.getDuplicates(tile);
  }

  reveal() {
    this.ui.reveal();
  }

  sortTiles() {
    this.ui.sortTiles();
  }

  tileValue(faceValue) {
    // This ranking is basically arbitrary, because
    // the real value comes from having an actual
    // strategy, which this simple implementation
    // obviously doesn't have. Well... yet!
    let i = parseInt(faceValue);
    if (i < 27) {
      return 1.0; // numerical tile
    }
    else if (i < 31) {
      return 1.0; // honour tile (wind)
    }
    else {
      return 1.0; // honour tile (dragon)
    }
  }

  async chowExists(pid, tile)  {
    // If this isn't a numerical tile, no chow can be formed.
    if (tile > 26)  return CLAIM.IGNORE;

    // nor if the discard did not come from the previous player.
    let next = (pid + 1) % 4;
    let valid = next == this.id;
    if (!valid) return CLAIM.IGNORE;

    // We're still here: can we form a chow with this discard?
    let tiles = this.getTileFaces();
    let face = tile % 9;
    let tm2 = (face > 1) ? tiles.indexOf(tile - 2) >= 0 : false;
    let tm1 = (face > 0) ? tiles.indexOf(tile - 1) >= 0 : false;
    let t1  = (face < 8) ? tiles.indexOf(tile + 1) >= 0 : false;
    let t2  = (face < 7) ? tiles.indexOf(tile + 2) >= 0 : false;
    let c1 = t1 && t2;
    let c2 = tm1 && t1;
    let c3 = tm2 && tm1;

    if (c1) return CLAIM.CHOW1;
    if (c3) return CLAIM.CHOW3;
    if (c2) return CLAIM.CHOW2;
    return CLAIM.IGNORE;
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
    let tile = discard.dataset.tile;
    this.ui.see(tile, {id: pid}, true);

    // in terms of universal behaviour, we want
    // to make sure that we exit early if this is
    // "our own" discard. No bidding on that please.
    if (pid == this.id) {
      return resolve({ claimtype: CLAIM.IGNORE });
    }

    // Then, set up a timeout that ensures we
    // send "IGNORE!" if we take too long to
    // decide on whether we want this discard.
    let overrideKickedIn = false;

    let overrideTrigger = setTimeout(() => {
      overrideKickedIn = true;
      resolve({ claimtype: CLAIM.IGNORE })
    }, config.CLAIM_INTERVAL);

    // And similarly, make sure to cancel the
    // timeout check if we do have a claim
    // determined within the allotted time.
    let interrupt = () => {
      if (!overrideKickedIn) {
        clearTimeout(overrideTrigger);
      }
    };

    let claim = this.determineClaim(pid, discard, claim => {
      if (!overrideKickedIn) {
        clearTimeout(overrideTrigger);
        resolve(claim);
      }
    }, interrupt);
  }

  determineClaim(pid, discard, resolve, interrupt) {
    // Just like determineDiscard, players have a way
    // to determine whether they want a discard, and
    // for what, but we're not going to say how to
    // determine that in this class.
    resolve({ claimtype: CLAIM.IGNORE });
  }

  awardClaim(p, claim, discard) {
    let tile = discard.getTileFace();
    let claimtype = claim.claimtype;

    let set = [];
    set.push(discard);
    set.locked = true;

    if (claimtype === CLAIM.WIN) {
      this.markWinner();
      set.winning = true;
      claimtype = claim.wintype;
      if (claimtype === CLAIM.CHOW) {
        claimtype = convertSubtypeToClaim(claimtype);
      }
    }

    // being awared a discard based on a claims, however,
    // is universal: the tiles get locked.
    this.append(discard);

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

      this.locked.push(set);
      this.ui.lock(set);

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

    this.locked.push(set);
    this.ui.lock(set);

    return set;
  }
}
