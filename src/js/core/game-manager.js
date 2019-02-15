class GameManager {
  constructor() {
    this.players = [
      new BotPlayer(0),
      new BotPlayer(1),
      new HumanPlayer(2),
      new BotPlayer(3),
    ];
  }

  create() {
    return new Game(this.players);
  }
}
