
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
        Logger.log(`\nfull game played.`);
        let scores = players.map(p => p.getScore());
        players.forEach(p => p.endOfGame(scores));
        return;
      }
    }

    Logger.log(`\n${pre}tarting turn ${turn}.`); // Starting turn / Restarting turn

    players.forEach(player => player.reset());

    if (PAUSE_ON_TURN && turn === PAUSE_ON_TURN) TURN_INTERVAL = 60 * 60 * 1000; // play debug

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

      // process kong declaration
      let kong = player.checkKong(tile);
      if (kong) {
        Logger.debug(`${player.id} plays self-drawn kong ${kong[0].dataset.tile} during initial tile dealing`);
        players.forEach(p => p.see(kong, player));
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
 * Set up and run the main game loop.
 */
function playGame(turn, players, wall, next) {
  let currentPlayerId = 2;
  let discard = undefined;

  // Since we need to do this in a few places,
  // this is its own little function.
  let dealTile = player => {
    let tile;
    do {
      tile = wall.get();
      Logger.debug(`${player.id} was given tile ${tile}`);
      let revealed = player.append(tile);
      // bonus tile are shown to all other players.
      if (revealed) players.forEach(p => p.see(revealed, player));
      // if a played got a kong, and declared it, notify all
      // other players and issue a supplement tile.
      let kong = player.checkKong(tile);
      if (kong) {
        Logger.debug(`${player.id} plays self-drawn kong ${kong[0].dataset.tile} during play`);
        players.forEach(p => p.see(kong, player, false, true));
        Logger.debug(`Dealing ${player.id} a supplement tile.`);
        dealTile(player);
      }
    } while (tile>33 && !wall.dead);
    return wall.dead;
  }

  // Game loop function:
  let play = async (claim) => {
    if (discard) discard.classList.remove('discard');

    let player = players[currentPlayerId];
    players.forEach(p => p.activate(player.id));

    // "Draw one"
    if (!claim) dealTile(player);
    else {
      let tiles = player.awardClaim(currentPlayerId, claim, discard);

      // Awarded claims are shown to all other players. However,
      // the player whose discard this was should make sure to
      // ignore marking the tile they discarded as "seen" a
      // second time: they already saw it when they drew it.
      players.forEach(p => p.seeClaim(tiles, player, claim));

      // if the player locks away a total of 4 tiles, they need
      // a tile from the wall to compensate for the loss of a tile.
      if (tiles.length === 4) dealTile(player);
    }

    // "Play one"
    discard = await new Promise(resolve => player.getDiscard(resolve));

    if (discard) {
      Logger.debug(`player ${player.id} discarded ${discard.dataset.tile} from ${player.getTileFaces()}`);
    }

    // Aaaand that's the core game mechanic covered!

    // Did anyone win?
    if (!discard) {
      let play_length = (Date.now() - PLAY_START);
      Logger.log(`Player ${currentPlayerId} wins round ${turn}!`);
      Logger.log(`Revealed tiles ${player.getLockedTileFaces()}`);
      Logger.log(`Concealed tiles: ${player.getTileFaces()}`);
      player.winner();

      // Let everyone know what everyone had. It's the nice thing to do.
      let disclosure = players.map(p => p.getDisclosure());
      players.forEach(p => p.endOfHand(disclosure));

      // calculate scores!
      let scores = disclosure.map(d => scoreTiles(d));
      let adjustments = settleScores(scores, player.id);
      Logger.log(`Scores: ${scores}`);
      Logger.log(`Score adjustments: ${adjustments}`);
      players.forEach(p => p.recordScores(adjustments));

      // On to the next hand!
      Logger.log(`(game took ${play_length}ms)`);
      return setTimeout(() => next({ winner: player }), TURN_INTERVAL);
    }

    // No winner - process the discard.
    player.removeDiscard(discard);
    discard.dataset.from = player.id;
    delete discard.dataset.hidden;

    // Does someone want to claim this discard?
    claim = await getAllClaims(players, currentPlayerId, discard);
    if (claim) {
      Logger.debug(`${claim.p} wants ${discard.dataset.tile} for ${claim.claimtype}`);
      currentPlayerId = claim.p;
      player.disable();
      // and recurse, but using setTimeout rather than direct recursion.
      return setTimeout(() => play(claim), PLAY_INTERVAL);
    }

    if (wall.dead) {
      Logger.log(`Turn ${turn} is a draw.`);
      players.forEach(p => p.endOfHand());
      return setTimeout(() => next({ draw: true }), PLAY_INTERVAL);
    }

    // We have tiles left to play with, so move on to the next player:
    players.forEach(p => p.nextPlayer());
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
