const GameClient = require("./client.js");
const findTilesNeeded = require("../game/rules/utils/find-tiles-needed.js");

// As part of findTilesNeeded we want to issue calls where "ignoreChowPairs"
// is supposed to be false, so we alias that value to a better name:
const includeChowPairs = false;

/**
 * Bots don't need to reimplement every single API call,
 * since clients already do the right thing for the most
 * part. However, they do need to tap into the play loop
 * functions in order to evaluate their play policy and
 * decide what to play for and what to get rid of.
 */
class Bot extends GameClient {


  // FIXME: EXPERIMENTAL TEST
    toGameClient() {
      let toBot = this.toBot.bind(this);
      Object.setPrototypeOf(this, new GameClient());
      this.toBot = toBot;
    }
  // FIXME: EXPERIMENTAL TEST
    toBot() {
      Object.setPrototypeOf(this, new Bot());
    }
  // FIXME: EXPERIMENTAL TEST


  // helper function for playing with face-up tiles.
  async debug() {
    const game = this.state.currentGame;
    if (game && game.config && game.config.force_open_play.value) {
      this.server.game.reveal();
    }
  }

  /**
   * Purely for humanity's sake, bots will rename
   * themselves to indicate they are a bot.
   */
  async "admin:register"(...args) {
    await super["admin:register"](...args);
    if (!this.state.name) {
      this.server.user.setName(`Bot ${this.state.id}`);
    }
  }

  /**
   * The initial deal effectively starts the bot.
   */
  async "round:initialDeal"(...args) {
    await super["round:initialDeal"](...args);
    this.debug();
    this.updatePlayPolicy();
  }

  /**
   * Receiving new tiles potentially changes what
   * we can play for, so update our play policy.
   */
  async "round:drawTile"(...args) {
    await super["round:drawTile"](...args);
    this.debug();
    this.updatePlayPolicy();
    this.determineDiscard();
  }

  /**
   * Receiving new tiles potentially changes what
   * we can play for, so update our play policy.
   */
  async "round:drawSupplement"(...args) {
    await super["round:drawSupplement"](...args);
    this.debug();
    this.updatePlayPolicy();
  }

  /**
   * Seeing a discard allows for claims, as well as changes
   * the probabilities around getting that tile later on in
   * the game.
   */
  async "round:playerDiscarded"(player, tilenumber) {
    await super["round:playerDiscarded"](player, tilenumber);
    this.debug();
    this.canClaim = true;
    if (player.id !== this.state.id) this.determineWhetherToClaim();
  }

  async "round:playerTookBack"(player, tilenumber) {
    await super["round:playerTookBack"](player, tilenumber);
    this.canClaim = false;
  }

  /**
   * Once we're awarded a claim, we need to figure out what
   * we actually want to discard.
   */
  async "round:claimAwarded"(...args) {
    await super["round:claimAwarded"](...args);
    this.debug();
    this.updatePlayPolicy();
    this.determineDiscard();
  }

  /**
   * This is function in which bots decide what they need to
   * play for; e.g. which tiles to claim for what, and what
   * the expected payoff for that play policy is.
   */
  updatePlayPolicy() {
    // console.log(`${this.state.id}> updating play policy`);

    this.playPolicy = findTilesNeeded(
      this.state.tiles,
      this.state.locked,
      includeChowPairs
    );

    const possiblePlays = this.playPolicy.evaluations;

    this.claimables = [];

    possiblePlays.forEach(play =>
      play.claimable.forEach(claim => {
        let tilenumber = claim.tilenumber;
        if (!this.claimables[tilenumber]) {
          this.claimables[tilenumber] = [];
        }
        this.claimables[tilenumber].push(claim);
      })
    );
  }

  /**
   * Determine which tile to throw away from this hand.
   */
  determineDiscard() {
    let counts = {};
    let winner = false;

    this.playPolicy.evaluations.forEach(e => {
      if (e.winner === true) winner = e;

      e.tiles.forEach(tilenumber => {
        if (!counts[tilenumber]) counts[tilenumber] = 0;
        counts[tilenumber]++;
      });
    });

    // for now, immediately win on a self-drawn win
    if (winner) return this.server.game.declareWin();

    // TODO: we may not want to win if there's a much higher
    //       scoring hand that we can reasonably still play for.

    // if we've not won, turn { 1: 4, 2: 9, ... } into [['2',9], ['1', 4], ...]
    // and then pick the least-useful tile from that list as discard.
    //
    // Or, if we can't find anything that way, pick the first tile in our hand,
    // because we have NO idea what's going on, clearly.
    //
    // TODO: find out when this might happen, because either we've one, or
    //       there should at least be SOME tiles that are not useful in all
    //       possible play paths?
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const tilenumber = sorted.length
      ? parseInt(sorted[0][0])
      : this.state.tiles[0];

    this.discardTile(tilenumber);
  }

  /**
   * Discard with a fake delay to make humans feel part of the game.
   */
  discardTile(tilenumber) {
    const discard = () => this.server.game.discardTile({ tilenumber });
    setTimeout(
      discard,
      this.state.currentGame.config.bot_humanizing_delay.value
    );
  }

  /**
   * This is the function in which bots decide whether or not
   * the current discard is a valid claim target, and if so
   * whether it is worth picking up or not.
   */
  determineWhetherToClaim() {
    // console.log(`${this.state.id}> determining whether to claim`);

    const tilenumber = this.state.currentDiscard.tilenumber;
    const claims = this.claimables[tilenumber];

    // naive play: if we can claim this tile, pick the first
    // claim that we were able to make for it.
    if (claims) {
      let claim = claims[0];
      this.server.game.claim(claim);
    }

    // otherwise pass (with possible delay) to speed up the game.
    else
      setTimeout(() => {
        if (this.canClaim) {
          this.server.game.pass();
        }
      }, this.state.currentGame.config.bot_humanizing_delay.value);
  }
}

module.exports = Bot;
