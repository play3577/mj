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

    playHand(
      this.hand,
      this.players,
      this.wall,
      this.windOfTheRound,
      () => this.startHand()
    );
  };

}
