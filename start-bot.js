// First, bootstrap the ClientServer object:
const { generateClientServer } = require("socketless");

const ClientServer = generateClientServer(
  require("./src/core/bot.js"),
  require("./src/core/server.js")
);

// And then build a bot
const gameName = process.argv[2];
const bot = ClientServer.createClient(`http://localhost:8080`);

bot.onConnect = () => {
  bot.server.game.join(gameName);
}
