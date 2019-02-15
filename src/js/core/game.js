// once all functions have been merged in,
// these values can become instance variables

PLAY_START = 0;
playDelay = config.PLAY_INTERVAL;


class Game {
  constructor(players) {
    this.players = players;
  }

  startGame() {
    this.wall = new Wall();
    this.hand = 1;
    this.startHand();
  }

  // A function that triggers the s hand's play.
  // Unless the game is over because we've played
  // enough rounds to rotate the winds fully.
  startHand(result = {}) {
    let pre = result.draw ? 'Res' : 'S';
    let players = this.players;

    if (result.winner) {
      // FIXME: this should be controlled by the game, with the
      //        rotator being _told_ what to do. Not the other
      //        way around.
      let shuffles = rotateWinds();
      if (this.hand !== shuffles) this.hand = shuffles;
    }

    if (!result.draw && this.hand > 16) {
      this.hand = '';
      Logger.log(`\nfull game played.`);
      let scores = players.map(p => p.getScore());
      players.forEach(p => p.endOfGame(scores));
      return;
    }

    this.windOfTheRound = ((this.hand/4)|0);
    this.wall.reset();
    this.players.forEach(player => player.reset());

    Logger.log(`\n${pre}tarting hand ${this.hand}.`); // Starting hand / Restarting hand

    // used for play debugging:
    if (config.PAUSE_ON_HAND && hand === config.PAUSE_ON_HAND) {
      config.HAND_INTERVAL = 60 * 60 * 1000;
    }

    PLAY_START = Date.now();

    this.dealTiles();

    this.players.forEach(p => p.handWillStart());

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
      player.markHand(this.hand);
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
    this.currentPlayerId = 2;
    this.discard = undefined;
    this.counter = 0;
  }

  /**
   * The actual main game loop.
   */
  async play(claim) {
    let hand = this.hand;
    let players = this.players;
    let wall = this.wall;
    let windOfTheRound = this.windOfTheRound;

    if (claim) this.currentPlayerId = claim.p;

    let discard = this.discard;
    let currentPlayerId = this.currentPlayerId;
    let player = players[currentPlayerId];
    players.forEach(p => p.activate(currentPlayerId));

    // increase the play counter;
    this.counter++;
    playDelay = (hand===config.PAUSE_ON_HAND && this.counter===config.PAUSE_ON_PLAY) ? 60*60*1000 : config.PLAY_INTERVAL;
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
    if (!discard) return processWin(
      player,
      hand,
      players,
      currentPlayerId,
      windOfTheRound,
      result => this.startHand(result)
    );

    // No winner - process the discard.
    processDiscard(player, discard, players);

    // Does someone want to claim this discard?
    claim = await getAllClaims(players, currentPlayerId, discard); // players take note of the fact that a discard happened as part of their determineClaim()
    if (claim) return processClaim(player, claim, discard, () => this.play(claim));

    // No claims: have we run out of tiles?
    if (wall.dead) {
      Logger.log(`Hand ${hand} is a draw.`);
      players.forEach(p => p.endOfHand());
      return setTimeout(() => this.startHand({ draw: true }), playDelay);
    }

    // Nothing of note happened: game on.
    players.forEach(p => p.nextPlayer());
    this.currentPlayerId = (this.currentPlayerId + 1) % 4;

    return setTimeout(() => {
      player.disable();
      this.play();
    }, playDelay);
  }

  // shorthand function to wrap the do/while loop.
  dealTile(player) {
    let wall = this.wall;
    let next = () => this.dealTile(player);
    let tile;
    do {
      tile = wall.get();
      dealTileToPlayer(player, tile, this.players, next);
    } while (tile>33 && !wall.dead);
    return wall.dead;
  }

}
