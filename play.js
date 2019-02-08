
/**
 * Set up a game of four players, and begin a game
 */
function setup() {
  let wall = new Wall();
  let proxy = wall.getProxy();

  let players  = [
    new BotPlayer(0,proxy),
    new BotPlayer(1, proxy),
    new HumanPlayer(2, proxy),
    new BotPlayer(3, proxy),
  ];

  // A simple turn counter. Note that we do not
  // advance this counter on a draw.
  let turn = 0;

  // A function that triggers the next turn's play.
  // Unless the game is over because we've played
  // enough rounds to rotate the winds fully.
  const next = (result) => {
    let pre = 'S';

    if (result) {
      pre = result.draw ? 'Res' : pre;
      if (result.winner) {
        let shuffles = rotateWinds();
        if (turn !== shuffles) turn = shuffles;
      }
      if (!result.draw && turn === 16) {
        console.log("\nfull game played.");
        players.forEach(p => {
          console.log(`Player ${p.id} won ${p.getWinCount()} hands.`);
        })
        return;
      }
    }

    console.log(`\n${pre}tarting turn ${turn}.`); // Starting turn / Restarting turn

    players.forEach(player => player.reset());
    playHand(turn, players, wall, next);
  };

  return { play() { next(); }};
}

/**
 * A single hand in a game consists of "dealing tiles"
 * and then starting play.
 */
function playHand(turn, players, wall, next) {
  PLAY_START = Date.now();
  dealTiles(turn, players, wall);
  players.forEach(p => p.handWillStart());
  playGame(turn, players, wall, next);
}

/**
 * Dealing tiles means getting each player 13 play tiles,
 * with any bonus tiles replaced by normal tiles.
 */
function dealTiles(turn, players, wall) {
  wall.reset();
  players.forEach((player, p) => {
    player.markTurn(turn);
    let bank = wall.get(13);
    for (let t=0, tile; t<bank.length; t++) {
      tile = bank[t];
      let revealed = player.append(tile);
      if (revealed) {
        // bonus tile are shown to all other players.
        players.forEach(p => p.see(revealed, player));
        bank.push(wall.get());
      }
      // At this point, a player should be able to decide whether or not to
      // declare any kongs they might have in their hand. While unlikely, it
      // is entirely possible for this to lead to a player declaring four
      // kongs before play has even started. We will add this in later.
      //
      // Note that this also affects client-ui.js!
    }
  });
}

/**
 * The game loop function.
 */
function playGame(turn, players, wall, next) {
  let currentPlayerId = 2;
  let discard = undefined;

  let play = async (claim) => {
    if (discard) discard.classList.remove('discard');

    let player = players[currentPlayerId];
    player.activate();

    // "Draw one"
    if (!claim) {
      let tile;
      do {
        tile = wall.get();
        let revealed = player.append(tile);
        // bonus tile are shown to all other players.
        if (revealed) players.forEach(p => p.see(revealed, player));
      } while (tile>33 && !wall.dead);
    } else {
      let tiles = player.awardClaim(currentPlayerId, claim, discard);
      // Awarded claims are shown to all other players. However,
      // the player whose discard this was should make sure to
      // ignore marking the tile they discarded as "seen" a
      // second time: they already saw it when they drew it.
      players.forEach(p => p.see(tiles, player));
    }

    // "Play one"
    discard = await new Promise(resolve => player.getDiscard(resolve));

    // Aaaand that's the core game mechanic covered!

    // Did anyone win?
    if (!discard) {
      let play_length = (Date.now() - PLAY_START);
      console.log(`Player ${currentPlayerId} wins round ${turn}!`);
      console.log(`Revealed tiles ${player.getLockedTileFaces()}`);
      console.log(`Concealed tiles: ${player.getTileFaces()}`);
      console.log(`(game took ${play_length}ms)`);
      player.winner();

      // Let everyone know what everyone had. It's the nice thing to do.
      let disclosure = players.map(p => p.getDisclosure());
      players.forEach(p => p.endOfHand(disclosure));

      // On to the next hand!
      return setTimeout(() => next({ winner: player }), TURN_INTERVAL);
    }

    // No winner - process the discard.
    player.removeDiscard(discard);
    delete discard.dataset.hidden;

    // Does someone want to claim this discard?
    claim = await getAllClaims(players, currentPlayerId, discard);
    if (claim) {
      currentPlayerId = claim.p;
      player.disable();
      // setTimeout rather than direct recursion!
      return setTimeout(() => play(claim), PLAY_INTERVAL);
    }

    // no claim happened, this tile will no longer be available.
    players.forEach(p => p.see(discard, player, true));

    if (wall.dead) {
      console.log("Turn ${turn} is a draw.");
      players.forEach(p => p.endOfHand());
      return setTimeout(() => next({ draw: true }), PLAY_INTERVAL);
    }

    // We have tiles left to play with, so move on to the next player:
    currentPlayerId = (currentPlayerId + 1) % 4;
    return setTimeout(() => {player.disable(); play();}, PLAY_INTERVAL);
  };

  play();
}

/**
 * Get all claims from all players, then decide who
 * had the winning claim (if there are any)
 */
async function getAllClaims(players, currentpid, discard) {
  // get all players to put in a claim bid
  let pendingClaims = players.map(p => new Promise(resolve => p.getClaim(currentpid, discard, resolve)));
  let claims = await Promise.all(pendingClaims);

  let claim = CLAIM.IGNORE;
  let win = undefined;
  let p = -1;

  // Who wins the bidding war?
  claims.forEach((c,pid)=> {
    if (c.claimtype > claim) {
      claim = c.claimtype;
      win = c.wintype ? c.wintype : undefined;
      p = pid;
    }
  });

  return p === -1 ? undefined : { claimtype: claim, wintype: win, p };
}
