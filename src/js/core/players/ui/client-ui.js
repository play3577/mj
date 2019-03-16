if (typeof process !== "undefined") {
  ClientUIMaster = require('./client-ui-master.js');
}


/**
 * This is a graphical interface that players can use
 * to visualise their game knowledge, and allow external
 * interaction (human overrides for bots, or just plain
 * human input for... well, humans)
 */
class ClientUI extends ClientUIMaster {
  constructor(player, tracker) {
    super(player, tracker);
  }

  /**
   * Called by `determineDiscard` in human.js, this function
   * lets the user pick a tile to discard through the GUI.
   */
  listenForDiscard(resolve, suggestion, lastClaim) {
    let listenForInput = true;
    let tiles = this.getAvailableTiles();
    let latestTile = this.player.latest;
    let currentTile = latestTile;
    let curid = currentTile ? Array.from(tiles).indexOf(currentTile) : 0;
    if (curid===0) currentTile = tiles[0];

    let suggestedTile = false;

    if (suggestion) {
      suggestedTile = this.getSingleTileFromHand(suggestion.getTileFace());
      if (suggestedTile) {
        suggestedTile.classList.add('suggestion');
        suggestedTile.setAttribute('title','Bot-recommended discard.');
      } else {
        console.log(`The bot got confused and wanted you to throw out something that's not in your hand...!`);
      }
    }

    // If we have no tiles left to discard, that's
    // an automatic win declaration.
    if (tiles.length === 0) {
      return resolve(undefined);
    }

    // If we just claimed a win, that's also
    // an automatic win declaration.
    if (lastClaim && lastClaim.claimtype === CLAIM.WIN) {
      return resolve(undefined);
    }

    // If the bot knows we have a winning hand,
    // let the user decide whether to declare a
    // win or whether to keep playing.
    if (suggestion === undefined) {
      let cancel = () => resolve(undefined);
      return modal.choiceInput("Declare win?", [
        { label: 'You better believe it!', value: 'win' },
        { label: 'No, I think I can do better...', value: '' },
      ], result => {
        if (result) resolve(undefined);
        else this.listenForDiscard(resolve, false);
      }, cancel);
    }

    let cleanup = [];

    // The actual discard function that resolves this
    // entire user action.
    let pickAsDiscard = e => {
      listenForInput = false;
      if (suggestedTile) {
        suggestedTile.classList.remove('suggestion');
        suggestedTile.removeAttribute('title');
      }
      if (latestTile) {
        latestTile.classList.remove('latest')
      }
      cleanup.forEach(fn => fn());
      let tile = e.target;
      if (tile) tile.classList.remove('highlight');
      resolve(tile);
    };

    // declaration using mouse = long press
    let listenForLongPress = e => {
      if (e.type === 'mousedown' && e.which !== 1) return;
      setTimeout(() => {
        if (!listenForInput) return;
        e.stopPropagation();
        e.target.removeEventListener("click", pickAsDiscard);
        this.spawnDeclarationModal(e.target, pickAsDiscard, () => {
          e.target.addEventListener("click", pickAsDiscard);
        });
      }, 1000);
    };

    let highlightTile = e => {
      tiles.forEach(tile => tile.classList.remove('highlight'));
      currentTile = e.target;
      currentTile.classList.add('highlight');
      curid = Array.from(tiles).indexOf(currentTile);
    };

    // cleanup for the click listeners
    cleanup.push(() => {
      tiles.forEach(tile => {
        tile.classList.remove('selectable');
        tile.classList.remove('highlight');
        tile.removeEventListener("mouseover", highlightTile);
        tile.removeEventListener("click", pickAsDiscard);
        tile.removeEventListener("mousedown", listenForLongPress);
        tile.removeEventListener("touchstart", listenForLongPress);
      });
    });

    // mouse interaction
    tiles.forEach(tile => {
      tile.classList.add('selectable');
      tile.addEventListener("mouseover", highlightTile);
      tile.addEventListener("click", pickAsDiscard);
      tile.addEventListener("mousedown", listenForLongPress);
      tile.addEventListener("touchstart", listenForLongPress);
    });

    // keyboard interaction
    let listenForKeys = (() => {
      let tlen = tiles.length;

      currentTile.classList.add('highlight');

      return evt => {
        let code = evt.keyCode;
        if (VK_SIGNAL[code] && evt.repeat) return; // ignore all "action" key repeats

        let willBeHandled = (VK_LEFT[code] || VK_RIGHT[code] || VK_UP[code] || VK_DOWN[code] || VK_SIGNAL[code] || VK_START[code] || VK_END[code]);
        if (!willBeHandled) return;
        evt.preventDefault();

        if (currentTile.isLocked()) currentTile = false;

        if (VK_LEFT[code]) curid = (currentTile === false) ? tlen - 1 : (curid === 0) ? tlen - 1 : curid - 1;
        if (VK_RIGHT[code]) curid = (currentTile === false) ? 0 : (curid === tlen-1) ? 0 : curid + 1;
        if (VK_START[code]) curid = 0;
        if (VK_END[code]) curid = tlen-1;

        currentTile = tiles[curid];
        highlightTile({ target: currentTile });

        if (VK_UP[code] || VK_SIGNAL[code]) {
          if (!vk_signal_lock) {
            lock_vk_signal();
            currentTile.classList.remove('highlight');
            pickAsDiscard({ target: currentTile });
          }
        }

        if (VK_DOWN[code]) this.spawnDeclarationModal(currentTile, pickAsDiscard);
      };
    })();

    // cleanup for the key listener
    cleanup.push(() => {
      document.removeEventListener('keydown', listenForKeys);
    });

    document.addEventListener('keydown', listenForKeys);
  }

  /**
   * Called in several places in `listenForDiscard`, this function
   * spawns a modal that allows the user to declaring they can
   * form a kong or that they have won on their own turn.
   */
  spawnDeclarationModal(currentTile, pickAsDiscard, cancel) {
    let face = currentTile.getTileFace();
    let allInHand = this.getAllTilesInHand(face);
    let canKong = false;

    // do we have a concealed kong?
    if (allInHand.length === 4) canKong = true;

    // can we meld a kong?
    else if (this.player.locked.some(set => set.every(t => t.getTileFace()==face))) canKong = true;

    // can we win?
    let { winpaths } = this.player.tilesNeeded();
    let canWin = winpaths.length > 0;

    if (!canWin) {
      let allTiles = this.getTileFaces(true).filter(t => t<34);
      canWin = this.player.rules.checkForLimit(allTiles);
    }

    // build the self-declare options for this action
    let options = [
      { label: "on second thought, never mind", value: CLAIM.IGNORE },
      canKong ? { label: "I'm declaring a kong", value: CLAIM.KONG } : false,
      canWin ? { label: "I just won", value: CLAIM.WIN } : false
    ].filter(v=>v);

    modal.choiceInput("Declare a kong or win?", options, result => {
      if (result === CLAIM.IGNORE) {
        return cancel ? cancel() : false;
      }
      if (result === CLAIM.KONG) {
        currentTile.exception = CLAIM.KONG;
        currentTile.kong = [...allInHand];;
        currentTile.classList.remove('highlight');
        return pickAsDiscard({ target: currentTile });
      }
      if (result === CLAIM.WIN) return pickAsDiscard({ target: undefined });
    });
  }

  /**
   * Called by `determineClaim` in human.js, this function
   * lets the user decide whether or not to claim the discard
   * in order to form a specific set, or even win.
   */
  listenForClaim(pid, discard, suggestion, resolve, interrupt, claimTimer) {
    // TODO: split this monster up, it's too much code in a single function.
    let discards = this.discards;
    let tile = discards.lastChild;
    let mayChow = this.player.mayChow(pid);

    let registerUIInput = () => {
      if (this.countdownTimer) this.countdownTimer.cancel();
      interrupt();
    }

    // show general claim suggestions
    if (config.SHOW_CLAIM_SUGGESTION) {
      let face = tile.getTileFace();
      let { lookout } = this.player.tilesNeeded();
      let types = lookout[face];
      if (types) {
        for(let type of types) {
          if (CLAIM.CHOW <= type && type < CLAIM.PUNG && !mayChow) continue
          discards.lastChild.classList.add('highlight');
          break;
        }
      }
    }

    // show the bot's play suggestions
    if (config.SHOW_BOT_SUGGESTION && suggestion && suggestion.claimtype) {
      discards.lastChild.classList.add('suggestion');
    }

    // We need a flag that bypasses `ignore()` if we click
    // on the part of the page that normally triggers ignore
    // as part of a document focus action.
    let regainedFocus = false;

    // if the document is blurred,  we need to suspend the claim timer!
    let brb = () => claimTimer.pause();

    // if focus is regained, resume the claim timer, and make sure that
    // focus event cannot trigger ignore() if it was a click, and that
    // clicked happened on the discards element
    let frb = (evt) => { regainedFocus = true; claimTimer.resume() };

    // Set up the dialog spawning for when the user elects to stake a claim.
    let triggerClaimDialog = evt => {
      if(evt) evt.stopPropagation();

      registerUIInput();
      let CLAIM = config.CLAIM;

      // let's spawn a little modal to see what the user actually wanted to do here.
      let cancel = () => resolve({ claimtype: CLAIM.IGNORE});

      modal.choiceInput("What kind of claim are you making?", [
        { label: "Ignore", value: CLAIM.IGNORE },
        (mayChow && this.canChow(discard, CLAIM.CHOW1)) ? { label: "Chow (▮▯▯)", value: CLAIM.CHOW1 } : false,
        (mayChow && this.canChow(discard, CLAIM.CHOW2)) ? { label: "Chow (▯▮▯)", value: CLAIM.CHOW2 } : false,
        (mayChow && this.canChow(discard, CLAIM.CHOW3)) ? { label: "Chow (▯▯▮)", value: CLAIM.CHOW3 } : false,
        this.canPung(discard) ? { label: "Pung", value: CLAIM.PUNG } : false,
        this.canKong(discard) ? { label: "Kong", value: CLAIM.KONG } : false,
        { label: "Win", value: CLAIM.WIN }, // Let's not pre-filter this one
      ], result => {
        discards.lastChild.classList.remove('highlight');
        tile.classList.remove('selectable');
        removeAllListeners();
        if (result === CLAIM.WIN) return this.spawnWinDialog(discard, resolve, cancel);
        resolve({ claimtype: result });
      }, cancel);
    }

    // Let the game know we're not interested in the current discard.
    let ignore = () => {
      if (regainedFocus) return (regainedFocus = false);
      registerUIInput();
      tile.classList.remove('selectable');
      removeAllListeners();
      resolve(CLAIM.IGNORE);
    };

    // This adds a safety region around the discarded tile, for fat fingers.
    let safeIgnore = evt => {
      let bbox = discards.lastChild.getBoundingClientRect();
      let midpoint = {
        x: (bbox.left + bbox.right)/2,
        y: (bbox.top + bbox.bottom)/2,
      };
      let vector = {
        x: midpoint.x - evt.clientX,
        y: midpoint.y - evt.clientY
      };
      let distance = Math.sqrt(vector.x ** 2 + vector.y ** 2);
      if (distance > 40) return ignore();
      return triggerClaimDialog();
    };

    // mouse interaction
    tile.classList.add('selectable');
    tile.addEventListener("click", triggerClaimDialog);
    discards.addEventListener("click", safeIgnore);

    // and make sure to set up that focus-regain-bypass
    document.addEventListener("focus", frb, true);
    document.addEventListener("blur", brb);

    // rely on this function getting hoisted because we
    // need to call it in code above this function.
    function removeAllListeners() {
      tile.removeEventListener("click", triggerClaimDialog);
      discards.removeEventListener("click", safeIgnore);
      document.removeEventListener("focus", frb, true);
      document.removeEventListener("blur", brb);
    }

    // keyboard interaction
    let listenForKeys = evt => {
      // Prevent keyrepeat immediately kicking in off of a
      // discard action, which uses the same signal:
      if (vk_signal_lock) return;

      let code = evt.keyCode;
      let willBeHandled = (VK_LEFT[code] || VK_RIGHT[code] || VK_UP[code] || VK_SIGNAL[code]);
      if (!willBeHandled) return;
      evt.preventDefault();
      document.removeEventListener('keydown', listenForKeys);
      if (VK_UP[code] || VK_SIGNAL[code]) return triggerClaimDialog();
      return ignore();
    };

    document.addEventListener('keydown', listenForKeys);
  }

  /**
   * Do we want to rob a kong to win?
   */
  spawnKongRobDialog(tiles, tilesRemaining, resolve) {
    // FIXME: TODO: implement this logic.
    console.log('clientui.spawnKongRobDialog');
    resolve();
  }

  /**
   * Called in `listenForClaim`, this function spawns a modal
   * that allows the user to claim a discard for the purposes
   * of declaring a win.
   */
  spawnWinDialog(discard, resolve, cancel) {
    // determine how this player could actually win on this tile.
    let { lookout } = this.player.tilesNeeded();

    let winOptions = { pair: false, chow: false, pung: false };
    let claimList = lookout[discard.getTileFace()];

    if (claimList) {
      claimList.forEach(type => {
        if (parseInt(type) === CLAIM.WIN) {
          let subtype = parseInt(type.split('s')[1]);
          if (subtype === CLAIM.PAIR) winOptions.pair = true;
          if (subtype >= CLAIM.CHOW && subtype < CLAIM.PUNG) winOptions.chow = true;
          if (subtype >= CLAIM.PUNG) winOptions.pung = true;
        }
      });
    }

    let options = [
      { label: "Actually, it doesn't", value: CLAIM.IGNORE },
      winOptions.pair ? { label: "Pair", value: CLAIM.PAIR } : false,
      winOptions.chow && this.canChow(discard, CLAIM.CHOW1) ? { label: "Chow (▮▯▯)", value: CLAIM.CHOW1 } : false,
      winOptions.chow && this.canChow(discard, CLAIM.CHOW2) ? { label: "Chow (▯▮▯)", value: CLAIM.CHOW2 } : false,
      winOptions.chow && this.canChow(discard, CLAIM.CHOW3) ? { label: "Chow (▯▯▮)", value: CLAIM.CHOW3 } : false,
      winOptions.pung ? { label: "Pung", value: CLAIM.PUNG } : false
    ];

    modal.choiceInput("How does this tile make you win?", options, result => {
      if (result === CLAIM.IGNORE) resolve({ claimtype: CLAIM.IGNORE });
      else resolve({ claimtype: CLAIM.WIN, wintype: result });
    }, cancel);
  }
}

if (typeof process !== "undefined") {
  module.exports = ClientUI;
}
