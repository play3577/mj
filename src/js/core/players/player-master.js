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

  pause(lock) {
    this.paused = lock;
    if (this.ui) this.ui.pause(lock);
  }

  resume() {
    if (this.ui) this.ui.resume();
    this.paused = false;
  }

  setRules(rules) {
    this.rules = rules;
    this._score = this.rules.player_start_score;
    if (this.ui) this.ui.setRules(rules);
  }

  gameWillStart() {
    if (this.ui) this.ui.gameWillStart();
  }

  handWillStart(redraw, resolve) {
    if (this.ui) this.ui.handWillStart(redraw, resolve);
    else resolve();
  }

  // Called after all tiles have been dealt, and all players
  // have declared any kongs they might have had in their hand.
  playWillStart() {
    if (this.ui) this.ui.playWillStart();
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
      selftile: (this.has_won && this.selfdraw) ? this.latest : false,
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

  markWaiting(winTiles={}) {
    this.waiting = winTiles;
    if (this.ui) this.ui.markWaiting(winTiles)
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

  append(t, claimed, supplement) {
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
    if (supplement) {
      t.dataset.supplement = 'supplement';
    }
    if (this.ui) this.ui.append(t);
    return revealed;
  }

  remove(tile) {
    let pos = this.tiles.indexOf(tile);
    this.tiles.splice(pos, 1);
    if (this.ui) this.ui.remove(tile);
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
        // Note: we do not check with our "personality" if we start
        // with a kong, we just declare it. This means we might play
        // suboptimal in a rare few edge cases, but it DOES mean we
        // don't need to front-load a personality into the Player
        // class, and can leave that aspect to bots, instead.
        let tiles = this.tiles.filter(t => t.dataset.tile==tile);
        this.lockClaim(tiles);
        return tiles;
      }
    }
    return false;
  }

  see(tiles, player) {
    if (player === this) return;
    if (!tiles.map) tiles = [tiles];
    tiles.forEach(tile => this.tracker.seen(tile));
    if (this.ui) this.ui.see(tiles, player);
  }

  receivedTile(player) {
    if (this.ui) this.ui.receivedTile(player);
  }

  playerDiscarded(player, discard, playcounter) {
    let tile = discard.dataset.tile;
    if (this.id != player.id) this.tracker.seen(tile);
    if (this.ui) this.ui.playerDiscarded(player, tile, playcounter);
  }

  seeKong(tiles, player) {
    this.see(tiles.map(t => t.dataset.tile), player);
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
    return this.getTiles(allTiles).map(t => (t.dataset ? t.dataset.tile : t)|0);
  }

  getLockedTileFaces() {
    return this.locked.map(set => `[${set.map(v=>v.dataset.tile|0)}]${set.winning?'!':''}`);
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
}

if (typeof process !== "undefined") {
  module.exports = PlayerMaster;
}
