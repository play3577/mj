
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
  let hand = 1;

  // A function that triggers the next hand's play.
  // Unless the game is over because we've played
  // enough rounds to rotate the winds fully.
  const next = (result) => {
    let pre = 'S';

    if (result) {
      pre = result.draw ? 'Res' : pre;
      if (result.winner) {
        let shuffles = rotateWinds();
        if (hand !== shuffles) hand = shuffles;
      }
      if (!result.draw && hand > 16) {
        hand = '';
        Logger.log(`\nfull game played.`);
        let scores = players.map(p => p.getScore());
        players.forEach(p => p.endOfGame(scores));
        return;
      }
    }

    Logger.log(`\n${pre}tarting hand ${hand}.`); // Starting hand / Restarting hand

    players.forEach(player => player.reset());

    if (config.PAUSE_ON_HAND && hand === config.PAUSE_ON_HAND) config.HAND_INTERVAL = 60 * 60 * 1000; // play debug

    // FIXME: this needs to be tracked separately, to be fixed
    //        when the shuffle() function is made a proper play
    //        function instead of being left to the rotator...
    windOfTheRound = ((hand/4)|0);

    playHand(hand, players, wall, windOfTheRound, next);
  };

  return { play() { next(); }};
}


/**
 * A single hand in a game consists of "dealing tiles"
 * and then starting play.
 */
function playHand(hand, players, wall, windOfTheRound, next) {
  PLAY_START = Date.now();
  dealTiles(hand, players, wall);
  players.forEach(p => p.handWillStart());
  let start = preparePlay(hand, players, wall, windOfTheRound, next);
  start();
}


/**
 * Dealing tiles means getting each player 13 play tiles,
 * with any bonus tiles replaced by normal tiles.
 */
function dealTiles(hand, players, wall) {
  wall.reset();
  players.forEach((player, p) => {
    player.markHand(hand);
    let bank = wall.get(13);
    for (let t=0, tile; t<bank.length; t++) {
      tile = bank[t];
      players.forEach(p => p.receivedTile(player));
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
        players.forEach(p => p.seeKong(kong, player));
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
function preparePlay(hand, players, wall, windOfTheRound, next) {
  let currentPlayerId = 2;
  let discard = undefined;
  let counter = 0;

  // shorthand function to wrap the do/while loop.
  let dealTile = player => {
    let tile;
    do { tile = wall.get(); dealTileToPlayer(player, tile, players, () => dealTile(player)) }
    while (tile>33 && !wall.dead);
    return wall.dead;
  };

  // Game loop function:
  let play = async (claim) => {

    if (claim) currentPlayerId = claim.p;
    let player = players[currentPlayerId];
    players.forEach(p => p.activate(player.id));

    // increase the play counter;
    counter++;
    playDelay = (hand===config.PAUSE_ON_HAND && counter===config.PAUSE_ON_PLAY) ? 60*60*1000 : config.PLAY_INTERVAL;
    Logger.debug(`hand ${hand}, play ${counter}`);

    // "Draw one"
    if (!claim) dealTile(player);
    else {
      let tiles = player.receiveDiscardForClaim(claim, discard);

      // Awarded claims are shown to all other players.
      players.forEach(p => p.seeClaim(tiles, player, discard, claim));

      // If the player locks away a total of 4 tiles,
      // they need a supplement tile.
      if (tiles.length === 4) dealTile(player);
    }

    // "Play one"
    if (discard) discard.classList.remove('discard');
    discard = await new Promise(resolve => player.getDiscard(resolve));

    // Did anyone win?
    if (!discard) return processWin(player, hand, players, currentPlayerId, next);

    // No winner - process the discard.
    processDiscard(player, discard, players);

    // Does someone want to claim this discard?
    claim = await getAllClaims(players, currentPlayerId, discard); // players take note of the fact that a discard happened as part of their determineClaim()
    if (claim) return processClaim(player, claim, discard, () => play(claim));

    // No claims: have we run out of tiles?
    if (wall.dead) {
      Logger.log(`Hand ${hand} is a draw.`);
      players.forEach(p => p.endOfHand());
      return setTimeout(() => next({ draw: true }), playDelay);
    }

    // Nothing of note happened: game on.
    players.forEach(p => p.nextPlayer());
    currentPlayerId = (currentPlayerId + 1) % 4;
    return setTimeout(() => {player.disable(); play();}, playDelay);
  };

  return play;
}


/**
 * At the start of a player's turn, deal them a tile. This
 * might actually turn into several tiles, as bonus tiles and
 * tiles that form kongs may require a supplement tile being
 * dealt to that player. And of course, that supplement can
 * also be a bonus or kong tile.
 */
function dealTileToPlayer(player, tile, players, next) {
  Logger.debug(`${player.id} was given tile ${tile}`);
  Logger.debug(`dealing ${tile} to player ${player.id}`);
  let revealed = player.append(tile);
  players.forEach(p => p.receivedTile(player));
  // bonus tile are shown to all other players.
  if (revealed) players.forEach(p => p.see(revealed, player));

  // if a played got a kong, and declared it, notify all
  // other players and issue a supplement tile.
  let kong = player.checkKong(tile);
  if (kong) {
    Logger.debug(`${player.id} plays self-drawn kong ${kong[0].dataset.tile} during play`);
    players.forEach(p => p.seeKong(kong, player));
    Logger.debug(`Dealing ${player.id} a supplement tile.`);
    next();
  }
}


/**
 * Handle a discard and let all players know that discard occurred.
 */
function processDiscard(player, discard, players) {
  Logger.debug(`${player.id} discarded ${discard.dataset.tile}`);
  player.removeDiscard(discard);
  discard.dataset.from = player.id;
  delete discard.dataset.hidden;
  players.forEach(p => p.playerDiscarded(player, discard));
}


/**
 * Ask all players to stake a claim on a discard, and pause
 * general game logic until each player has either indicated
 * they are not intereted, or what they are interested in it for.
 *
 * If there are multiple claims, the highest valued claim wins.
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


/**
 * Handle a claim on a discard. Note that the actual "awarding"
 * of the claim happens in the play loop, where the fact that
 * play started with a pending claim means that instead of tile
 * being drawn, the player "draws" the discard tile instead.
 */
function processClaim(player, claim, discard, next) {
  Logger.debug(`${claim.p} wants ${discard.dataset.tile} for ${claim.claimtype}`);
  player.disable();
  setTimeout(next, playDelay);
}


/**
 * Once a plyer has won, process that win in terms of scoring and
 * letting everyone know what the result of the hand is.
 */
function processWin(player, hand, players, currentPlayerId, next) {
  let play_length = (Date.now() - PLAY_START);
  Logger.log(`Player ${currentPlayerId} wins round ${hand}!`);
  Logger.log(`Revealed tiles ${player.getLockedTileFaces()}`);
  Logger.log(`Concealed tiles: ${player.getTileFaces()}`);
  player.winner();

  // Let everyone know what everyone had. It's the nice thing to do.
  let disclosure = players.map(p => p.getDisclosure());
  players.forEach(p => p.endOfHand(disclosure));

  // calculate scores!
  let scores = disclosure.map((d,id) => scoreTiles(d, id, windOfTheRound));
  Logger.log("score breakdown:", scores);
  let adjustments = settleScores(scores, player.id);
  Logger.log(`Scores: ${scores.map(s => s.total)}`);
  Logger.log(`Score adjustments: ${adjustments}`);
  players.forEach(p => p.recordScores(adjustments));
  Logger.log(`(game took ${play_length}ms)`);

  // Show the score line, and the move on to the next hand.
  scores[player.id].winner = true;
  modal.setScores(hand, scores, adjustments, () => {
    console.log('n');
    next({ winner: player });
  });
}
