// =========================================
//        Let's define a Player class!
// =========================================

class Player {
  constructor(id, proxyWall) {
    this.el = document.createElement('div');
    this.el.setAttribute('class', 'player');
    this.el.id = id;
    this.id = id;
    this.wall = proxyWall;
    this.tracker = new TileTracker();
    this.reset();
  }

  reset() {
    this.locked = [];
    this.wind = false;
    this.windOfTheRound = false;
    this.has_won = false;
    this.tracker.reset();
    this.el.innerHTML = '';
    this.el.classList.remove('winner');
    if (this.ui) this.ui.reset();
  }

  gameWillStart() {
    // console.log(`${this.id} has ui:`, this.ui);
  }

  markTurn(turn) {
    this.wind = (turn + (this.id|0)) % 4;
    this.windOfTheRound = (turn/4)|0;

    if (this.ui) this.ui.markTurn(turn, this.wind);
    else this.el.dataset.wind = ['東','南','西','北'][this.wind];
  }

  activate() {
    if (this.ui) this.ui.activate();
    else this.el.classList.add('active');
  }

  disable() {
    if (this.ui) this.ui.disable();
    else this.el.classList.remove('active');
  }

  markWaiting(val) {
    if (this.ui) this.ui.markWaiting(val)
    else {
      if (val) this.el.classList.add('waiting');
      else this.el.classList.remove('waiting');
    }
  }

  markWinner() {
    this.has_won = true;
    if (this.ui) this.ui.markWinner();
    else this.el.dataset.wincount = parseInt( this.el.dataset.wincount || 0 ) + 1;
  }

  getWinCount() {
    if (this.ui) return this.ui.getWinCount();
    return this.el.dataset.wincount;
  }

  winner() {
    if (this.ui) this.ui.winner();
    else {
      this.el.classList.add('winner');
      this.el.classList.remove('active');
    }
    this.reveal();
  }

  append(t, concealed) {
    let revealed;
    if (typeof t !== 'object') {
      if (t > 33) revealed = t;
      t = create(t, concealed);
    }
    this.tracker.seen(t.dataset.tile);
    if (this.ui) this.ui.append(t);
    else this.el.appendChild(t);
    return revealed;
  }

  see(tiles, player) {
    if (player === this) return;
    if (!tiles.map) tiles = [tiles];
    tiles.forEach(tile => {
      let ignore = false;
      if (typeof tile === 'object') {
        let from = tile.dataset.from;
        if (from && from == this.id) ignore = true;
        tile = tile.dataset.tile;
      }
      if (!ignore) this.tracker.seen(tile);
    });
  }

  getAvailableTiles() {
    if (this.ui) return this.ui.getAvailableTiles();
    return this.el.querySelectorAll('.tile:not([data-bonus]):not([data-locked]');
  }

  getSingleTileFromHand(tile) {
    if (this.ui) return this.ui.getSingleTileFromHand(tile);
    return this.el.querySelector(`.tile[data-tile='${tile}']:not([data-locked]`);
  }

  getAllTilesInHand(tile) {
    if (this.ui) return this.ui.getAllTilesInHand(tile);
    return this.el.querySelectorAll(`.tile[data-tile='${tile}']:not([data-locked]`);
  }

  getTiles(allTiles) {
    if (this.ui) return this.ui.getTiles(allTiles);
    return this.el.querySelectorAll(`.tile${allTiles ? ``: `:not([data-locked]`}`);
  }

  getTileFaces(allTiles) {
    if (this.ui) return this.ui.getTileFaces(allTiles);
    return Array.from(this.getTiles(allTiles)).map(t => t.getTileFace());
  }

  getLockedTileFaces() {
    return this.locked.map(set => `[${set.map(v=>v.dataset.tile|0)}]${set[0].dataset.winning?'!':''}`);
  }

  getDuplicates(tile) {
    if (this.ui) return this.ui.getDuplicates(tile);
    return this.el.querySelectorAll(".tile[data-tile='"+tile+"']:not([data-locked])");
  }

  reveal() {
    if (this.ui) this.ui.reveal();
    Array.from(this.el.querySelectorAll(".tile")).forEach(t => {delete t.dataset.hidden;});
  }

  sortTiles() {
    if (this.ui) this.ui.sortTiles();
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
    }, CLAIM_INTERVAL);

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

    if (claimtype === CLAIM.WIN) {
      this.markWinner();
      claimtype = claim.wintype;
      if (claimtype === CLAIM.CHOW) {
        claimtype = convertSubtypeToClaim(claimtype);
      }
    }

    // being awared a discard based on a claims, however,
    // is universal: the tiles get locked.
    this.append(discard);

    let locked = 1;
    discard.dataset.locked = 'locked';
    if(this.has_won) discard.dataset.winning='winning';

    let set = [];
    set.push(discard);

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

      // if the player locks away a total of 4 tiles, they need a tile from the wall
      // to compensate for the loss of a tile.
      locked += count;
      if (locked === 4 && !this.wall.dead()) {
        this.getSupplementTile(p);
      }
      this.locked.push(set);
      return set;
    }

    // No pair, pung, or kong: must be a chow... but which type of chow?
    let t1, t2;
    if (claimtype === CLAIM.CHOW1) {
      t1 = this.getSingleTileFromHand(tile - 2); // this.el.querySelector(`.tile[data-tile='${tile - 2}']:not([data-locked]`);
      t2 = this.getSingleTileFromHand(tile - 1); // this.el.querySelector(`.tile[data-tile='${tile - 1}']:not([data-locked]`);
    }
    else if (claimtype === CLAIM.CHOW2) {
      t1 = this.getSingleTileFromHand(tile - 1); // this.el.querySelector(`.tile[data-tile='${tile - 1}']:not([data-locked]`);
      t2 = this.getSingleTileFromHand(tile + 1); // this.el.querySelector(`.tile[data-tile='${tile + 1}']:not([data-locked]`);
    }
    else if (claimtype === CLAIM.CHOW3) {
      t1 = this.getSingleTileFromHand(tile + 1); // this.el.querySelector(`.tile[data-tile='${tile + 1}']:not([data-locked]`);
      t2 = this.getSingleTileFromHand(tile + 2); // this.el.querySelector(`.tile[data-tile='${tile + 2}']:not([data-locked]`);
    }

    [t1, t2].forEach(t => {
      delete t.dataset.hidden;
      t.dataset.locked = 'locked';
      if(this.has_won) t.dataset.winning='winning';
      set.push(t);
    });

    this.locked.push(set);
    return set;
  }

  getSupplementTile() {
    let tile;
    do {
      tile = this.wall.get();
      this.append(tile)
    } while (tile>33 && !this.wall.dead());
  }
}
