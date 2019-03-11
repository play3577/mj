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
    let history = game.scoreHistory;
    const mapfn = t => config.TILE_GLYPHS[t.dataset ? t.dataset.tile : t];

    console.log();
    history.forEach((entry,hand) => {
      console.log(`hand ${hand+1}`);
      config.log(`hand ${hand+1}`);
      entry.disclosure.forEach((data,pid) => {
        let concealed = data.concealed.sort().map(mapfn).join(',');
        let locked = data.locked.map(set => set.map(mapfn)).join(', ')
        let bonus = data.bonus.map(mapfn).join(',');
        let pattern = `${concealed.length ? `${concealed} ` : ``}${locked.length ? `[${locked}] ` : ``}${bonus.length ? `(${bonus})` : ``}`;
        let message = `  ${pid} (${['E','S','W','N'][data.wind]}): ${entry.adjustments[pid]} for ${pattern}`;
        console.log(message);
        config.log(message);
      });
    });

    console.log(`final scores:`);
    config.log(`final scores:`);

    players.forEach(p => {
      let message = `  player ${p.id}: ${p._score} (${!p.personality.chicken ? `not `: ``}set to chicken)`;
      console.log(message);
      config.log(message);
    });

    config.flushLog();
  });
}
