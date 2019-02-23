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
    this.ui = false;
    this.wincount = 0;
    this.reset();
  }

  reset(hand, wind, windOfTheRound) {
    this.wind = wind;
    this.windOfTheRound = windOfTheRound;
    this.tiles = [];
    this.locked = [];
    this.bonus = [];
    this.has_won = false;
    this.selfdraw = false;
    this.tracker.reset();
    this.el.innerHTML = '';
    this.el.classList.remove('winner');
    if (this.ui) this.ui.reset(hand, wind, windOfTheRound);
  }

  setRules(rules) {
    this.rules = rules;
    this._score = this.rules.player_start_score;
  }

  handWillStart(resolve) {
    if (this.ui) this.ui.handWillStart(resolve);
    else resolve();
  }

  markTilesLeft(left, dead) {
    this.tilesLeft = left;
    this.tilesDead = dead;
    if (this.ui) this.ui.markTilesLeft(left, dead);
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
      selftile: (this.has_won && this.selfdraw) ? this.getLatestTile() : false,
      // If this player has won, the last-claimed tile can matter.
      final: this.has_won ? this.latest.dataset.tile : false
    };
  }

  endOfHand(disclosure) {
    if (this.ui) this.ui.endOfHand(disclosure);
  }

  endOfGame(scores) {
    if (this.ui) this.ui.endOfGame(scores);
  }

  recordScores(adjustments) {
    this._score += adjustments[this.id];
    if (this.ui) this.ui.recordScores(adjustments);
  }

  getScore() {
    return this._score;
  }

  activate(id) {
    if (this.ui) this.ui.activate(id);
  }

  disable() {
    if (this.ui) this.ui.disable();
  }

  markWaiting(val) {
    if (this.ui) this.ui.markWaiting(val)
  }

  markWinner() {
    if (!this.has_won) {
      this.has_won = true;
      this.wincount++;
      if (this.ui) this.ui.markWinner(this.wincount);
    }
  }

  getWinCount() {
    return this.wincount;
  }

  append(t, claimed) {
    let revealed = false;
    if (typeof t !== 'object') {
      if (t > 33) {
        revealed = t;
        this.bonus.push(t);
      }
      t = create(t);
    }
    this.latest = t;
    if (!t.dataset.bonus) {
      this.tiles.push(t);
    }
    if (!claimed) {
      this.tracker.seen(t.dataset.tile);
      this.lastClaim = false;
    }
    if (this.ui) this.ui.append(t);
    return revealed;
  }

  remove(tile) {
    let pos = this.tiles.indexOf(tile);
    this.tiles.splice(pos, 1);
    if (this.ui) this.ui.remove(tile);
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

  meldKong(tile) {
    this.remove(tile);
    let set = this.locked.find(set => (set[0].dataset.tile === tile.dataset.tile));
    let meld = set[0].cloneNode();
    meld.dataset.melded = 'melded';
    set.push(meld);
    if (this.ui) this.ui.meldKong(tile);
  }

  async checkKong() {
    // players with a UI get to decide what to do on their own turn.
    if (this.ui) return false;

    // does this player have a kong in hand that needs to be declared?
    let tiles = this.getTileFaces();
    let counts = new Array(34).fill(0);
    tiles.forEach(t => counts[t]++);
    for (let tile=0, e=34, count; tile<e; tile++) {
      count = counts[tile];
      if (count===4) {
        let tiles = this.tiles.filter(t => t.dataset.tile==tile);
        this.lockClaim(tiles);
        return tiles;
      }
    }
    return false;
  }

  removeDiscard(discard) {
    // FIXME: is this function still necessary? Does it matter that it was a discard?
    this.remove(discard);
  }

  see(tiles, player, melded) {
    if (player === this) return;
    if (!tiles.map) tiles = [tiles];
    tiles.forEach(tile => this.tracker.seen(tile));
    if (this.ui) this.ui.see(tiles, player, melded);
  }

  receivedTile(player) {
    if (this.ui) this.ui.receivedTile(player);
  }

  playerDiscarded(player, discard) {
    let tile = discard.dataset.tile;
    if (this.id != player.id) this.tracker.seen(tile);
    if (this.ui) this.ui.playerDiscarded(player, tile);
  }

  seeKong(tiles, player, melded) {
    this.see(tiles.map(t => t.dataset.tile), player, false, true);
  }

  seeClaim(tiles, player, claimedTile, claim) {
    if (player === this) return;
    if (!tiles.map) tiles = [tiles];

    tiles.forEach((tile, pos) => {
      // We've already see the discard that got claimed
      if (tile === claimedTile) return;
      // But we haven't seen the other tiles yet.
      this.tracker.seen(tile.dataset.tile);
    });
    if (this.ui) this.ui.seeClaim(tiles, player, claim);
  }

  nextPlayer() {
    if (this.ui) this.ui.nextPlayer();
  }


  getAvailableTiles() {
    return this.tiles;
  }

  getSingleTileFromHand(tile) {
    return this.tiles.find(t => (t.dataset.tile == tile));
  }

  getAllTilesInHand(tile) {
    return this.tiles.filter(t => (t.dataset.tile == tile));
  }

  getTiles(allTiles) {
    return allTiles ? [...this.tiles, ...this.bonus] : this.tiles;
  }

  getTileFaces(allTiles) {
    return this.getTiles(allTiles).map(t => t.getTileFace());
  }

  getDuplicates(tile) {
    return this.tiles.filter(t => (t.dataset.tile == tile));
  }

  getLockedTileFaces() {
    return this.locked.map(set => `[${set.map(v=>v.dataset.tile|0)}]${set.winning?'!':''}`);
  }

  getLatestTile() {
    let filtered = this.tiles.filter(t => t.classList.contains('latest'));
    if (filtered.length) return filtered[0];
    return false;
  }

  reveal() {
    if (this.ui) this.ui.reveal();
  }

  sortTiles() {
    if (this.ui) this.ui.sortTiles();
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
    }, config.CLAIM_INTERVAL);

    // And similarly, make sure to cancel the
    // timeout check if we do have a claim
    // determined within the allotted time.
    let interrupt = () => {
      if (!overrideKickedIn) {
        clearTimeout(overrideTrigger);
      }
    };

    this.determineClaim(pid, discard, claim => {
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
}
