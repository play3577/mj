require("../utils/enhance-array.js");

const Game = require("../game/game.js");
const Player = require("./player.js");

class GameServer {
  constructor() {
    this.players = [];
    this.games = [];
  }

  // A helper function for getting a user object given a client socket
  getPlayer(client) {
    return this.players.find(p => p.client === client);
  }

  // A helper funciton to get every user object except
  // the one associated with this client socket.
  getOthers(client) {
    return this.players.filter(p => p.client !== client);
  }

  /**
   * When a client connects, build a user object around it,
   * and assign the client a unique id.
   */
  async onConnect(client) {
    const player = new Player(client);
    const others = this.players.slice();
    this.players.push(player);
    player.register();
    others.forEach(p => p.userJoined(player));
  }

  /**
   * When a client disconnects, remove the associated user
   * object, and remove it from any games it might be in,
   * cleaning up any games that drop to 0 players as a result.
   */
  async onDisconnect(client) {
    const playerPos = this.players.findIndex(p => p.client === client);
    const player = this.players.splice(playerPos, 1)[0];
    this.players.forEach(p => p.userLeft(player));

    // clean up any game bots
    player.cleanupBots();

    // update all running games
    this.games.forEach(game => game.leave(player));
    this.games = this.games.filter(game => game.players.count === 0);
  }

  /**
   * Have a user indicate a new name.
   */
  async "user:setName"(from, name) {
    // TODO: turn this into setConfig with `{ name, isbot, preferences }`
    const player = this.getPlayer(from);
    player.setName(name);
    this.players.forEach(p => p.userChangedName(player.id, name));
  }

  /**
   * Send clients the known user list on request.
   */
  async "user:getUserList"() {
    return this.players.map(p => p.getDetails());
  }

  /**
   * Switch from player to bot, or back
   */
  async "user:switchTo"(from, mode) {
    // TODO: FIX THIS

    const player = this.getPlayer(from);
    let status = false;
    if (mode === `bot`) {
      player.switchToBot();
      status = `bot`;
    }
    if (mode === `player`) {
      player.switchToClient();
      status = `client`
    }
    return { status };
  }

  /**
   * Send clients the known games list on request.
   */
  async "game:getGameList"() {
    return this.games.map(g => g.getDetails());
  }

  /**
   * Create a game, automatically binding the creating
   * user as the game's "owner".
   */
  async "game:create"(from) {
    const player = this.getPlayer(from);
    const game = new Game(player);
    this.games.push(game);
    this.players.forEach(p => p.gameCreated(player.id, game.name));
  }

  /**
   * Update a game's configuration prior to start
   */
  async "game:config"(from, config) {
    const player = this.getPlayer(from);
    const game = player.game;
    if (game) {
      if (game.owner === player) {
        if (!game.inProgress) {
          game.setConfig(config);
          return { applied: true };
        }
        return { applied: false, reason: `game already in progress` };
      }
      return { applied: false, reason: `not permitted` };
    }
    return { applied: false, reason: `not in a game` };
  }

  /**
   * Try to join a user to a game, explaining why this
   * could not be done in any of the many possible cases.
   */
  async "game:join"(from, gameName) {
    const game = this.games.find(g => g.name === gameName);
    if (game) {
      if (!game.inProgress) {
        const player = this.getPlayer(from);
        const alreadyJoined = game.addPlayer(player);
        if (!alreadyJoined) {
          game.sendUpdate(this.players);
          return { joined: true };
        }
        return { joined: false, reason: `already joined` };
      }
      return { joined: false, reason: `game already in progress` };
    }
    return { joined: false, reason: `no such game` };
  }

  /**
   * Try to remove a user from a game, cleaning up any games
   * that drop to 0 players as a result.
   */
  async "game:leave"(from) {
    const player = this.getPlayer(from);
    const game = player.game;
    game.leave(player);

    // clean up any game bots
    player.cleanupBots();

    // clean up empty games
    if (game.players.length === 0) {
      const pos = this.games.findIndex(g => g === game);
      this.games.splice(pos, 1);
      this.players.forEach(p => p.gameEnded(game));
    }
  }

  /**
   * Called by players to signal they are ready to
   * begin a round of play.
   */
  async "game:ready"(from) {
    const player = this.getPlayer(from);
    const game = player.game;
    if (game && game.inProgress) {
      game.ready(player);
    }
  }

  /**
   * Add a bot to this game.
   */
  async "game:addBot"(from) {
    const player = this.getPlayer(from);
    const game = player.game;
    if (game) {
      if (game.owner === player) {
        if (!game.inProgress) {
          game.addBot(player);
          return { added: true };
        }
        return { added: false, reason: `game already in progress` };
      }
      return { added: false, reason: `not permitted` };
    }
    return { added: false, reason: `not in a game` };
  }

  /**
   * Start a game on request, explaining why this
   * could not be done in any of the many possible cases.
   */
  async "game:start"(from) {
    const player = this.getPlayer(from);
    const game = player.game;
    if (game) {
      if (game.owner === player) {
        if (!game.inProgress) {
          game.start();
          return { started: true };
        }
        return { started: false, reason: `game already in progress` };
      }
      return { started: false, reason: `not permitted` };
    }
    return { started: false, reason: `not in a game` };
  }

  /**
   * Forward the fact that a player has a bonus tile to the
   * game that player is playing in, explaining why this
   * could not be done in any of the many possible cases.
   */
  async "game:bonusTile"(from, { tilenumber }) {
    const player = this.getPlayer(from);
    const game = player.game;
    if (game) {
      let reason = game.round.playerDeclaredBonus(player, tilenumber);
      if (!reason) {
        return { accepted: true };
      }
      return { accepted: false, reason };
    }
    return { accepted: false, reason: `not in a game` };
  }

  /**
   * Register an "I am ready to start playing now" after the
   * initial deal, from a player.
   */
  async "round:ready"(from) {
    const player = this.getPlayer(from);
    const game = player.game;
    if (game) game.round.startPlay(player);
  }

  /**
   * Forward the fact that a player discarded a tile in the
   * game that player is playing in, explaining why this
   * could not be done in any of the many possible cases.
   */
  async "game:discardTile"(from, { tilenumber }) {
    const player = this.getPlayer(from);
    const game = player.game;
    if (game) {
      let reason = game.round.playerDiscarded(player, tilenumber);
      if (!reason) {
        return { accepted: true };
      }
      return { accepted: false, reason };
    }
    return { accepted: false, reason: `not in a game` };
  }

  /**
   * Forward an "undo discard" request from a player.
   */
  async "game:undoDiscard"(from) {
    const player = this.getPlayer(from);
    const game = player.game;
    if (game) {
      let reason = game.round.undoDiscard(player);
      if (!reason) {
        return { allowed: true };
      }
      return { allowed: false, reason };
    }
    return { allowed: false, reason: `not in a game` };
  }

  /**
   * Forward a "pass on discard" by a player.
   */
  async "game:pass"(from) {
    const player = this.getPlayer(from);
    const game = player.game;
    if (game) {
      game.round.playerPasses(player);
    }
  }

  /**
   * Forward a discard claim by a player.
   */
  async "game:claim"(from, { claimtype, wintype }) {
    const player = this.getPlayer(from);
    const game = player.game;
    if (game) {
      game.round.playerClaim(player, claimtype, wintype);
      return { allowed: true };
    }
    return { allowed: false, reason: `not in a game` };
  }

  /**
   * Forward a win declaration by a player.
   */
  async "game:declareWin"(from) {
    const player = this.getPlayer(from);
    const game = player.game;
    if (game)
      game.round.declareWin({
        id: player.id,
        seat: player.seat
      });
  }

  /**
   * Set a user's current game tiles to "visible to all".
   */
  async "game:reveal"(from) {
    const player = this.getPlayer(from);
    const game = player.game;
    if (game) game.reveal(player);
  }
}

module.exports = GameServer;
