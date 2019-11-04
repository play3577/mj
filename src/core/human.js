const Bot = require("./bot.js");

/**
 * There really isn't anything special here,
 * other than creating a bot that pretends
 * not to be a bot (which, because of how JS
 * works... it genuinely isn't).
 */
class Human extends Bot {
    constructor() {
        super();
        this.toGameClient();
    }
}

module.exports = Human;
