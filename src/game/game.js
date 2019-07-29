const generateRandomName = require("../utils/name-generator.js");
const Round = require("./round.js");
const Ruleset = require("./rules/ruleset.js");
const getConfig = require("../utils/get-config.js");

/**
 * This class models a game of Mahjong - in a fairly naive way
 * in that it's only a single round. However, all the core
 * game mechanics should be here.
 */
module.exports = class Game {
  constructor(owner) {
    this.name = generateRandomName();
    this.owner = owner;
    this.owner.setGame(this);
    this.inProgress = false;
    this.players = [this.owner];
    this.setConfig(getConfig(this));
  }

  /**
   * Add a player to this game.
   */
  addPlayer(player) {
    if (this.players.find(p => p.id === player.id)) return true;
    player.setGame(this);
    this.players.push(player);
  }

  /**
   * Add a bot to this game
   */
  addBot(owner) {
    console.log("starting a bot");
    const { spawn } = require("child_process");
    const npm = `npm${process.platform === "win32" ? `.cmd` : ``}`;
    const bot = spawn(npm, [`run`, `game:bot`, this.name]);
    bot.stderr.on('data', data => console.error(data.toString()));
    bot.stdout.on('data', data => console.log(data.toString()));
    owner.addBot(bot);
  }

  /**
   * Remove a player from this game, and notify all others.
   */
  leave(player) {
    this.players.forEach(p => p.leftGame(player));
    let pos = this.players.findIndex(p => p.id === player.id);
    if (pos > -1) this.players.splice(pos, 1);
  }


  /**
   * change a game's config
   */
  setConfig(config) {
    this.config = config;
    this.rules = new Ruleset(this.config.ruleset.value);
    this.sendUpdate();
  }

  /**
   * Generate a transmissible game summary.
   */
  getDetails() {
    return {
      id: this.owner.id,
      name: this.name,
      config: this.config,
      rules: this.rules.getRuleData(),
      round: this.round ? this.round.getDetails() : Round.getDetails(),
      players: this.players.map(p => p.getDetails()),
      inProgress: this.inProgress,
      finished: this.finished
    };
  }

  /**
   *  Start a game!
   */
  async start() {
    this.totalRounds = this.players.length * this.players.length;
    this.inProgress = true;

    let details = this.getDetails();
    details.ruledata = this.rules.getRuleData();
    await Promise.all(this.players.map(p => p.startGame(details)));

    this.round = new Round(this);
    this.round.start();
  }

  /**
   * notify players of the current game state
   */
  sendUpdate(users = false) {
    users = users || this.players;

    let details = this.getDetails();
    users.forEach(p => p.updateGame(details));
  }

  /**
   * End of round: notify all users to get ready for the
   * next round, or that the game has ended because enough
   * rounds have been played.
   */
  async endOfRound(windata) {
    // was the round a draw?
    if (!windata) {
      this.players.forEach(p => p.roundDrawn());
    }

    // normal round completion
    else {
      // Once we've played a square number of games, we're done.
      if (this.round.roundNumber === this.totalRounds) {
        return this.endGame();
      }
    }

    // if the winner was east, and the rules say the deal
    // does not pass on east, the total number of rounds
    // to play should get bumped.
    let winner = this.players.find(p => p.id === windata.result.id);
    if (!this.rules.getRuleData().pass_on_east_win) {
      if (winner.wind === 0) this.totalRounds++;
    }

    // Reveal all player tiles
    this.players.forEach(p => p.revealTiles());

    // Notify all players of the game at this point in time. We
    // need to await this because if we don't, the p.getReady()
    // call a few lines below will trigger a secondary update
    // that may not have tile information in it.
    const details = this.getDetails();
    await this.players.awaitForEach(p => p.updateGame(details));

    // Then, in order to start a new round, we need all
    // players to indicate that they're ready, so let's
    // start waiting for that:
    this.playersready = [];
    this.players.forEach(p => p.getReady());

    // FIXME: we're generating a LOT of events in this function,
    //        possibly combined with the codepath leading up to
    //        it... can we fix that?
  }

  /**
   * Make a player's tiles visible to all other players
   */
  reveal(player) {
    player = this.players.find(p => p.id === player.id);
    player.revealTiles();
    this.sendUpdate();
  }

  /**
   * Called by each player to indicate they're ready for the next play.
   */
  ready(player) {
    this.playersready[player.seat] = true;
    player.setReady();
    if (this.playersready.filter(r => r).length === this.players.length) {
      this.round.startNextRound();
    }
  }

  /**
   * We're done with this game!
   */
  endGame() {
    this.finished = true;
    this.inProgress = false;
    let details = this.getDetails();
    this.players.forEach(p => p.updateGame(details));
  }
};
