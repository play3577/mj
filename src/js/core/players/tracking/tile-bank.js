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

  markTilesLeft(left, dead) {
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
   // bots do nothing with this signal
  }

  remove(tile) {
   // bots do nothing with this signal
  }

  lockClaim(tiles) {
   // bots do nothing with this signal
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
    // bots do not care about having locally sorted tiles
  }

  getAvailableTiles() {
    // dead function
  }

  getSingleTileFromHand(tile) {
    // dead function
  }

  getAllTilesInHand(tile) {
    // dead function
  }

  getTiles(allTiles) {
    // dead function
  }

  getTileFaces(allTiles) {
    // dead function
  }

  getDuplicates(tile) {
    // dead function
  }

  reveal() {
    // bots do nothing with this signal
  }
}
