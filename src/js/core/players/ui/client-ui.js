/**
 * This is a graphical interface that players can use
 * to visualise their game knowledge, and allow external
 * interaction (human overrides for bots, or just plain
 * human input for... well, humans)
 */
class ClientUI {
  constructor(player) {
    this.player = player;
    this.id = player.id;
    this.timeouts = [];
    this.discards = document.querySelector(".discards");
    this.playerbanks = document.querySelectorAll(".player");
    this.el = this.playerbanks[this.id];

    this.reset();

    // Super debug setting: allows bots to tap directly
    // into the player's UI. This is super bad, but for
    // development purposes, rather required.
    if (config.FORCE_OPEN_BOT_PLAY) {
      window.PLAYER_BANKS = this.playerbanks;
      window.PLAYER_BANKS.sortTiles = e => this.sortTiles(e);
    }
  }

  reset() {
    if(!this.el) return;

    this.el.setAttribute("class", "player");
    this.playerbanks.forEach(b => {
      b.innerHTML = '';
      b.classList.remove('winner');
    });
    this.el.innerHTML = '';

    let discards = this.discards;
    discards.innerHTML = '';
    discards.setAttribute('class', 'discards');

    this.bar = document.createElement('div');
    this.bar.classList.add('countdown-bar');
    this.discards.appendChild(this.bar);

    this.clearTimeouts();
  }

  clearTimeouts() {
    this.timeouts.forEach(t => clearTimeout(t));
    this.bar.style.width = `0%`;
    this.bar.classList.remove('active');
  }

  startCountDown(ms) {
    this.bar.classList.add('active');
    let update = fraction => (this.bar.style.width = `${100 - 100 * fraction}%`);
    for (let i=0, fraction, e=10; i<=e; i++) {
      fraction = i/e;
      this.timeouts.push(setTimeout(() => update(fraction), ms*fraction));
    }
    this.timeouts.push(setTimeout(() => {
      update(1);
      this.bar.classList.remove('active');
    }, ms + 10));
  }

  setRules(rules) {
    // ...not used at the moment, but could be useful a "view rules" dialog...
  }

  handWillStart(resolve) {
    if (config.BOT_PLAY) return resolve();
    modal.choiceInput('Ready to start playing?', [{label: "ready!",value: false}], resolve);
  }

  markTilesLeft(remaining) {
    let ui = document.querySelector('.wall.data');
    ui.textContent = `${remaining} tiles left`;

  }

  async confirmKong(tile, resolve) {
    if (config.BOT_PLAY) return resolve(true);

    let cancel = () => resolve(false);
    modal.choiceInput(`Declare kong (${config.TILE_NAMES[tile]})?`, [
      { label: 'Absolutely', value: 'yes' },
      { label: 'No, I have plans for those tiles', value: 'no' },
    ], result => {
      if (result==='yes') resolve(true);
      else resolve(false);
    }, cancel);
  }

  listenForDiscard(resolve, suggestion, lastClaim) {
    let listenForInput = true;
    let tiles = this.getAvailableTiles();
    let latestTile = this.getLatestTile();
    let currentTile = latestTile;
    let curid = currentTile ? Array.from(tiles).indexOf(currentTile) : 0;
    if (curid===0) currentTile = tiles[0];

    let suggestedTile = false;

    if (suggestion) {
      suggestedTile = this.getSingleTileFromHand(suggestion.getTileFace());
      suggestedTile.classList.add('suggestion');
      suggestedTile.setAttribute('title','Bot-recommended discard.');
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
      tile.classList.remove('highlight');
      resolve(e.target);
    };

    let evtStart = e => {
      // declaration using mouse = long press
      if (e.which !== 1) return;
      setTimeout(() => {
        if (!listenForInput) return;
        e.stopPropagation();
        e.target.removeEventListener("click", pickAsDiscard);
        this.spawnDeclarationModal(this.getLatestTile(), pickAsDiscard);
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
        tile.removeEventListener("mouseover", highlightTile);
        tile.removeEventListener("click", pickAsDiscard);
        tile.removeEventListener("mousedown", evtStart);
        tile.removeEventListener("touchstart", evtStart);
      });
    });

    // mouse interaction
    tiles.forEach(tile => {
      tile.classList.add('selectable');
      tile.addEventListener("mouseover", highlightTile);
      tile.addEventListener("click", pickAsDiscard);
      tile.addEventListener("mousedown", evtStart);
      tile.addEventListener("touchstart", evtStart);
    });

    // keyboard interaction
    let listenForKeys = (() => {
      let tlen = tiles.length;

      currentTile.classList.add('highlight');

      return evt => {
        let code = evt.keyCode;
        let willBeHandled = (VK_LEFT[code] || VK_RIGHT[code] || VK_UP[code] || VK_DOWN[code] || VK_SIGNAL[code] || VK_START[code] || VK_END[code]);
        if (!willBeHandled) return;
        evt.preventDefault();

        if (VK_LEFT[code]) curid = (currentTile === false) ? tlen - 1 : (curid === 0) ? tlen - 1 : curid - 1;
        if (VK_RIGHT[code]) curid = (currentTile === false) ? 0 : (curid === tlen-1) ? 0 : curid + 1;
        if (VK_START[code]) curid = 0;
        if (VK_END[code]) curid = tlen-1;

        currentTile = tiles[curid];
        highlightTile({ target: currentTile });

        if (VK_UP[code] || VK_SIGNAL[code]) {
          currentTile.classList.remove('highlight');
          pickAsDiscard({ target: currentTile });
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
   * spawn a declaration modal for declaring a kong or a win-on-own-turn
   */
  spawnDeclarationModal(currentTile, pickAsDiscard) {
    let face = currentTile.getTileFace();
    let allInHand = this.getAllTilesInHand(face);
    let canKong = false;

    // do we have a concealed kong?
    if (allInHand.length === 4) canKong = true;
    // can we meld a kong?
    else if (this.player.locked.some(set => set.every(t => t.getTileFace()==face))) canKong = true;

    // can we win?
    let { winpaths } = tilesNeeded(this.player.getTileFaces(), this.player.locked);
    let canWin = winpaths.length > 0;

    if (!canWin) {
      let allTiles = this.getTileFaces(true).filter(t => t<34);
      canWin = this.player.rules.checkAllTilesForLimit(allTiles);
    }

    // build the self-declare options for this action
    let options = [
      { label: "on second thought, never mind", value: CLAIM.IGNORE },
      canKong ? { label: "I'm declaring a kong", value: CLAIM.KONG } : false,
      canWin ? { label: "I just won", value: CLAIM.WIN } : false
    ].filter(v=>v);

    modal.choiceInput("Declare a kong or win?", options, result => {
      if (result === CLAIM.KONG) {
        currentTile.exception = CLAIM.KONG;
        currentTile.kong = [...allInHand];;
        currentTile.classList.remove('highlight');
        pickAsDiscard({ target: currentTile });
      }
      if (result === CLAIM.WIN) pickAsDiscard({ target: undefined });
    });
  }

  removeLastDiscard() {
    if (this.discards.lastChild) {
      this.discards.removeChild(this.discards.lastChild);
    }
  }

  nextPlayer() {
    this.discards.lastChild.classList.remove('selectable');
  }

  haveSingle(tile) {
    let tiles = this.getAllTilesInHand(tile.dataset ? tile.getTileFace() : tile);
    return tiles.length >= 1;
  }

  canPung(tile) {
    let tiles = this.getAllTilesInHand(tile.dataset ? tile.getTileFace() : tile);
    return tiles.length >= 2;
  }

  canKong(tile) {
    let tiles = this.getAllTilesInHand(tile.dataset ? tile.getTileFace() : tile);
    return tiles.length === 3;
  }

  canChow(tile, type) {
    tile = (tile.dataset ? tile.getTileFace() : tile);
    if (tile > 26) return false;
    let face = tile % 9;
    let t1, t2;
    if (type === CLAIM.CHOW1) {
      if (face > 6) return false;
      t1 = tile + 1;
      t2 = tile + 2;
    }
    if (type === CLAIM.CHOW2) {
      if (face===0 || face===8) return false;
      t1 = tile - 1;
      t2 = tile + 1;
    }
    if (type === CLAIM.CHOW3) {
      if (face < 2) return false;
      t1 = tile - 2;
      t2 = tile - 1;
    }
    return this.getSingleTileFromHand(t1) && this.getSingleTileFromHand(t2);
  }

  /**
   * Can be trigger both during discard and claim phases.
   */
  spawnWinDialog(discard, resolve, cancel) {
    // determine how this player could actually win on this tile.
    let { lookout } = tilesNeeded(this.player.getTileFaces(), this.player.locked);

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

  listenForClaim(pid, discard, resolve, interrupt) {
    let tile = this.discards.lastChild;
    let mayChow = (((pid + 1)%4) == this.id);

    let triggerClaimDialog = evt => {
      if(evt) evt.stopPropagation();

      interrupt();
      this.clearTimeouts();
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
        tile.classList.remove('selectable');
        tile.removeEventListener("click", triggerClaimDialog);
        if (result === CLAIM.WIN) return this.spawnWinDialog(discard, resolve, cancel);
        resolve({ claimtype: result });
      }, cancel);
    }

    let ignore = () => {
      interrupt();
      tile.classList.remove('selectable');
      tile.removeEventListener("click", triggerClaimDialog);
      this.clearTimeouts();
      this.discards.removeEventListener("click", ignore);
      resolve(CLAIM.IGNORE);
    };

    // mouse interaction
    tile.classList.add('selectable');
    tile.addEventListener("click", triggerClaimDialog);
    this.discards.addEventListener("click", ignore);

    // keyboard interaction
    let listenForKeys = evt => {
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

  endOfHand(disclosure) {
    if (!disclosure) {
      this.discards.classList.add('exhausted');
      return;
    }

    disclosure.forEach( (res,id) => {
      if (id == this.id) return;
      let bank = this.playerbanks[id];
      bank.innerHTML = '';

      res.bonus.forEach(t => {
        t = create(t);
        t.dataset.locked = 'locked';
        t.dataset.bonus = 'bonus';
        bank.appendChild(t);
      });

      let locknum = 1 + this.getLockedTiles(bank).length;

      res.locked.forEach(s => {
        s.forEach(t => {
          let n = create(t.getTileFace());
          n.dataset.locked = 'locked';
          n.dataset.locknum = locknum;
          if (t.dataset.winning) n.dataset.winning = 'winning';
          bank.appendChild(n);
        });
        locknum += s.length;
      });

      res.concealed.sort((a,b)=>(a-b)).forEach(t => bank.appendChild(create(t)));

      if (res.winner) {
        this.discards.classList.add('winner');
        bank.classList.add('winner');
      }

      bank.dataset.wincount = res.wincount;
      this.sortTiles(bank);
    });
  }

  endOfGame(scores) {
    let v=0, b=-1;
    scores.forEach( (score,id) => { if (score>v) { v = score; b = id; }});
    this.playerbanks.forEach( (e,id) => {
      e.classList.remove('waiting');
      e.classList.remove('winner');
      if (id===b) e.classList.add('game-winner');
    });
  }

  recordScores(scores) {
    scores.forEach((score, b) => {
      let d = this.playerbanks[b].dataset;
      if (!d.score) d.score = 0;
      d.score = parseInt(d.score) + score;
    });
  }

  markHand(hand, wind) {
    this.el.dataset.wind = ['東','南','西','北'][wind];
  }

  activate(id) {
    this.playerbanks.forEach(b => b.classList.remove('active'));
    this.playerbanks[id].classList.add('active');
    if (id != this.id) {
      let latest = this.el.querySelector('.tile.latest');
      if (latest) latest.classList.remove('latest');
    }
  }

  disable() {
    this.el.classList.remove('active');
  }

  markWaiting(val) {
    if (val) this.el.classList.add('waiting');
    else this.el.classList.remove('waiting');
  }

  markWinner(wincount) {
    this.el.dataset.wincount = wincount;
    this.el.classList.add('winner');
    this.el.classList.remove('active');
  }

  append(t) {
    let old = this.el.querySelector('.tile.latest');
    if (old) {
      old.classList.remove('latest');
      old.removeAttribute('title');
    }
    if (!t.dataset.locked) {
      t.classList.add('latest');
      t.setAttribute('title', 'latest tile');
    }
    this.el.appendChild(t);
    this.sortTiles();
  }

  remove(tile) {
    this.el.removeChild(tile);
  }

  lockClaim(tiles) {
    this.removeLastDiscard();
    let locknum = 1 + this.getLockedTiles().length;
    tiles.forEach(tile => {
      tile.dataset.locknum = locknum;
      this.append(tile);
    });
    this.sortTiles();
  }

  meldKong(tile) {
    // find another tile like this, but locked, which can only be a pung.
    let other = this.el.querySelector(`.tile[data-locked][data-tile='${tile.getTileFace()}']`);
    tile.dataset.locknum = other.dataset.locknum;
    tile.dataset.locked = 'locked';
    this.el.appendChild(tile);
    this.sortTiles();
  }

  playerDiscarded(player, tile) {
    let bank = this.playerbanks[player.id];

    console.debug(`${this.id} sees discard ${tile} from ${player.id}`);

    if (player.id != this.id) {
      let blank = bank.querySelector(`[data-tile="-1"]`);
      if (blank) bank.removeChild(blank);
    }

    let discard = create(tile);
    discard.classList.add('discard');
    discard.dataset.from = player.id;
    this.discards.appendChild(discard);

    if (!config.BOT_PLAY && player.id !== this.id) this.startCountDown(config.CLAIM_INTERVAL);

    this.sortTiles(bank);
  }

  see(tiles, player, melded=false) {
    console.debug(`${this.id} sees ${tiles.map(t => t.dataset ? t.getTileFace() : t)} from ${player.id} (melded: ${melded})`);

    let bank = this.playerbanks[player.id];

    // find the existing locked set and ammend
    if (melded) {
      console.trace();
      console.log(`finding locked set to meld ${tile} into.`);

      // TODO: DOES THIS STILL APPLY? MAKE WALL HACK
    }

    // create a new locked set
    else {
      let locknum = 1 + bank.querySelectorAll(`[data-locked]`).length;
      tiles.forEach(tile => {
        let face = (tile.dataset ? tile.getTileFace() : tile);

        if (player.id != this.id) {
          // remove a "blank" tile to replace with the one we're seeing.
          let blank = bank.querySelector(`[data-tile="-1"]`);
          if (blank) bank.removeChild(blank);
        }

        let e = create(face);
        if (tile.dataset && tile.dataset.hidden) e.dataset.hidden = 'hidden';
        e.dataset.locked = 'locked';
        e.dataset.locknum = locknum;
        bank.appendChild(e);
      });
    }

    this.sortTiles(bank);
  }


  seeClaim(tiles, player, claim) {
    // this differs from see() in that we know we need to remove one
    // "blank" tile fewer than are being revealed. So we add one, and
    // then call see() to offset the otherwise superfluous removal.
    let bank = this.playerbanks[player.id];
    let blank = create(-1);
    bank.appendChild(blank);
    this.removeLastDiscard();
    this.see(tiles, player);

    // add a visual signal
    if (!config.BOT_PLAY) {
      this.announceClaim(player.id, claim.claimtype);
    }
  }

  announceClaim(pid, claimtype) {
    let label = 'win';
    if (claimtype === 16) label = 'kong';
    if (claimtype === 8) label = 'pung';
    if (claimtype < 8) label = 'chow';
    let ann = document.createElement('div');
    ann.classList.add('announcement');
    ann.textContent = `${label}!`;
    ann.dataset.player = pid;
    document.querySelector('.board').appendChild(ann);
    ann.addEventListener('transitionend ', () => {
      ann.parentNode.removeChild(ann);
    });
  }

  prepareForClaim(player, tile) {
    // The discarded tile is getting claimed, so it
    // won't be in the discard pile anymore
    this.removeLastDiscard();

    // Add a blank tile, so we don't "over-remove" blanks
    this.receivedTile(player);
  }

  receivedTile(player) {
    if (player.id === this.id) return;
    let bank = this.playerbanks[player.id];
    bank.append(create(-1));
    this.sortTiles(bank);
  }

  sortTiles(bank) {
    bank = (bank||this.el);
    Array
    .from(bank.querySelectorAll('.tile'))
    .sort(this.tilebank_sort_function)
    .forEach(tile => bank.appendChild(tile));
  }

  getLockedTiles(bank) {
    return (bank||this.el).querySelectorAll('.tile[data-locked]');
  }

  getAvailableTiles() {
    return this.el.querySelectorAll('.tile:not([data-bonus]):not([data-locked]');
  }

  getSingleTileFromHand(tile) {
    return this.el.querySelector(`.tile[data-tile='${tile}']:not([data-locked]`);
  }

  getAllTilesInHand(tile) {
    return this.el.querySelectorAll(`.tile[data-tile='${tile}']:not([data-locked]`);
  }

  getTiles(allTiles) {
    return this.el.querySelectorAll(`.tile${allTiles ? ``: `:not([data-locked]`}`);
  }

  getTileFaces(allTiles) {
    return Array.from(this.getTiles(allTiles)).map(t => t.getTileFace());
  }

  getDuplicates(tile) {
    return this.el.querySelectorAll(".tile[data-tile='"+tile+"']:not([data-locked])");
  }

  getLatestTile() {
    return this.el.querySelector(`.latest`);
  }

  reveal() {
    Array.from(this.el.querySelectorAll(".tile")).forEach(t => {delete t.dataset.hidden;});
  }

  // Sort tiles ordered as:
  // 1: bonus tiles
  // 2: locked tiles, sorted
  // 3: unlocked tiles, sorted
  // 4: concealed tiles
  tilebank_sort_function(a,b) {
    let la = a.dataset.locknum;
    let lb = b.dataset.locknum;

    a = a.getTileFace();
    b = b.getTileFace();

    // 1: bonus tiles always go on the far left
    if (a>33 || b>33) {
      if (a>33 && b>33) return a-b;
      if (a>33) return -1;
      return 1;
    }

    // 2: locked tiles
    if (la || lb) {
      if (la && lb) return (la===lb) ? a - b : la - lb;
      if (la) return -1;
      return 1;
    }

    // 4 (out of order): for concealed tiles to the right
    if (a===-1) return 1;
    if (b===-1) return -1;

    // 3: plain compare for regular tiles
    return a - b;
  }
}
