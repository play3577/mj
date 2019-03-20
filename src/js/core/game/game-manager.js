if (typeof process !== "undefined") {
  HumanPlayer = require('../players/human.js');
  BotPlayer = require('../players/bot.js');
  Game = require('./game.js');
}


/**
 * Nothing fancy here. Just a Game object builder.
 */
class GameManager {
  constructor(players) {
    this.gameBoard = document.querySelector('.board');
    this.players = players || [
      new HumanPlayer(0, config.WALL_HACK),
      new BotPlayer(1, config.WALL_HACK),
      new BotPlayer(2, config.WALL_HACK),
      new BotPlayer(3, config.WALL_HACK),
    ];

    if (config.FORCE_OPEN_BOT_PLAY || config.DEBUG) {
      window.players = this.players;
    }
  }

  /**
   * Create a game, with document blur/focus event handling
   * bound to game pause/resume functionality.
   */
  newGame() {
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

if (typeof process !== "undefined") {
  module.exports = GameManager;
}
