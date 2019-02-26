/**
 *
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
   *
   */
  create() {
    return new Game(this.players);
  }
}
