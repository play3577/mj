/**
 * Set up a game of four players, and begin a game
 */
function setup() {
  let wall = new Wall();

  let players  = Array.from(document.querySelectorAll(".player")).map(
    (htmlelement, idx) => {
      if (idx===2) return new HumanPlayer(htmlelement, wall);
      return new BotPlayer(htmlelement, wall);
    }
  );

  return { play() { playHand(players, wall) }};
}

/**
 * A single hand in a game consists of "dealing tiles"
 * and then starting play.
 */
function playHand(players, wall) {
  dealTiles(players, wall);
  playGame(players, wall);
}

/**
 * Dealing tiles means getting each player 13 play tiles,
 * with any bonus tiles replaced by normal tiles.
 */
function dealTiles(players, wall) {
  players.forEach((player, p) => {
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
    }
  });
  // purely cosmetic, but worth doing:
  players.forEach(player => player.sortTiles());
}

/**
 * The game loop function.
 */
function playGame(players, wall) {
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
      let tiles = player.claim(currentPlayerId, claim, discard);
      // awarded claims are shown to all other players.
      players.forEach(p => p.see(tiles, player));
    }

    // "Play one"
    discard = await new Promise(resolve => player.getDiscard(resolve));

    // Aaaand that's the core game mechanic covered!

    // Did anyone win?
    if (!discard) {
      console.log(`Player ${currentPlayerId} wins this round!`);
      console.log(`Revealed tiles ${player.getLockedTileFaces()}`);
      console.log(`Concealed tiles: ${player.getTileFaces()}`);
      console.log(`Tiles knowledge:`, player.tracker.tiles);
      player.winner();
      return discards.classList.add('winner');
    }

    // No winner; does someone want to claim this discard?
    delete discard.dataset.hidden;
    discards.appendChild(discard);
    discard.classList.add('discard');
    claim = await getAllClaims(players, currentPlayerId, discard);
    if (claim) {
      currentPlayerId = claim.p;
      player.disable();
      // setTimeout rather than direct recursion!
      return setTimeout(() => play(claim), PLAY_INTERVAL);
    }

    // no claim happened, this tile will no longer be available.
    players.forEach(p => p.see(discard, player));

    if (wall.dead) {
      console.log("OUT OF TILES");
      return discards.classList.add('exhausted');
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
