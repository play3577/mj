if (typeof process !== "undefined") Random = require('./js/core/utils/prng.js');

/**
 * We're using a javascript config, not a
 * JSON config, because JSON doesn't allow
 * comments, and a config that can't document
 * itself is a thoroughly useless config.
 */

let params = {};
if (typeof window !== "undefined") {
    params = location.search
        .slice(1)
        .split('&')
        .map(p => p.split('='))
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
}

const SEED = params.seed ? parseInt(params.seed) : 0;
const PLAY_IMMEDIATELY = (params.autoplay==='true') ? true : false;
const FORCE_OPEN_BOT_PLAY = (params.force_open_bot_play==='true') ? true : false;
const PLAY_INTERVAL = params.play ? params.play : 100;
const HAND_INTERVAL = params.hand ? params.hand : 3000;

 // Possible values for the logger's verbosity.
const LOG_LEVELS = {
    // least verbose
    LOG: 0,
    WARN: 1,
    ERROR: 2,
    // most verbose
    DEBUG: 3
};


// The simple config is for settings I
// personally change a lot during development.
const simple = {
    // The pseudo-random number generator seed.
    // This value lets us "replay" problematic
    // games to find out where things go wrong.
    SEED: SEED,

    CURRENT_TEST_SEEDS: [
        1010612157, // first round player 0 claims pung, then discovers they have won. That should be a win claim with pung subtype instead.
        379859036, // there seem to be an inordinate amount of draws
        752896630, // turn 1 winner has some scorePatterns that are waaaaay too long
    ],

    // In increasing level of verbosity, we
    // can use LOG, WARN, ERROR, or DEBUG.
    LOG_LEVEL: LOG_LEVELS.LOG,

    // The number of milliseconds between
    // players taking their turn.
    PLAY_INTERVAL: PLAY_INTERVAL,

    // The number of milliseconds the game
    // allows players to lay claim to a discard.
    // Bots need nowhere near this much, but
    // humans tend to need more than a few ms!
    CLAIM_INTERVAL: 5000,

    // The number of milliseconds pause
    // between playing "hands".
    HAND_INTERVAL: HAND_INTERVAL,

    // For debugging purposes, we can tell
    // the game to effectively pause play
    // at the end of the following "hand".
    // A value of 0 means "don't pause".
    PAUSE_ON_HAND: 0,

    // For debugging purposes, we can tell
    // the game to pause play after a specific
    // tile getting dealt during a hand.
    // A value of 0 means "don't pause".
    PAUSE_ON_PLAY: 0,

    // This determines whether you get asked to
    // choose normal vs. automated play when you
    // load the page.
    PLAY_IMMEDIATELY: PLAY_IMMEDIATELY
};


// Constants used during play, for determining
// claim types on discarded tiles.
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


// This is a legacy list and needs to just be
// removed from the game code, with "CLAIM"
// getting renamed to something more general.
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


// And then rest of the configuration.
const config = {
    SEED: simple.SEED,

    // The pseudo-random number generator used by
    // any code that needs to randomise data.
    PRNG: new Random(simple.SEED),

    // Log verbosity
    LOG_LEVEL: simple.LOG_LEVEL,

    // page choice on load
    PLAY_IMMEDIATELY: simple.PLAY_IMMEDIATELY,

    // This setting determines which type of play
    // is initiated if PLAY_IMMEDIATELY is true
    BOT_PLAY: true,

    CLAIM_INTERVAL: simple.CLAIM_INTERVAL,
    PLAY_INTERVAL: simple.PLAY_INTERVAL,
    HAND_INTERVAL: simple.HAND_INTERVAL,
    PAUSE_ON_HAND: simple.PAUSE_ON_HAND,
    PAUSE_ON_PLAY: simple.PAUSE_ON_PLAY,

    // This value determines how long bots will
    // "wait" before discarding a tile. This is
    // a purely cosmetic UX thing, where humans
    // enjoy a game more if it doesn't feel like
    // they're playing against perfect machines.
    // We're weird that way.
    ARTIFICIAL_BOT_DELAY: 300,

    // Determine whether we award points based on
    // the losers paying the winner, or the losers
    // also paying each other.
    //
    // This setting will eventually migrate int
    // a ruleset config instead.
    LOSERS_SETTLE_SCORES: true,

    // See above
    CLAIM,

    // See above
    Constants,

    // A score sorting function. This will probably
    // be migrated to somewhere else soon.
    LOW_TO_HIGH: (a,b) => {
        a: a.score;
        b: b.score;
        return a - b;
    },

    // A conversion function for turning computer
    // chow differences into claim types. This will
    // probably be migrated to somewhere else soon.
    convertSubtypeToClaim: (diff) => {
        if(diff === -1) return CLAIM.CHOW3;
        if(diff === 1) return CLAIM.CHOW2;
        if(diff === 2) return CLAIM.CHOW1;
        return diff;
    },

    // This determines whether we bypass the
    // separation of concern and force bots to
    // update the player's ui, even though they
    // normally would have no way to access it.
    FORCE_OPEN_BOT_PLAY: FORCE_OPEN_BOT_PLAY
};


// Declare our logger as part of the config

let LOG_LEVEL = simple.LOG_LEVEL;

const Logger = {
    log:   (...args) => { if(LOG_LEVEL >= LOG_LEVELS.LOG) console.log.apply(console, args); },
    warn:  (...args) => { if(LOG_LEVEL >= LOG_LEVELS.WARN) console.warn.apply(console, args); },
    error: (...args) => { if(LOG_LEVEL >= LOG_LEVELS.ERROR) console.error.apply(console, args); },
    debug: (...args) => { if(LOG_LEVEL >= LOG_LEVELS.DEBUG) console.debug.apply(console, args); },
    trace: () => { console.trace(); }
};

config.LOGGER = Logger;

// this namespacing drives me nuts
const max = Math.max;

// in node context?
if(typeof process !== "undefined") module.exports = config;
