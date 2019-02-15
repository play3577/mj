/**
 * This class models an entire game.
 */
class Game {
  constructor(players) {
    this.players = players;
    this.wall = new Wall();
  }

  startGame() {
    this.wind = 0;
    this.windOfTheRound = 0;
    this.hand = 0;
    this.draws = 0;
    this.startHand();
  }

  // A function that triggers the s hand's play.
  // Unless the game is over because we've played
  // enough rounds to rotate the winds fully.
  startHand(result = {}) {
    let pre = result.draw ? 'Res' : 'S';
    let players = this.players;

    if (result.winner) {
      // only rotate the winds if the winner is not East
      let winner = result.winner;
      if (winner.wind !== 0) {
        this.wind++;
        if (this.wind === 4) {
          this.wind = 0;
          this.windOfTheRound++;
          if (this.windOfTheRound === 4) {
            Logger.log(`\nfull game played.`);
            this.hand = this.draws = '';
            rotateWinds();
            let finalScores = players.map(p => p.getScore());
            players.forEach(p => p.endOfGame(finalScores));
            return;
          }
        }
      } else Logger.debug(`Winner player was East, winds will not rotate.`);
    }

    if (!result.draw) {
      this.hand++;
      this.draws = 0;
    } else this.draws++;

    Logger.log(`\n${pre}tarting hand ${this.hand}.`); // Starting hand / Restarting hand
    Logger.debug("Rotated winds:", this.wind, this.windOfTheRound);
    rotateWinds(this.wind, this.windOfTheRound, this.hand, this.draws);

    this.wall.reset();
    this.players.forEach((player,p) => {
      // Player winds have to rotate in the opposite direction as the winds do.
      let playerWind = (4 + this.wind - p) % 4;
      player.reset(this.hand, playerWind, this.windOfTheRound);
    });

    // used for play debugging:
    if (config.PAUSE_ON_HAND && hand === config.PAUSE_ON_HAND) {
      config.HAND_INTERVAL = 60 * 60 * 1000;
    }

    this.PLAY_START = Date.now();

    this.dealTiles();
    this.preparePlay();
    this.play();
  }

  /**
   * Dealing tiles means getting each player 13 play tiles,
   * with any bonus tiles replaced by normal tiles.
   */
  dealTiles() {
    let wall = this.wall;
    let players = this.players;

    players.forEach(player => {
      let bank = wall.get(13);
      for (let t=0, tile; t<bank.length; t++) {
        tile = bank[t];
        players.forEach(p => p.receivedTile(player));
        let revealed = player.append(tile);
        if (revealed) {
          // bonus tile are shown to all other players.
          players.forEach(p => p.see(revealed, player));
          bank.push(wall.get());
        }

        // process kong declaration
        let kong = player.checkKong(tile);
        if (kong) {
          Logger.debug(`${player.id} plays self-drawn kong ${kong[0].dataset.tile} during initial tile dealing`);
          players.forEach(p => p.seeKong(kong, player));
          bank.push(wall.get());
        }

        // At this point, a player should be able to decide whether or not to
        // declare any kongs they might have in their hand. While unlikely, it
        // is entirely possible for this to lead to a player declaring four
        // kongs before play has even started. We will add this in later.
        //
        // Note that this also affects client-ui.js!
      }
    });
  }

  /**
   * Set up and run the main game loop.
   */
  preparePlay() {
    this.currentPlayerId = (this.wind % 4);
    this.discard = undefined;
    this.counter = 0;
    this.players.forEach(p => p.handWillStart());
  }

  /**
   * The actual main game loop.
   */
  async play(claim) {
    let hand = this.hand;
    let players = this.players;
    let wall = this.wall;

    if (claim) this.currentPlayerId = claim.p;

    let discard = this.discard;
    let currentPlayerId = this.currentPlayerId;
    let player = players[currentPlayerId];
    players.forEach(p => p.activate(currentPlayerId));

    // increase the play counter;
    this.counter++;
    this.playDelay = (hand===config.PAUSE_ON_HAND && this.counter===config.PAUSE_ON_PLAY) ? 60*60*1000 : config.PLAY_INTERVAL;
    Logger.debug(`hand ${hand}, play ${this.counter}`);

    // "Draw one"
    if (!claim) this.dealTile(player);
    else {
      let tiles = player.receiveDiscardForClaim(claim, discard);

      // Awarded claims are shown to all other players.
      players.forEach(p => p.seeClaim(tiles, player, discard, claim));

      // If the player locks away a total of 4 tiles,
      // they need a supplement tile.
      if (tiles.length === 4) this.dealTile(player);
    }

    // "Play one"
    if (discard) discard.classList.remove('discard');
    discard = this.discard = await new Promise(resolve => player.getDiscard(resolve));

    // Did anyone win?
    if (!discard) return this.processWin(player);

    // No winner - process the discard.
    this.processDiscard(player);

    // Does someone want to claim this discard?
    claim = await this.getAllClaims(); // players take note of the fact that a discard happened as part of their determineClaim()
    if (claim) return this.processClaim(player, claim);

    // No claims: have we run out of tiles?
    if (wall.dead) {
      Logger.log(`Hand ${hand} is a draw.`);
      players.forEach(p => p.endOfHand());
      return setTimeout(() => this.startHand({ draw: true }), this.playDelay);
    }

    // Nothing of note happened: game on.
    players.forEach(p => p.nextPlayer());
    this.currentPlayerId = (this.currentPlayerId + 1) % 4;

    return setTimeout(() => {player.disable(); this.play();}, this.playDelay);
  }

  // shorthand function to wrap the do/while loop.
  dealTile(player) {
    let tile, wall = this.wall;
    do {
      tile = wall.get();
      this.dealTileToPlayer(player, tile);
    } while (tile>33 && !wall.dead);
    return wall.dead;
  }

  /**
   * At the start of a player's turn, deal them a tile. This
   * might actually turn into several tiles, as bonus tiles and
   * tiles that form kongs may require a supplement tile being
   * dealt to that player. And of course, that supplement can
   * also be a bonus or kong tile.
   */
  dealTileToPlayer(player, tile) {
    let players = this.players;

    Logger.debug(`${player.id} was given tile ${tile}`);
    Logger.debug(`dealing ${tile} to player ${player.id}`);

    let revealed = player.append(tile);
    players.forEach(p => p.receivedTile(player));

    // bonus tile are shown to all other players.
    if (revealed) players.forEach(p => p.see(revealed, player));

    // if a played got a kong, and declared it, notify all
    // other players and issue a supplement tile.
    let kong = player.checkKong(tile);
    if (kong) {
      Logger.debug(`${player.id} plays self-drawn kong ${kong[0].dataset.tile} during play`);
      players.forEach(p => p.seeKong(kong, player));
      Logger.debug(`Dealing ${player.id} a supplement tile.`);
      this.dealTile(player);
    }
  }

  /**
   * Handle a discard and let all players know that discard occurred.
   */
  processDiscard(player) {
    let discard = this.discard;
    Logger.debug(`${player.id} discarded ${discard.dataset.tile}`);
    player.removeDiscard(discard);
    discard.dataset.from = player.id;
    delete discard.dataset.hidden;
    this.players.forEach(p => p.playerDiscarded(player, discard));
  }

  /**
   * Ask all players to stake a claim on a discard, and pause
   * general game logic until each player has either indicated
   * they are not intereted, or what they are interested in it for.
   *
   * If there are multiple claims, the highest valued claim wins.
   */
  async getAllClaims() {
    let players = this.players;
    let currentpid = this.currentPlayerId;
    let discard = this.discard;

    // get all players to put in a claim bid
    let claims = await Promise.all(
      players.map(p => new Promise(resolve => p.getClaim(currentpid, discard, resolve)))
    );

    let claim = CLAIM.IGNORE;
    let win = undefined;
    let p = -1;

    // Who wins the bidding war?
    claims.forEach((c,pid)=> {
      if (c.claimtype > claim) {
        claim = c.claimtype;
        win = c.wintype ? c.wintype : undefined;
        p = pid;
      }
    });

    return p === -1 ? undefined : { claimtype: claim, wintype: win, p };
  }

  /**
   * Handle a claim on a discard. Note that the actual "awarding"
   * of the claim happens in the play loop, where the fact that
   * play started with a pending claim means that instead of tile
   * being drawn, the player "draws" the discard tile instead.
   */
  processClaim(player, claim) {
    let discard = this.discard;
    Logger.debug(`${claim.p} wants ${discard.dataset.tile} for ${claim.claimtype}`);
    player.disable();
    setTimeout(() => this.play(claim), this.playDelay);
  }

  /**
   * Once a plyer has won, process that win in terms of scoring and
   * letting everyone know what the result of the hand is.
   */
  processWin(player) {
    let hand = this.hand;
    let players = this.players;
    let currentPlayerId = this.currentPlayerId;
    let windOfTheRound = this.windOfTheRound;

    player.winner();

    let play_length = (Date.now() - this.PLAY_START);
    Logger.log(`Player ${currentPlayerId} wins round ${hand}! (game took ${play_length}ms)`);

    // Let everyone know what everyone had. It's the nice thing to do.
    let disclosure = players.map(p => p.getDisclosure());
    players.forEach(p => p.endOfHand(disclosure));

    // And calculate the scores.
    let scores = disclosure.map((d,id) => scoreTiles(d, id, windOfTheRound));
    let adjustments = settleScores(scores, player.id);
    players.forEach(p => p.recordScores(adjustments));

    // Show the score line, and the move on to the next hand.
    scores[player.id].winner = true;
    modal.setScores(hand, scores, adjustments, () => {
      this.startHand({ winner: player });
    });
  }
}
