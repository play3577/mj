/**
 * By using the same API, we can automate all the functions
 * without any reliance on HTML, then switch over bots
 * to use this as "user interface", and move on quickly.
 */
class TileBank {
  constructor(id) {
    this.id = id;
    this.reset();
  }

  reset() {
    this.tiles = [];
    this.bonus = [];
  }

  handWillStart() {
    // bots do nothing with this signal.
  }

  removeLastDiscard() {
    // bots do nothing with this signal.
  }

  nextPlayer() {
    // bots do nothing with this signal.
  }

  endOfHand(disclosure) {
    // bots do nothing with this signal
  }

  endOfGame(scores) {
    // bots do nothing with this signal
  }

  recordScores(scores) {
    // bots do nothing with this signal
  }

  markHand(hand, wind) {
    // bots do nothing with this signal
  }

  activate(id) {
    // bots do nothing with this signal
  }

  disable() {
    // bots do nothing with this signal
  }

  markWaiting(val) {
    // bots do nothing with this signal
  }

  markWinner(wincount) {
    // bots do nothing with this signal.
  }

  winner() {
    // bots do nothing with this signal
  }

  append(t) {
    if (t.dataset.bonus) {
      this.bonus.push(t);
    } else {
      this.tiles.push(t);
      this.sortTiles();
    }
  }

  remove(tile) {
    let pos = this.tiles.indexOf(tile);
    this.tiles.splice(pos, 1);
  }

  lockClaim(tiles) {
    tiles.forEach(tile => this.remove(tile));
  }

  playerDiscarded(player, tile) {
    // bots do nothing with this signal
  }

  see(tiles, player) {
    // bots do nothing with this signal
  }

  seeClaim(tiles, player) {
    // bots do nothing with this signal
  }

  prepareForClaim(player) {
    // bots do nothing with this signal
  }

  receivedTile(player) {
    // bots do nothing with this signal
  }

  sortTiles(e) {
    this.tiles.sort(config.SORT_TILE_FN);
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

  reveal() {
    // bots do nothing with this signal
  }
}
