const { legalClaim } = require("../utils/claims.js");

const Wall = require("./wall/wall.js");

const LOG = false;

const CLAIM_VALUES = {
  pair: 1,
  chow1: 1,
  chow2: 1,
  chow3: 1,
  pung: 2,
  kong: 2,
  win: 3
};

const getWindGlyphs = function(pcount) {
  if (pcount === 2) return [`上`, `下`];
  if (pcount === 3) return [`発`, `中`, `白`];
  if (pcount === 4) return [`東`, `南`, `西`, `北`];
  if (pcount === 6) return [`火`, `水`, `木`, `金`, `土`];
  return [`東`, `南`, `西`, `北`, `東`, `南`, `西`, `北`];
};

/**
 * An MJ game typically consists of (at least) 16 rounds,
 * with actual play defined on a per-round basis. The scores
 * persist, but everything else changes, so tracking play
 * as Round objects, rather than through the Game object,
 * makes things a lot easier.
 */
class Round {
  constructor(game, roundNumber = 1) {
    this.config = game.config;
    this.game = game;
    this.rules = game.rules;
    this.roundNumber = roundNumber;
  }

  /**
   * get the round details
   */
  getDetails() {
    return {
      round: this.roundNumber,
      wind: this.windOfTheRound,
      windGlyph: getWindGlyphs(this.players.length)[this.windOfTheRound],
      wall: this.wall ? this.wall.getDetails() : Wall.getDetails()
    };
  }

  /**
   *  Start a round of play
   */
  async start(seat = 0, wotr = 0) {
    this.draw = false;
    this.startingSeat = seat;
    this.currentPlayer = seat;
    this.windOfTheRound = wotr;
    this.players = this.game.players;
    this.setupWall();
    this.assignSeats();

    let details = this.game.getDetails();
    this.players.forEach(p => p.setCurrentPlayer(this.currentPlayer));
    await Promise.all(this.players.map(p => p.startRound(details)));

    this.dealInitialTiles();
    this.waitForReady();
  }

  /**
   * Wait for all players to indicate they are ready for play to
   * start by having the first play tile dealt to the first player.
   */
  waitForReady() {
    const round_start_timeout = this.config.round_start_timeout.value;
    this.waitingForReady = [];
    this.players.forEach(p => p.getReadyForPlay(round_start_timeout));
    this.readyTimeout = setTimeout(() => {
      this.waitingForReady = this.players.map(p => p.id);
      this.startPlay();
    }, round_start_timeout + 500);
  }

  /**
   * Start play by dealing the first time to the first player.
   */
  async startPlay(player = { id: -1 }) {
    const id = player.id;

    if (this.waitingForReady.indexOf(id) === -1) {
      this.waitingForReady.push(id);
    }

    if (LOG)
      console.log(
        `round> startPlay from ${id}, ready length: ${this.waitingForReady.length}`
      );

    if (this.waitingForReady.length >= this.players.length) {
      this.waitingForReady = false;
      clearTimeout(this.readyTimeout);
      this.players.forEach(p => p.playStarted());

      // the game loop on the players' side is "draw one, play one",
      // which translates to a server loop of "deal one, receive one".
      this.dealTile();
    }
  }

  /**
   * Start the next round.
   */
  async startNextRound() {
    if (this.draw) {
      return this.start(this.startingSeat, this.windOfTheRound);
    }

    this.roundNumber++;
    let nextSeat = (this.startingSeat + 1) % this.players.length;
    let wotr = this.windOfTheRound;
    if (nextSeat === 0) wotr++;
    this.start(nextSeat, wotr);
  }

  /**
   * Set up a shuffled 144 tile wall.
   */
  setupWall() {
    this.wall = new Wall(this.config);
  }

  /**
   * Assign seats to all players
   */
  assignSeats() {
    const offset = -this.startingSeat;
    const glyphs = getWindGlyphs(this.players.length);
    const len = this.players.length;
    this.players.forEach((player, seat) => {
      const playerWind = (seat + offset + len) % len;
      player.assignSeat(seat, playerWind, glyphs[playerWind]);
    });
  }

  /**
   * Deal each player their initial tiles.
   */
  dealInitialTiles() {
    this.players.forEach(player => {
      let tiles = this.wall.get(13);
      player.setTiles(tiles);
    });
  }

  /**
   * Deal a tile to the currently active player.
   */
  dealTile() {
    if (LOG) console.log(`round> dealTile`);

    this.currentDiscard = false;
    let tilenumber = this.wall.get();

    // draw due to tile exhaustion?
    if (tilenumber === undefined) {
      this.draw = true;
      return this.game.endOfRound();
    }

    this.players.forEach((player, seat) => {
      player.setCurrentPlayer(this.currentPlayer);
      if (seat === this.currentPlayer) {
        if (LOG)
          console.log(`round> dealing ${tilenumber} to player ${player.id}`);
        player.drawTile(tilenumber);
      }
    });

    this.game.sendUpdate();
  }

  /**
   * Move play on to the next player.
   */
  nextPlayer() {
    this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    this.dealTile();
  }

  /**
   * Notify everyone that a player drew a bonus tile.
   */
  playerDeclaredBonus(player, tilenumber) {
    if (!player.hasTile(tilenumber)) return;
    this.players.forEach(p => p.seeBonus(player, tilenumber));
    tilenumber = this.wall.get();

    // draw due to tile exhaustion?
    if (tilenumber === undefined) {
      this.draw = true;
      return this.game.endOfRound();
    }

    player.drawTile(tilenumber);
  }

  /**
   * Notify everyone that a discard has occurred, and start
   * listening for claims that players may try to make for
   * the discarded tile.
   */
  playerDiscarded(player, tilenumber) {
    if (player.seat !== this.currentPlayer)
      return `out-of-turn discard attempt`;

    if (this.waitingForReady) return `prior-to-play discard attempt`;

    if (this.currentDiscard) return `another discard is already active`;

    if (!player.hasTile(tilenumber))
      return `player does not have this tile to discard`;

    this.currentDiscard = tilenumber;
    this.claims = [];

    if (LOG) console.log(`round> player ${player.id} discarded ${tilenumber}`);

    // inform all clients of this discard
    const claim_timeout = this.config.claim_timeout.value;
    this.players.forEach(p => p.seeDiscard(player, tilenumber, claim_timeout));

    // start a claim timer. When it expires,
    // move to the next player if no claims
    // have been made. Otherwise, honour the
    // highest ranking claim.
    this.claimTimer = setTimeout(() => {
      if (LOG) console.log(`round> claim timer ran out`);
      this.handleClaims();
    }, claim_timeout + 500);
  }

  /**
   * Check that a discard can be taken back, and either
   * allow that and notify all players, or disallow it
   * and notify the active player only.
   */
  undoDiscard(player) {
    if (player.seat !== this.currentPlayer) return `not discarding player`;

    if (this.claims.filter(v => v.claimtype).length)
      return `discard is already claimed`;

    clearTimeout(this.claimTimer);
    this.players.forEach(p => p.undoDiscard(player, this.currentDiscard));
    this.currentDiscard = false;
  }

  /**
   * Notify all players that a player passed on the current discard.
   */
  playerPasses(player) {
    if (LOG) console.log(`round> player ${player.id} passes on this discard`);
    let seat = player.seat;
    if (this.claims[seat] === undefined) {
      this.claims[seat] = {};
      this.players.forEach(p => p.passed(player));
      this.tryToResolveClaims();
    }
  }

  /**
   * Receive a claim on the current discard from a player.
   */
  playerClaim(player, claimtype, wintype) {
    let seat = player.seat;
    if (LOG)
      console.log(
        `round> player ${player.id} wants to claim this discard for a ${claimtype}.`
      );
    const maychow = seat === (this.currentPlayer + 1) % this.players.length;

    // if this is not a legal claim, pass the player over.
    if (claimtype.indexOf(`chow`) === 0 && !maychow) {
      return this.playerPasses(player);
    }

    this.claims[seat] = {
      player,
      claimtype,
      wintype,
      maychow
    };

    this.tryToResolveClaims();
  }

  /**
   * Check if we can resolve claims because all other players have
   * either passed or made a claim. This will shortcircuit the claim
   * timeout if allowed through.
   */
  tryToResolveClaims() {
    const count = this.claims.filter(c => c).length;
    const required = this.players.length - 1;

    if (LOG)
      console.log(
        `round> received ${count} claim/passes, ${required} required`
      );

    if (count === required) {
      this.handleClaims();
    }
  }

  /**
   * Process all received claims, awarding the highest "bidder".
   */
  handleClaims() {
    if (LOG) console.log(`round> handling pending claims.`);

    clearTimeout(this.claimTimer);

    // throw away any passes and "didn't pass or claim" entries.
    let claims = this.claims.filter(c => c && c.claimtype);

    // if there are no claims, just move on to the next player.
    if (!claims.length) {
      if (LOG)
        console.log(`round> there are no claims, moving to next player.`);
      return this.nextPlayer();
    }

    // first, filter out any illegal claim and then
    // sort claims based on standard claim precedence.
    claims
      .filter(claim =>
        legalClaim(
          claim.claimtype,
          claim.wintype,
          this.currentDiscard,
          claim.player.tiles,
          claim.player.locked,
          claim.maychow
        )
      )
      .sort((a, b) => CLAIM_VALUES[b.claimtype] - CLAIM_VALUES[a.claimtype]);
    // TODO: check whether multiple "win" claims resolve correctly

    // Award the claim
    const claim = claims[0];
    const award = {
      id: claim.player.id,
      seat: claim.player.seat,
      claimtype: claim.claimtype,
      wintype: claim.wintype,
      tilenumber: this.currentDiscard
    };
    this.players.forEach(p => p.claimAwarded(award));

    if (LOG)
      console.log(
        `round> a ${award.claimtype} claim was awarded to ${award.id}.`
      );

    // if a kong was declared, make sure that player receives a supplement tile.
    if (claim.claimtype === `kong`) {
      claim.player.drawSupplement(this.wall.get());
    }

    // And if a win was declared... well!
    if (claim.claimtype === `win`) {
      return this.declareWin(award);
    }

    // Move active play to the claiming player
    this.currentPlayer = claim.player.seat;
    this.currentDiscard = false;
    this.game.sendUpdate();
  }

  /**
   * A player has won! Notify everyone.
   */
  async declareWin({ id, seat }) {
    // figure out how the scores change

    const eastSeat = 0; // TODO: figure out real east player
    const discardSeat =
      this.id === this.currentPlayer ? false : this.currentPlayer;
    const points = this.players.map(p =>
      this.rules.score(p, this.wind, this.wotr, p.id === id)
    );
    const scores = this.rules.pointsToScores(
      points,
      seat,
      eastSeat,
      discardSeat
    );
    this.players.forEach(p => p.processScore(scores));

    // then communicate the updated game and win information
    let details = this.game.getDetails();
    details.round = this.roundNumber;
    details.result = { id, seat };
    details.wininfo = { points, scores };
    this.players.forEach(p => p.roundWon(details));

    // And signal the end of the round, separately.
    this.game.endOfRound(details);

    // TODO: add a timeout between declaring a winner,
    //       and then revealing the scores.
  }
}

Round.getDetails = function() {
  return {
    round: "",
    wind: "",
    windGlyph: "",
    wall: Wall.getDetails()
  };
};

module.exports = Round;
