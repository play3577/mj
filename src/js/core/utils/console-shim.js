if (typeof process !== "undefined") {
    __console = console;
    config = require("../../../config.js");
}

const consoleProxy = {
    debug(...args) {
        if(config.DEBUG) {  __console.debug(...args); }
    },

    log(...args) {
        __console.log(...args);
    }
}

if (typeof process !== "undefined") {
    module.exports = consoleProxy;
}
