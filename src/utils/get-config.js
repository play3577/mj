const getConfig = (function () {
  const TIMEOUTS = [
    0, 100, 200, 300, 400, 500,
    1000, 2000, 3000, 4000, 5000,
    10000, 15000, 30000, 60000, 3600000,
  ];

  const CONFIG = {
    // pseudo-random number generation seed value. Set this
    // to 0 in order for the PRNG to pick a random seed.
    prng_seed: {
      value: 0,
      type: `number`
    },

    // The ruleset to use to score a game.
    ruleset: {
      value: `Chinese Classical`,
      type: [
        `Cantonese`,
        `Chinese Classical`
      ]
    },

    // Set this to one of the kesy in wall-hack.js in order
    // to start a game with that hand setup.
    wallhack: {
      value: false,
      type: [
        `self_drawn_win_clean`,
        `self_drawn_win`,
        `form_melded_kong_off_initial`,
        `kong_in_initial_deal`,
        `kong_from_first_discard`,
        `robbing_a_kong`,
        `robbing_a_selfdrawn_kong`,
        `chow_by_player_1`,
        `all_bonus_to_player`,
        `thirteen_orphans`,
        `all_green`,
        `nine_gates`,
        `little_three_dragons`,
        `chow_for_player_0`,
        `'5_6_7_plus_5'`,
        `'5_6_7_plus_6'`,
        `'5_6_7_plus_7'`,
        `'5_6_7_8_plus_6'`,
        `pung_chow_conflict`,
        `cantonese_chicken_hand`,
      ]
    },

    // Force all players to play with their tiles visible
    // to all other players in the game.
    force_open_play: {
      value: false,
      type: `boolean`
    },

    // Grace period between the initial deal and the first
    // real play tile getting dealt.
    round_start_timeout: {
      value: 10000,
      type: TIMEOUTS
    },

    // Grace period for a discard being locked as discard
    // and play moving to the next player.
    claim_timeout: {
      value: 50000,
      type: TIMEOUTS
    },

    // Grace period between a win being declared and the
    // score breakdown getting sent to all users.
    end_of_round_timeout: {
      value: 3000,
      type: TIMEOUTS
    },

    // The artificial delay between bots knowing what they
    // want to do, and executing on that, to make humans
    // feel like they're in a fair game.
    bot_humanizing_delay: {
      value: 500,
      type: TIMEOUTS
    }
  };

  const bindings = {};

  return function getConfig(game) {
    if (!bindings[game.name]) {
      bindings[game.name] = JSON.parse(JSON.stringify(CONFIG));
    }
    return bindings[game.name];
  }
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = getConfig;
}
