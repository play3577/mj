/**
 * This class models an entire game.
 */
class Game {
  constructor(players) {
    this.players = players;
    this.rules = Ruleset.getRuleset("Chinese Classical");
    this.players.forEach(p => p.setRules(this.rules));
    this.wall = new Wall(players);
    this.scoreHistory = [];
  }

  startGame() {
    playClip('start');
    document.body.classList.remove(`finished`);
    this.GAME_START = Date.now();
    this.wind = 0;
    this.windOfTheRound = 0;
    this.hand = 0;
    this.draws = 0;
    this.startHand();
  }

  // A function that triggers the s hand's play.
  // Unless the game is over because we've played
  // enough rounds to rotate the winds fully.
  async startHand(result = {}) {
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
            let ms = (Date.now() - this.GAME_START);
            let s = ((ms/10)|0)/100;
            console.log(`\nfull game played. (game took ${s}s)`);
            this.hand = this.draws = '';
            rotateWinds();
            let finalScores = players.map(p => p.getScore());
            players.forEach(p => p.endOfGame(finalScores));
            document.body.classList.add('finished');
            return playClip('end');
          }
        }
      } else console.debug(`Winner player was East, winds will not rotate.`);
    }

    if (!result.draw) {
      this.hand++;
      this.draws = 0;
    } else {
      this.draws++;
      playClip('draw');
    }

    console.log(`\n%c${pre}tarting hand ${this.hand}.`, `color: red; font-weight: bold; font-size: 120%; border-bottom: 1px solid black;`); // Starting hand / Restarting hand
    console.debug("Rotated winds:", this.wind, this.windOfTheRound);
    rotateWinds(this.wind, this.windOfTheRound, this.hand, this.draws);

    this.wall.reset();
    this.players.forEach((player,p) => {
      // Player winds have to rotate in the opposite direction as the winds do.
      let playerWind = (4 + this.wind - p) % 4;
      player.reset(this.hand, playerWind, this.windOfTheRound);
    });

    // used for play debugging:
    if (config.PAUSE_ON_HAND && this.hand === config.PAUSE_ON_HAND) {
      config.HAND_INTERVAL = 60 * 60 * 1000;
    }

    this.PLAY_START = Date.now();

    await this.dealTiles();
    await this.preparePlay(this.draws > 0);
    this.play();
  }

  /**
   * Resolve kongs in hand for as long as necessary.
   */
  async resolveKongs(player, resolve) {
    let players = this.players;
    let kong;
    do {
      kong = await player.checkKong();
      if (kong) {
        console.debug(`${player.id} plays kong ${kong[0].dataset.tile} during initial tile dealing`);
        players.forEach(p => p.seeKong(kong, player));
        // deal supplement tile(s) for as long as necessary
        let revealed = false;
        do {
          let tile = this.wall.get();
          players.forEach(p => p.receivedTile(player));
          revealed = player.append(tile);
          if (revealed) players.forEach(p => p.see(revealed, player));
        } while (revealed);
      }
    } while (kong);

    resolve();
  }

  /**
   * Dealing tiles means getting each player 13 play tiles,
   * with any bonus tiles replaced by normal tiles.
   */
  async dealTiles() {
    let wall = this.wall;
    let players = this.players;

    let runDeal = async (player, resolve) => {
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
      }

      resolve();
    };

    return Promise.all([
      new Promise(resolve => runDeal(players[0], resolve)),
      new Promise(resolve => runDeal(players[1], resolve)),
      new Promise(resolve => runDeal(players[2], resolve)),
      new Promise(resolve => runDeal(players[3], resolve)),
    ]);
  }

  /**
   * Set up and run the main game loop.
   */
  async preparePlay(redraw) {
    this.currentPlayerId = (this.wind % 4);
    this.discard = undefined;
    this.counter = 0;

    let players = this.players;

    // wait for "ready" from each player
    await Promise.all([
      new Promise(resolve => players[0].handWillStart(redraw, resolve)),
      new Promise(resolve => players[1].handWillStart(redraw, resolve)),
      new Promise(resolve => players[2].handWillStart(redraw, resolve)),
      new Promise(resolve => players[3].handWillStart(redraw, resolve)),
    ]);

    // resolve kongs for each player
    await Promise.all([
      new Promise(resolve => this.resolveKongs(players[0], resolve)),
      new Promise(resolve => this.resolveKongs(players[1], resolve)),
      new Promise(resolve => this.resolveKongs(players[2], resolve)),
      new Promise(resolve => this.resolveKongs(players[3], resolve)),
    ]);
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
    if (config.DEBUG) console.log(`%chand ${hand}, play ${this.counter}`, `color: red; font-weight: bold;`);

    // "Draw one"
    if (!claim) this.dealTile(player);
    else {
      let tiles = player.receiveDiscardForClaim(claim, discard);
      playClip(tiles.length===4 ? 'kong' : 'multi');

      // Awarded claims are shown to all other players.
      players.forEach(p => p.seeClaim(tiles, player, discard, claim));

      // If the player locks away a total of 4 tiles,
      // they need a supplement tile.
      if (tiles.length === 4) this.dealTile(player);
    }

    // "Play one"
    do {
      if (discard) discard.classList.remove('discard');

      discard = this.discard = await new Promise(resolve => player.getDiscard(resolve));

      // Did anyone win?
      if (!discard) {
        return this.processWin(player);
      }

      // no winner, but did this player declare/meld a kong?
      if (discard.exception === CLAIM.KONG) {
        let kong = discard.kong;
        let melded = (kong.length === 1);

        console.debug(`${player.id} ${melded ? `melds`:`plays`} kong ${kong}`);
        players.forEach(p => p.seeKong(kong, player, melded));

        // deal supplement tile(s) for as long as necessary
        let revealed = false;
        do {
          let tile = wall.get();
          players.forEach(p => p.receivedTile(player));
          revealed = player.append(tile);
          if (revealed) players.forEach(p => p.see(revealed, player));
        } while (revealed);

        // Then set the discard to `false` so that we enter the
        // "waiting for discard from player" state again.
        discard = false;
      }
    } while (!discard); // note: we exit the function on a "no discard" win.

    // No winner - process the discard.
    this.processDiscard(player);

    // Does someone want to claim this discard?
    claim = await this.getAllClaims(); // players take note of the fact that a discard happened as part of their determineClaim()
    if (claim) return this.processClaim(player, claim);

    // No claims: have we run out of tiles?
    if (wall.dead) {
      console.log(`Hand ${hand} is a draw.`);
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
  async dealTileToPlayer(player, tile) {
    let players = this.players;

    console.debug(`${player.id} was given tile ${tile}`);
    console.debug(`dealing ${tile} to player ${player.id}`);

    let revealed = player.append(tile);
    players.forEach(p => p.receivedTile(player));

    // bonus tile are shown to all other players.
    if (revealed) players.forEach(p => p.see(revealed, player));

    // if a played got a kong, and declared it, notify all
    // other players and issue a supplement tile.
    let kong = await player.checkKong(tile);
    if (kong) {
      console.debug(`${player.id} plays self-drawn kong ${kong[0].dataset.tile} during play`);
      players.forEach(p => p.seeKong(kong, player));
      console.debug(`Dealing ${player.id} a supplement tile.`);
      this.dealTile(player);
    }
  }

  /**
   * Handle a discard and let all players know that discard occurred.
   */
  processDiscard(player) {
    playClip(this.counter===1 ? 'thud' : 'click');
    let discard = this.discard;
    console.debug(`${player.id} discarded ${discard.dataset.tile}`);
    player.remove(discard);
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

    // artificial delay, if required for human play
    if (currentpid===0 && !config.BOT_PLAY && config.BOT_DELAY_BEFORE_DISCARD_ENDS) {
      await new Promise( resolve => {
        setTimeout(() => resolve(), config.BOT_DELAY_BEFORE_DISCARD_ENDS);
      });
    }

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
    console.debug(`${claim.p} wants ${discard.dataset.tile} for ${claim.claimtype}`);
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

    player.markWinner();

    let play_length = (Date.now() - this.PLAY_START);
    console.log(`Player ${currentPlayerId} wins hand ${hand}! (hand took ${play_length}ms)`);

    // Let everyone know what everyone had. It's the nice thing to do.
    let disclosure = players.map(p => p.getDisclosure());
    players.forEach(p => p.endOfHand(disclosure));

    // And calculate the scores.
    let scores = disclosure.map((d,id) => this.rules.scoreTiles(d, id, windOfTheRound, this.wall.remaining));

    // check who is currently playing east and calculate payments
    let eastid = 0;
    players.forEach(p => { if(p.wind === 0) eastid = p.id; });
    let adjustments = this.rules.settleScores(scores, player.id, eastid);
    players.forEach(p => p.recordScores(adjustments));

    // Before we move on, record this step in the game.
    this.scoreHistory.push({ disclosure, scores, adjustments });

    // Show the score line, and the move on to the next hand.
    scores[player.id].winner = true;
    modal.setScores(hand, scores, adjustments, () => {
      this.startHand({ winner: player });
    });
    playClip('win');
  }
}
