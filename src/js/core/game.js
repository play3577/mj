// once all functions have been merged in, this can become an instance variable:
PLAY_START = 0;

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

    let start = preparePlay(
      this.hand,
      this.players,
      this.wall,
      this.windOfTheRound,
      () => this.startHand()
    );

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
}
