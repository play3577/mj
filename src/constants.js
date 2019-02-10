if(typeof process !== "undefined") {
    Random = require('./js/prng.js');
}

const SEED = 0; //790579740; //28238738; //1822967933; //28238738;
const PRNG = new Random(SEED);

var BOT_PLAY = false; // can be changed at page start!

const CLAIM_INTERVAL = 5000;
const PLAY_INTERVAL = 100;
const TURN_INTERVAL = 3000;
const ARTIFICIAL_HUMAN_DELAY = 0;
const LOSERS_SETTLE_SCORES = true;

const LOW_TO_HIGH = (a,b) => { a = a.score; b = b.score; return a - b; };
const SORT_TILE_FN = (a,b) => {
    a = a.getTileFace();
    b = b.getTileFace();
    if (a===-1) return 1;
    if (b===-1) return -1;
    return a - b;
}

const CLAIM = {
    IGNORE: 0,
    PAIR: 1,
    CHOW: 2,
    CHOW1: 4, // first tile in pattern: X**
    CHOW2: 5, // middle tile in pattern: *X*
    CHOW3: 6, // last time in pattern: **X
    PUNG: 8,
    KONG: 16,
    WIN: 32
};

function convertSubtypeToClaim(diff) {
    if(diff === -1) return CLAIM.CHOW3;
    if(diff === 1) return CLAIM.CHOW2;
    if(diff === 2) return CLAIM.CHOW1;
    return diff;
}

const Constants = {
    PAIR: CLAIM.PAIR,
    CHOW: CLAIM.CHOW,
    CHOW1: CLAIM.CHOW1,
    CHOW2: CLAIM.CHOW2,
    CHOW3: CLAIM.CHOW3,
    PUNG: CLAIM.PUNG,
    KONG: CLAIM.KONG,
    WIN: CLAIM.WIN
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { CLAIM, Constants };
}
