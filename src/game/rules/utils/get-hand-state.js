/**
 * All possible flags and values necessary for performing scoring, used in checkWinnerHandPatterns
 */
function getHandState(
  // tiles:
  sets, // sets in hand
  lockedSets, // locked sets on the table

  // if player won:
  winset, // the set that this player won on
  selfdraw, // was it a self-dawn win?
  selftile, // if so, on which tile?
  robbed, // did the win occur by robbing a kong?

  // round information:
  windTile, // player wind
  windOfTheRoundTile,
  tilesLeft // used to determine whether bonuses apply
) {
  // We start with assumptions that will get invalidated as we examine sets.
  const state = {
    chowhand: true,
    punghand: true,

    onesuit: true,
    honours: false,
    allhonours: true,
    terminals: true,
    allterminals: true,
    little_dragons: false,

    outonPair: true,
    pairTile: -1,
    majorPair: false,
    dragonPair: false,
    windPair: false,
    ownWindPair: false,
    wotrPair: false,

    ownWindPung: false,
    wotrPung: false,
    ownWindKong: false,
    wotrKong: false,

    chowCount: 0,
    windPungCount: 0,
    windKongCount: 0,
    dragonPungCount: 0,
    dragonKongCount: 0,
    concealedCount: sets.length,
    kongCount: 0,

    suit: false,
    selfdraw: selfdraw,
    robbed: robbed,
    lastTile: tilesLeft <= 0
  };

  // red/green/white dragon counters
  let r, g, w;

  // most checks do not care whether a set is locked or not.
  let scorePattern = sets.concat(lockedSets);

  let tilesuit;
  scorePattern.forEach(set => {
    tilenumber = set[0];
    tilesuit = (tilenumber / 9) | 0;

    if (tilenumber < 27) {
      if (state.suit === false) state.suit = tilesuit;
      else if (state.suit !== tilesuit) state.onesuit = false;

      if (set.some(t => t % 9 !== 0 && t % 9 !== 8)) {
        state.terminals = false;
        state.allterminals = false;
      }
      state.allhonours = false;
    } else {
      state.honours = true;
      state.allterminals = false;
    }

    if (set.length === 2) {
      if (tilenumber > 26 && tilenumber < 31) {
        state.windPair = true;
        state.majorPair = true;
      }
      if (tilenumber > 30) {
        state.dragonPair = true;
        state.majorPair = true;
      }
      if (tilenumber === windTile) {
        state.ownWindPair = true;
        state.majorPair = true;
      }
      if (tilenumber === windOfTheRoundTile) {
        state.wotrPair = true;
        state.majorPair = true;
      }

      if (winset) {
        state.outonPair = winset.equals(set);
        if (state.outonPair) state.pairTile = winset[0];
      } else if (!winset && selfdraw && set[0] === selftile) {
        state.outonPair = true;
        state.pairTile = selftile;
      } else {
        state.outonPair = false;
      }
    }

    if (set.length === 3) {
      if (tilenumber === set[1]) {
        if (tilenumber > 26 && tilenumber < 31) {
          state.windPungCount++;
          if (tilenumber === windTile) state.ownWindPung = true;
          if (tilenumber === windOfTheRoundTile) state.wotrPung = true;
        }
        if (tilenumber > 30) state.dragonPungCount++;
        state.chowhand = false;
      } else {
        state.chowCount++;
        state.punghand = false;
      }
    }

    if (set.length === 4) {
      // Note: any kong implies a pung
      state.kongCount++;
      if (tilenumber > 26 && tilenumber < 31) {
        state.windKongCount++;
        if (tilenumber === windTile) state.ownWindKong = true;
        if (tilenumber === windOfTheRoundTile) state.wotrKong = true;
      }
      if (tilenumber > 30) state.dragonKongCount++;
      state.chowhand = false;
    }

    if (tilenumber === 31) g = set.length;
    if (tilenumber === 32) r = set.length;
    if (tilenumber === 33) w = set.length;
  });

  if ((r === 2 || g === 2 || w === 2) && r + g + w >= 8) {
    state.little_dragons = true;
  }

  return state;
}

module.exports = getHandState;
