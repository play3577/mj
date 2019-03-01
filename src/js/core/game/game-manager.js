/**
 * Nothing fancy here. Just a Game object builder.
 */
class GameManager {
  constructor() {
    this.players = [
      new HumanPlayer(0),
      new BotPlayer(1),
      new BotPlayer(2),
      new BotPlayer(3),
    ];
  }

  /**
   * Create a game, with document blur/focus event handling
   * bound to game pause/resume functionality.
   */
  create() {
    let game = new Game(this.players);
    if (config.PAUSE_ON_BLUR) {
      document.addEventListener('blur', evt => game.pause());
      document.addEventListener('focus', evt => game.resume());
    }
    return game;
  }
}
