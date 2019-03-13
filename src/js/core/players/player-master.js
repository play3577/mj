if (typeof process !== "undefined") {
  document = require('../utils/dom-shim.js');
  TileTracker = require('./tracking/tile-tracker.js');
}

// =========================================
//        Let's define a Player class!
// =========================================

class PlayerMaster {
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

  reset(hand, wind, windOfTheRound, draws) {
    this.wind = wind;
    this.windOfTheRound = windOfTheRound;
    this.draws = draws;
    this.tiles = [];
    this.locked = [];
    this.bonus = [];
    this.waiting = false;
    this.has_won = false;
    this.selfdraw = false;
    this.tracker.reset();
    this.el.innerHTML = '';
    this.el.classList.remove('winner');
    if (this.ui) this.ui.reset(hand, wind, windOfTheRound, draws);
  }

  /**
   * Pause play as far as this player is concerned.
   */
  pause(lock) {
    this.paused = lock;
    if (this.ui) this.ui.pause(lock);
  }

  /**
   * Resume play as far as this player is concerned.
   */
  resume() {
    if (this.ui) this.ui.resume();
    this.paused = false;
  }

  /**
   * Bind the ruleset that this player should "follow"
   * during the game they are currently in.
   */
  setRules(rules) {
    this.rules = rules;
    this._score = this.rules.player_start_score;
    if (this.ui) this.ui.setRules(rules);
  }

  /**
   * Signal that the game will start
   */
  gameWillStart() {
    if (this.ui) this.ui.gameWillStart();
  }

  /**
   * Signal that a specific hand will start
   */
  handWillStart(redraw, resolve) {
    if (this.ui) this.ui.handWillStart(redraw, resolve);
    else resolve();
  }

  /**
   * Signal that actual play is about to start
   * during a hand. This is called after all the
   * initial tiles have been dealt, and all players
   * have declared any kongs they might have had
   * in their hand as a consequence.
   */
  playWillStart() {
    if (this.ui) this.ui.playWillStart();
  }

  /**
   * Take note of how many tiles there are left
   * for playing with during this hand.
   */
  markTilesLeft(left, dead) {
    this.tilesLeft = left;
    this.tilesDead = dead;
    if (this.ui) this.ui.markTilesLeft(left, dead);
  }

  /**
   * Disclose this player's hand information.
   */
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
      selftile: (this.has_won && this.selfdraw) ? this.latest : false,
      // If this player has won, the last-claimed tile can matter.
      final: this.has_won ? this.latest.getTileFace() : false
    };
  }

  /**
   * Signal that the hand has ended. If the hand
   * was a draw, there will no arguments passed.
   * If the hand was won, the `fullDisclosures`
   * object contains all player's disclosures.
   */
  endOfHand(fullDisclosure) {
    if (this.ui) this.ui.endOfHand(fullDisclosure);
  }

  /**
   * Signal that the game has ended, with the final
   * game scores provided in the `scores` object.
   */
  endOfGame(scores) {
    if (this.ui) this.ui.endOfGame(scores);
  }

  /**
   * Work a score adjustment into this player's
   * current score.
   */
  recordScores(adjustments) {
    this._score += adjustments[this.id];
    if (this.ui) this.ui.recordScores(adjustments);
  }

  /**
   * Get this player's current game score.
   */
  getScore() {
    return this._score;
  }

  /**
   * Signal that this is now the active player.
   */
  activate(id) {
    if (this.ui) this.ui.activate(id);
  }

  /**
   * Signal that this is not an active player.
   */
  disable() {
    if (this.ui) this.ui.disable();
  }

  /**
   * Internal function for marking self as waiting
   * to win, using any tile noted in `winTiles`.
   */
  markWaiting(winTiles={}) {
    this.waiting = winTiles;
    if (this.ui) this.ui.markWaiting(winTiles)
  }

  /**
   * Mark this player as winner of the current hand.
   */
  markWinner() {
    if (!this.has_won) {
      this.has_won = true;
      this.wincount++;
      if (this.ui) this.ui.markWinner(this.wincount);
    }
  }

  /**
   * How many times has this player won?
   */
  getWinCount() {
    return this.wincount;
  }

  /**
   * Add a tile to this player's hand.
   */
  append(tile, claimed, supplement) {
    let revealed = false;
    if (typeof tile !== 'object') {
      if (tile > 33) {
        revealed = tile;
        this.bonus.push(tile);
      }
      tile = create(tile);
    }
    this.latest = tile;
    if (!tile.dataset.bonus) {
      this.tiles.push(tile);
    }
    if (!claimed) {
      this.tracker.seen(tile.getTileFace());
      this.lastClaim = false;
    }
    if (supplement) {
      tile.dataset.supplement = 'supplement';
    }
    if (this.ui) this.ui.append(tile);
    return revealed;
  }

  /**
   * Remove a tile from this player's hand
   * (due to a discard, or locking tiles, etc).
   */
  remove(tile) {
    let pos = this.tiles.indexOf(tile);
    this.tiles.splice(pos, 1);
    if (this.ui) this.ui.remove(tile);
  }

  /**
   * Player formed a kong by having a pung on
   * the table, and drawing the fourth tile
   * themselves.
   */
  meldKong(tile) {
    this.remove(tile);
    let set = this.locked.find(set => (set[0].getTileFace() === tile.getTileFace()));
    let meld = set[0].copy();
    meld.dataset.melded = 'melded';
    set.push(meld);
    if (this.ui) this.ui.meldKong(tile);
  }

  /**
   * Check whether this player has, and if so,
   * wants to declare, a kong.
   */
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
        // Note: we do not check with our "personality" if we start
        // with a kong, we just declare it. This means we might play
        // suboptimal in a rare few edge cases, but it DOES mean we
        // don't need to front-load a personality into the Player
        // class, and can leave that aspect to bots, instead.
        let tiles = this.tiles.filter(t => t.getTileFace()==tile);
        this.lockClaim(tiles);
        return tiles;
      }
    }
    return false;
  }

  /**
   * Take note of the fact that a player revealed
   * one or more tiles, either due to discarding,
   * revealing a bonus tile, or by claiming/melding
   * a set.
   */
  see(tiles, player) {
    if (player === this) return;
    if (!tiles.map) tiles = [tiles];
    tiles.forEach(tile => this.tracker.seen(tile));
    if (this.ui) this.ui.see(tiles, player);
  }

  /**
   * Take note of the fact that a different player
   * received a tile for whatever reason.
   */
  receivedTile(player) {
    if (this.ui) this.ui.receivedTile(player);
  }

  /**
   * Take note of the fact that a different player
   * discarded a specific tile.
   */
  playerDiscarded(player, discard, playcounter) {
    let tile = discard.getTileFace();
    if (this.id != player.id) this.tracker.seen(tile);
    if (this.ui) this.ui.playerDiscarded(player, tile, playcounter);
  }

  /**
   * Take note of the fact that a different player
   * declared a kong.
   */
  seeKong(tiles, player, tilesRemaining, resolve) {
    this.see(tiles.map(t => t.getTileFace()), player);
    this.robKong(tiles, tilesRemaining, resolve);
  }

  // implemented by subclasses
  robKong(tiles, tilesRemaining, resolve) {
    console.log('playermaster.spawnKongRobDialog');
    resolve();
  }

  /**
   * Take note of the fact that a different player
   * claimed a discard to form a set.
   */
  seeClaim(tiles, player, claimedTile, claim) {
    if (player === this) return;
    if (!tiles.map) tiles = [tiles];

    tiles.forEach((tile, pos) => {
      // We've already see the discard that got claimed
      if (tile === claimedTile) return;
      // But we haven't seen the other tiles yet.
      this.tracker.seen(tile.getTileFace());
    });
    if (this.ui) this.ui.seeClaim(tiles, player, claim);
  }

  /**
   * Signal that the current player is done.
   */
  nextPlayer() {
    if (this.ui) this.ui.nextPlayer();
  }

  getAvailableTiles() {
    return this.tiles;
  }

  getSingleTileFromHand(tile) {
    return this.tiles.find(t => (t.getTileFace() == tile));
  }

  getAllTilesInHand(tile) {
    return this.tiles.filter(t => (t.getTileFace() == tile));
  }

  getTiles(allTiles) {
    return allTiles ? [...this.tiles, ...this.bonus] : this.tiles;
  }

  getTileFaces(allTiles) {
    return this.getTiles(allTiles).map(t => (t.getTileFace ? t.getTileFace() : t)).sort((a,b)=>(a-b));
  }

  getLockedTileFaces() {
    return this.locked.map(set => `[${set.map(v=>v.getTileFace()).sort((a,b)=>(a-b))}]${set.winning?'!':''}`);
  }

  sortTiles() {
    if (this.ui) this.ui.sortTiles();
  }

  /**
   * Check whether a chow can be formed using `tile` from
   * player with id `pid`, by looking at our hand tiles.
   */
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
}

if (typeof process !== "undefined") {
  module.exports = PlayerMaster;
}
