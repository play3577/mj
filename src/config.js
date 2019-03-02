if (typeof process !== "undefined") Random = require('./js/core/utils/prng.js');

/**
 * We're using a javascript config, not a
 * JSON config, because JSON doesn't allow
 * comments, and a config that can't document
 * itself is a thoroughly useless config.
 */

let params = {};
if (typeof window !== "undefined") params = new URLSearchParams(window.location.search);

const NO_SOUND = (params.get(`nosound`)==='true') ? true : false;
const SEED = params.get(`seed`) ? parseInt(params.get(`seed`)) : 0;
const PLAY_IMMEDIATELY = (params.get(`autoplay`)==='true') ? true : false;
const PAUSE_ON_BLUR = (params.get(`pause_on_blur`)==='false') ? false: true;
const FORCE_DRAW = (params.get(`force_draw`)==='true') ? true : false;
const FORCE_OPEN_BOT_PLAY = (params.get(`force_open_bot_play`)==='true') ? true : false;
const SHOW_BOT_CLAIM_SUGGESTION = (params.get(`show_bot_claim_suggestion`)==='true') ? true : false;
const PLAY_INTERVAL = params.get(`play`) ? params.get(`play`) : 100;
const HAND_INTERVAL = params.get(`hand`) ? params.get(`hand`) : 3000;
const BOT_DELAY_BEFORE_DISCARD_ENDS = params.get(`bot_delay`) ? parseInt(params.get(`bot_delay`)) : 300;
const WALL_HACK = params.get(`wall_hack`) ? params.get(`wall_hack`) : '';
const DEBUG = (params.get(`debug`)==='true') ? true : false;

if (!DEBUG) console.debug = () => {};

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


// Tile names...
const TILE_NAMES = {
    "0": 'bamboo 1',
    "1": 'bamboo 2',
    "2": 'bamboo 3',
    "3": 'bamboo 4',
    "4": 'bamboo 5',
    "5": 'bamboo 6',
    "6": 'bamboo 7',
    "7": 'bamboo 8',
    "8": 'bamboo 9',
    "9": 'characters 1',
    "10": 'characters 2',
    "11": 'characters 3',
    "12": 'characters 4',
    "13": 'characters 5',
    "14": 'characters 6',
    "15": 'characters 7',
    "16": 'characters 8',
    "17": 'characters 9',
    "18": 'dots 1',
    "19": 'dots 2',
    "20": 'dots 3',
    "21": 'dots 4',
    "22": 'dots 5',
    "23": 'dots 6',
    "24": 'dots 7',
    "25": 'dots 8',
    "26": 'dots 9',
    "27": 'east',
    "28": 'south',
    "29": 'west',
    "30": 'north',
    "31": 'green dragon',
    "32": 'red dragon',
    "33": 'white dragon',
    "34": 'flower 1',
    "35": 'flower 2',
    "36": 'flower 3',
    "37": 'flower 4',
    "38": 'season 1',
    "39": 'season 2',
    "40": 'season 3',
    "41": 'season 4'
};

const SUIT_NAMES = {
    "0": "bamboo",
    "1": "characters",
    "2": "dots"
}

// And then rest of the configuration.
const config = {
    DEBUG,
    NO_SOUND,
    SEED: simple.SEED,

    // The pseudo-random number generator used by
    // any code that needs to randomise data.
    PRNG: new Random(simple.SEED),

    // page choice on load
    PLAY_IMMEDIATELY: simple.PLAY_IMMEDIATELY,

    // Do not pause play when the game loses focus
    PAUSE_ON_BLUR,

    // This setting determines which type of play
    // is initiated if PLAY_IMMEDIATELY is true
    BOT_PLAY: true,
    BOT_DELAY_BEFORE_DISCARD_ENDS: BOT_DELAY_BEFORE_DISCARD_ENDS,

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

    // See above
    TILE_NAMES,
    SUIT_NAMES,

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
    FORCE_OPEN_BOT_PLAY,

    // Highlight discarded tiles if the bot
    // superclass to the human player recommends
    // claiming it for something.
    SHOW_BOT_CLAIM_SUGGESTION,

    // Debugging around drawn hands requires
    // being able to force a draw
    FORCE_DRAW,

    // Turning on wall hacks will set the wall
    // to very specific walls for debugging
    // purposes. This option simple fixes the
    // wall to a pattern on reset() so you can't
    // play a game if you use this. You just
    // get to debug a very specific situation.
    WALL_HACK: WALL_HACK
};

// in node context?
if(typeof process !== "undefined") module.exports = config;
