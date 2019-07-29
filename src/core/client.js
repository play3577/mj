require("../utils/array-updates.js");

const lockTiles = require("../utils/lock-tiles.js");
const sortTiles = (a, b) => a - b;


function getClaimTiles(claim) {
  let { tilenumber, claimtype, wintype } = claim;
  if (claimtype === `win`) claimtype = wintype;
  let count = claimtype === `kong` ? 4 : claimtype === `pair` ? 2 : 3;

  if (claimtype.startsWith(`chow`)) {
    let t = tilenumber, offset = parseInt(claimtype.replace(`chow`, ``)) - 1;
    return [t - offset, t - offset + 1, t - offset + 2];
  }

  return new Array(count).fill(tilenumber);
}


class GameClient {
  constructor() {
    this.state = {
      id: -1,
      chat: [],
      users: [],
      games: [],
      players: [],
    };
  }

  /**
   * When the web client quits, this function automatically
   * gets called by the socketless framework. Since we're running
   * clients as their own process: kill that process.
   */
  onQuit() {
    console.log("Shutting down client.");
    process.exit(0);
  }

  /**
   * When the server registers us, set our state to
   * include our assigned id, and the list of other
   * known users, and extant games.
   */
  async "admin:register"(id) {
    this.setState({
      id: id,
      users: await this.server.user.getUserList(),
      games: await this.server.game.getGameList()
    });
  }

  /**
   * When we receive a chat message, queue it.
   */
  async "chat:message"({ id, message }) {
    this.state.chat.push({ id, message });
  }

  /**
   * When a user joined, create a user record in our
   * list of known users.
   */
  async "user:joined"(id) {
    let user = this.state.users.find(u => u.id === id);
    if (!user) {
      this.state.users.push({ id });
    }
  }

  /**
   * When a user leaves, remove them from that list.
   */
  async "user:left"(id) {
    let pos = this.state.users.findIndex(u => u.id === id);
    if (pos > -1) this.state.users.splice(pos, 1);
  }

  /**
   * When a user changes name, record that.
   */
  async "user:changedName"(game) {
    const { id, name } = game;
    let user = this.state.users.find(u => u.id === id);
    if (user) user.name = name;
  }

  /**
   * When someone creates a game, add a new game entry
   * to our list of known games.
   */
  async "game:created"(game) {
    const { id, name } = game;
    this.state.games.push({
      id,
      name,
      players: [{ id }],
      round: {}
    });
  }

  /**
   * When a game is updated for whatever reason, mirror
   * that update locally.
   */
  async "game:updated"(game) {
    let pos = this.state.games.findIndex(g => g.name === game.name);
    if (pos > -1) this.state.games[pos] = game;
    if (this.state.currentGame && this.state.currentGame.name === game.name) {
      this.setState({ currentGame: game });
    }
  }

  /**
   * When a game we are joined into starts, make sure to
   * allocate all the relevant variables that we're going
   * to make use of, so that the web client can start
   * working with those.
   */
  async "game:start"(game) {
    this.setState({
      currentGame: game,
      players: game.players,
      tiles: [],
      bonus: [],
      locked: [],
      ruledata: game.ruledata,
      score: game.ruledata.player_start_score
    });
  }

  /**
   * This is a trigger for clients to say whether or not
   * they are ready to start the (next) round of play.
   * As there might be a delay of minutes until a "response"
   * is sent, we don't return whether we're ready (as that
   * would time out after only a few seconds), but instead
   * call the dedicated `game:ready' API function.
   */
  async "game:getReady"() {
    if (!this.is_web_client) this.server.game.ready();
    else this.setState({ waiting: true });
  }

  /**
   * This is a trigger for clients to say whether or not
   * they are ready for the initial deal in a round of
   * play, after the initial tiles were dealt to each
   * player. This is a grace period for humans to look
   * at their tiles, and determine what to play for before
   * the "draw and discard" game loop starts in earnest.
   */
  async "round:getReady"(timeout) {
    if (!this.is_web_client) return this.server.round.ready();
    this.setState({ waitingForDeal: true });
  }

  /**
   * Once everyone is ready for the game loop to start,
   * this signals that play has started.
   */
  async "round:playStarted"() {
    if (!this.is_web_client) return;
    this.setState({
      waitingForDeal: false,
      inGameLoop: true
    });
  }

  /**
   * When a round of the game that we are joined into starts,
   * make sure to allocate all the relevant variables that
   * we're going to make use of, so that the webclient
   * can start working with those.
   */
  async "round:start"(game) {
    let gamePos = this.state.games.findIndex(g => g.name === game.name);
    this.state.games[gamePos] = game;

    // This represents our knowledge of "which tiles
    // might still exist in the game".
    const allTiles = {};
    for (let i = 0; i < 34; i++) allTiles[i] = 4;

    this.setState({
      tiles: [],
      bonus: [],
      locked: [],
      players: game.players,
      winner: false,
      wininfo: false,
      currentGame: game,
      currentDiscard: false,
      wall: allTiles,
      draw: false,
      waiting: false,
      waitingForDeal: false,
      inGameLoop: false,
    });

    return { ready: true };
  }

  /**
   * Set our wind and seat for the game we're in.
   */
  async "round:assignSeat"({ seat, wind, windGlyph }) {
    this.setState({
      seat: seat,
      wind: wind,
      windGlyph: windGlyph
    });
  }

  // helper functions to update what we know about the wall,
  // as we see tiles come into our hand and getting played.
  seeTile(tilenumber) {
    this.state.wall[tilenumber]--;
  }

  seeTiles(tilenumbers) {
    if (!tilenumbers.forEach) tilenumbers = [tilenumbers];
    tilenumbers.forEach(tilenumber => this.state.wall[tilenumber]--);
  }

  unseeTile(tilenumber) {
    this.state.wall[tilenumber]++;
  }

  unseeTiles(tilenumbers) {
    if (!tilenumbers.forEach) tilenumbers = [tilenumbers];
    tilenumbers.forEach(tilenumber => this.state.wall[tilenumber]++);
  }

  /**
   * Set our initial tiles, so we can start playing.
   */
  async "round:initialDeal"(tiles) {
    tiles.sort(sortTiles);
    this.setState({
      bonus: tiles.filter(t => t >= 34),
      tiles: tiles.filter(t => t <= 33)
    });
    this.state.bonus.forEach(tilenumber =>
      this.server.game.bonusTile({ tilenumber })
    );
    this.seeTiles(this.state.tiles);
  }

  /**
   * Take note of the fact that someone declared drawing
   * a bonus tile, rather than a normal play tile.
   */
  async "round:playerDeclaredBonus"({ id, seat, tilenumber }) {
    let player = this.state.players[seat];
    if (!player.bonus) player.bonus = [];
    player.bonus.push(tilenumber);
    player.bonus.sort(sortTiles);
  }

  // Helper function to make sure only play tiles make it
  // into the tiles list. Bonus tiles are immediately moved
  // into the bonus list, with a notification to the server
  // that a bonus tile was locked away.
  acceptTile(tilenumber) {
    if (tilenumber >= 34) {
      this.state.bonus.push(tilenumber);
      this.state.bonus.sort(sortTiles);
      this.server.game.bonusTile({ tilenumber });
      return false;
    }

    let tiles = this.state.tiles;
    tiles.push(tilenumber);
    tiles.sort(sortTiles);
    if (this.state.seat === this.state.currentPlayer) {
      this.setState({ latestTile: tilenumber });
    }

    this.seeTile(tilenumber);
  }

  /**
   * This function is called by the server rather than us
   * calling it: we have been dealt a tile, so add it to
   * our hand, or our bonus pile, depending on what it was.
   */
  async "round:drawTile"(tilenumber) {
    this.acceptTile(tilenumber);
  }

  /**
   * When locking away bonus tiles or kongs, the player is
   * awarded a compensation tile, to ensure that they still
   * have enough tiles to form a winning pattern with.
   *
   * While the result is the same as game:draw, most rules
   * have special scoring when winning uses a compensation
   * tile.
   */
  async "round:drawSupplement"(tilenumber) {
    this.acceptTile(tilenumber);
    this.setState({ supplementTile: true });
  }

  /**
   * helper function to take note of the current seat/player.
   */
  setSeat(seat) {
    this.setState({
      latestTile: false,
      supplementTile: false,
      currentDiscard: false,
      currentPlayer: seat,
      passed: false
    });
  }

  /**
   * Take note of which seat is the current player.
   */
  async "round:setCurrentPlayer"(seat) {
    this.setSeat(seat);
  }

  /**
   * Someone discarded a tile!
   */
  async "round:playerDiscarded"({ id, seat, tilenumber }) {
    if (id === this.state.id) {
      let tiles = this.state.tiles;
      let pos = tiles.indexOf(tilenumber);
      if (pos !== -1) {
        tiles.splice(pos, 1);
      } else {
        console.log(`${tiles} does not contain ${tilenumber}?`);
      }
    } else {
      this.seeTile(tilenumber);
    }
    this.setState({
      currentDiscard: { id, seat, tilenumber }
    });
  }

  /**
   * Someone took back their tile...
   */
  async "round:playerTookBack"({ id, seat, tilenumber }) {
    this.setState({ currentDiscard: false });
    if (id === this.state.id) {
      let tiles = this.state.tiles;
      tiles.push(tilenumber);
      tiles.sort(sortTiles);
    } else {
      this.unseeTile(tilenumber);
    }
  }

  /**
   * Someone passed on claiming the current discard.
   */
  async "round:playerPassed"({ id, seat }) {
    if (id === this.state.id) {
      this.setState({ passed: true });
    }
  }

  /**
   * Someone's claim on the current discard went through.
   */
  async "round:claimAwarded"(claim) {
    this.setSeat(claim.seat);
    if (claim.id === this.state.id)
      lockTiles(this.state.tiles, this.state.locked, claim);
    else {
      let player = this.state.players[claim.seat];
      if (!player.locked) player.locked = [];
      player.locked.push(claim);

      // Make sure we track revealed tiles, which means
      // "all tiles in the claim, minus the discard we
      // already saw earlier".
      let lockedtiles = getClaimTiles(claim);
      let pos = lockedtiles.indexOf(claim.tilenumber);
      lockedtiles.splice(pos, 1);
      this.seeTiles(lockedtiles);
    }
  }

  /**
   * No one won =(
   */
  async "round:drawn"() {
    this.setState({
      latestTile: false,
      inGameLoop: false,
      draw: true
    });
  }

  /**
   * Someone won!
   */
  async "round:won"(details) {
    this["game:updated"](details);

    this.setState({
      latestTile: false,
      inGameLoop: false,
      winner: details.result.id,
      wininfo: details.wininfo
    });

    // consent to revealing this client's tiles
    this.server.game.reveal();
  }

  /**
   * When a game is over, remove it from our list of known games.
   */
  async "game:ended"({ name }) {
    let games = this.state.games;
    let pos = games.findIndex(g => g.name === name);
    games.splice(pos, 1);

    this.setState({
      wall: false,
      games
    });
  }

  /**
   * Someone left the current game.
   */
  async "game:left"({ seat }) {
    if (seat === this.state.seat) {
      this.setState({ currentGame: false });
    } else {
      let player = this.state.players.find(p => p.seat === seat);
      player.left = true;
    }
  }
};

module.exports = GameClient;
