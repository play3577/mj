if (typeof process !== "undefined") {
  // shortcut if this wasn't our own invocation
  let path = require('path');
  let invocation = process.argv.join(' ');
  let filename = path.basename(__filename)
  if (invocation.indexOf(filename) === -1) return;

  // bootstrap the config for testing
  var config = require('../../config.js');
  config.PLAY_INTERVAL = 0;
  config.HAND_INTERVAL = 0;
  config.PRNG.seed(1);

  // Play a full game!
  var GameManager = require('../core/game/game-manager.js');
  var gm = new GameManager([0,1,2,3].map(id => new BotPlayer(id)));
  var game = gm.newGame();
  game.startGame(() => {
    let players = game.players;
    let scores = game.scoreHistory;
    console.log(`final scores:`);
    console.log(players.map(p => `${p.id}: ${p._score} (${!p.personality.chicken ? `not `: ``}chicken)`).join('\n'));
  });
}
