class Game {
  constructor(players) {
    this.players = players;
  }

  start() {
    let handle = setup(this.players);
    handle.play();
  }
}
