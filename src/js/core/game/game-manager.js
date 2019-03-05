/**
 * Nothing fancy here. Just a Game object builder.
 */
class GameManager {
  constructor() {
    this.gameBoard = document.querySelector('.board');
    this.players = [
      new HumanPlayer(0),
      new BotPlayer(1),
      new BotPlayer(2),
      new BotPlayer(3),
    ];

    if (config.FORCE_OPEN_BOT_PLAY || config.DEBUG) {
      window.players = this.players;
    }
  }

  /**
   * Create a game, with document blur/focus event handling
   * bound to game pause/resume functionality.
   */
  create() {
    let game = new Game(this.players);
    if (config.PAUSE_ON_BLUR) {

      this.gameBoard.addEventListener('blur', evt => {
        let resume = game.pause();
        let handleResume = () => {
          this.gameBoard.removeEventListener('focus', handleResume);
          resume();
        };
        this.gameBoard.addEventListener('focus', handleResume);
      });

    }
    this.gameBoard.focus();
    return game;
  }
}