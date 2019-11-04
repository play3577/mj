const lockTiles = require("../utils/lock-tiles.js");

const uuid = (function() {
  let clientIdCounter = 0;
  return () => clientIdCounter++;
})();

/**
 * In order to prevent cheating, the game server needs to
 * have a local representation of a player, through which
 * to track tiles, locked sets, and bonus tiles.
 *
 * We can combine this with the general concept of a user
 * object (with a user id, name, etc), and use this User
 * class as both a server user and game player.
 */
class Player {
  constructor(client) {
    this.id = uuid();
    this.client = client;
    this.tiles = [];
    this.locked = [];
    this.bonus = [];
    this.reveal = false;
    // Players can create bots to play in their games,
    // which need to be cleaned up when a game ends,
    // and/or they quit the server.
    this.bots = [];
  }

  addBot(bot) {
    this.bots.push(bot);
  }

  cleanupBots() {
    this.bots.forEach(bot => bot.kill()); // TODO: disconnect from server first
  }

  // register this user's id
  register() {
    this.client.admin.register(this.id);
  }

  // set this user's name (bind only)
  setName(name) {
    this.name = name;
  }

  // set this user's game (bind only)
  setGame(game) {
    this.game = game;
  }

  // notify this user's client that someone joined
  userJoined(user) {
    this.client.user.joined(user.id);
  }

  userBecameBot(user) {
    this.client.user.becameBot(user.id);
  }

  // notify this user's client that someone changed their name
  userChangedName(id, name) {
    this.client.user.changedName({ id, name });
  }

  // notify this user's client that someone left
  userLeft(user) {
    this.client.user.left(user.id);
  }

  processScore(scores) {
    this.score = this.score + scores[this.seat];
    return this.score;
  }

  // Get a summary of this user that can be set to other players
  getDetails() {
    let ret = {
      id: this.id,
      name: this.name,
      seat: this.seat,
      wind: this.wind,
      windGlyph: this.windGlyph,
      score: this.score,
      locked: this.locked,
      bonus: this.bonus.sort((a, b) => a - b)
    };

    if (this.reveal) {
      ret.tiles = this.tiles.sort((a, b) => a - b);
    }

    return ret;
  }

  // notify this user's client that a game was created
  gameCreated(creatorId, gameName) {
    this.client.game.created({
      id: creatorId,
      name: gameName
    });
  }

  // notify this user's client that a game started
  startGame(details) {
    this.score = details.ruledata.player_start_score;
    this.client.game.start(details);
  }

  // notify this user's client that a round has started
  async startRound(details) {
    // note that this is an async function, returning
    // the result of the remote client, because we want
    // to wait for everyone to go "k, ready" before we
    // actually start.
    return this.client.round.start(details);
  }

  // tell player that it's time to actively signal
  // that they're ready for the next round. The game
  // will not move on to the next round untill all
  // players have signaled being ready.
  async getReady() {
    await this.client.game.getReady();
  }

  // ask player to signal that they are ready for the
  // first play tile to get dealt and play to start
  // in earnest.
  async getReadyForPlay(timeout) {
    this.client.round.getReady(timeout);
  }

  // signal that play has _actually_ started.
  async playStarted() {
    await this.client.round.playStarted();
  }

  // ensure this user is "boostrapped" for the next round of play.
  setReady() {
    this.reveal = false;
    this.tiles = [];
    this.locked = [];
    this.bonus = [];
  }

  // notify this user's client that a game state was updated
  async updateGame(details) {
    // wait for this to be acknowledged!
    await this.client.game.updated(details);
  }

  // notify this user's client that seat assignment occurred
  assignSeat(seat, wind, windGlyph) {
    // TODO: FIXME: "seat" is really "wind" and "wind" is really "windGlyph" O_o
    this.seat = seat;
    this.wind = wind;
    this.windGlyph = windGlyph;
    this.client.round.assignSeat({ seat, wind, windGlyph });
  }

  // notify this user's client of their initial tiles
  setTiles(tiles) {
    this.tiles = tiles;
    this.client.round.initialDeal(tiles);
  }

  // helper function to verify a user has a specific tile in hand
  hasTile(tilenumber) {
    return this.tiles.indexOf(tilenumber) > -1;
  }

  // notify this user's client who the current player is
  setCurrentPlayer(seat) {
    this.client.round.setCurrentPlayer(seat);
  }

  // notify this user's client that they drew a tile
  drawTile(tilenumber) {
    this.tiles.push(tilenumber);
    this.client.round.drawTile(tilenumber);
  }

  // notify this user's client that they drew a supplement tile
  drawSupplement(tilenumber) {
    this.tiles.push(tilenumber);
    this.client.round.drawSupplement(tilenumber);
  }

  // notify this user's client that someone had a bonus tile
  seeBonus(player, tilenumber) {
    if (player === this) {
      // if this is our own bonus tile, we need to make sure it
      // gets moved out of the tiles list, and into the bonus list.
      this.bonus.push(tilenumber);
      let pos = this.tiles.indexOf(tilenumber);
      this.tiles.splice(pos, 1);
    }

    this.client.round.playerDeclaredBonus({
      id: player.id,
      seat: player.seat,
      tilenumber: tilenumber
    });
  }

  // notify this user's client that a discard occurred
  seeDiscard(player, tilenumber, timeout) {
    if (player === this) {
      // if this is our tile, make sure to remove it from the tiles list
      let pos = this.tiles.indexOf(tilenumber);
      this.tiles.splice(pos, 1);
    }

    this.client.round.playerDiscarded({
      gameName: this.game.name,
      id: player.id,
      seat: player.seat,
      tilenumber,
      timeout
    });
  }

  // notify this user's client that a discard was taken back
  undoDiscard(player, tilenumber) {
    if (player === this) {
      // if this is our tile, make sure to put it back into tiles list
      this.tiles.push(tilenumber);
    }

    this.client.round.playerTookBack({
      id: player.id,
      seat: player.seat,
      tilenumber
    });
  }

  // notify this user's client that a player passed on the discard
  passed(player) {
    this.client.round.playerPassed({
      id: player.id,
      seat: player.seat
    });
  }

  // notify this user's client that a claim was awarded
  claimAwarded(award) {
    if (award.id === this.id) lockTiles(this.tiles, this.locked, award);
    this.client.round.claimAwarded(award);
  }

  // notify this user's client that the round was a draw
  roundDrawn() {
    this.client.round.drawn();
  }

  // notify this user's client that the round was won
  roundWon(game) {
    this.client.round.won(game);
  }

  // reveal this player's tile as part of getDetails
  revealTiles() {
    this.reveal = true;
  }

  // notify this user's client that the game is over
  gameEnded(game) {
    this.client.game.ended({
      name: game.name
    });
  }

  // notify this user's client that a player left this game
  leftGame(player) {
    this.client.game.left({
      seat: player.seat
    });
  }
}

module.exports = Player;
