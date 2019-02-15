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
    this.hand = 0;
    this.startHand();
  }

  // A function that triggers the s hand's play.
  // Unless the game is over because we've played
  // enough rounds to rotate the winds fully.
  startHand(result) {
    let pre = 'S';

    if (result) {
      pre = result.draw ? 'Res' : pre;
      if (result.winner) {
        let shuffles = rotateWinds();
        if (hand !== shuffles) hand = shuffles;
      }
      if (!result.draw && hand > 16) {
        hand = '';
        Logger.log(`\nfull game played.`);
        let scores = players.map(p => p.getScore());
        players.forEach(p => p.endOfGame(scores));
        return;
      }
    }

    this.hand++;
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

    let start = this.preparePlay();

    start();
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
    let hand = this.hand;
    let players = this.players;
    let wall = this.wall;
    let windOfTheRound = this.windOfTheRound;
    let next = () => this.startHand();

    let currentPlayerId = 2;
    let discard = undefined;
    let counter = 0;

    // Game loop function:
    let play = async (claim) => {

      if (claim) currentPlayerId = claim.p;
      let player = players[currentPlayerId];
      players.forEach(p => p.activate(player.id));

      // increase the play counter;
      counter++;
      playDelay = (hand===config.PAUSE_ON_HAND && counter===config.PAUSE_ON_PLAY) ? 60*60*1000 : config.PLAY_INTERVAL;
      Logger.debug(`hand ${hand}, play ${counter}`);

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
      discard = await new Promise(resolve => player.getDiscard(resolve));

      // Did anyone win?
      if (!discard) return processWin(player, hand, players, currentPlayerId, windOfTheRound, next);

      // No winner - process the discard.
      processDiscard(player, discard, players);

      // Does someone want to claim this discard?
      claim = await getAllClaims(players, currentPlayerId, discard); // players take note of the fact that a discard happened as part of their determineClaim()
      if (claim) return processClaim(player, claim, discard, () => play(claim));

      // No claims: have we run out of tiles?
      if (wall.dead) {
        Logger.log(`Hand ${hand} is a draw.`);
        players.forEach(p => p.endOfHand());
        return setTimeout(() => next({ draw: true }), playDelay);
      }

      // Nothing of note happened: game on.
      players.forEach(p => p.nextPlayer());
      currentPlayerId = (currentPlayerId + 1) % 4;
      return setTimeout(() => {player.disable(); play();}, playDelay);
    };

    return play;
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
