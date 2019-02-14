/**
 * This is a graphical interface that players can use
 * to visualise their game knowledge, and allow external
 * interaction (human overrides for bots, or just plain
 * human input for... well, humans)
 */
class ClientUI extends TileBank {
  constructor(id) {
    super(id);
    this.discards = document.querySelector(".discards");
    this.playerbanks = document.querySelectorAll(".player");
    this.el = this.playerbanks[2];
    this.timeouts = [];
    this.reset();

    // Super debug setting: allows bots to tap directly
    // into the player's UI. This is super bad, but for
    // development purposes, rather required.
    if (config.FORCE_OPEN_BOT_PLAY) {
      PLAYER_BANKS.banks = this.playerbanks;
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
  }

  startCountDown(ms) {
    let update = fraction => (this.bar.style.width = `${100 - 100 * fraction}%`);
    for (let i=0, fraction, e=10; i<=e; i++) {
      fraction = i/e;
      this.timeouts.push(setTimeout(() => update(fraction), ms*fraction));
    }
    this.timeouts.push(setTimeout(() => update(1), ms + 10));
  }

  listenForDiscard(resolve, suggestion, lastClaim) {
    let tiles = this.getAvailableTiles();

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
    if (!suggestion) {
      return modal.setContent("Declare win?", [
        { label: 'You better believe it!', value: 'win' },
        { label: 'No, I think I can do better...', value: '' },
      ], result => {
        if (result) resolve(undefined);
        else this.listenForDiscard(resolve, true);
      });
    }

    let stile = this.getSingleTileFromHand(suggestion.dataset.tile);
    stile.classList.add('suggestion');
    stile.setAttribute('title','Bot-recommended discard.');

    let pickAsDiscard = e => {
      stile.classList.remove('suggestion');
      stile.removeAttribute('title');
      tiles.forEach(tile => {
        tile.classList.remove('selectable');
        tile.removeEventListener("click", pickAsDiscard);
      });
      resolve(e.target);
    };

    tiles.forEach(tile => {
      tile.classList.add('selectable');
      tile.addEventListener("click", pickAsDiscard);
    });
  }

  removeLastDiscard() {
    this.discards.removeChild(this.discards.lastChild);
  }

  nextPlayer() {
    this.discards.lastChild.classList.remove('selectable');
  }

  haveSingle(tile) {
    let tiles = this.getAllTilesInHand(tile.dataset ? tile.dataset.tile : tile);
    return tiles.length >= 1;
  }

  canPung(tile) {
    let tiles = this.getAllTilesInHand(tile.dataset ? tile.dataset.tile : tile);
    return tiles.length >= 2;
  }

  canKong(tile) {
    let tiles = this.getAllTilesInHand(tile.dataset ? tile.dataset.tile : tile);
    return tiles.length === 3;
  }

  canChow(tile, type) {
    tile = (tile.dataset ? tile.dataset.tile : tile) |0;
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

  listenForClaim(pid, discard, resolve, interrupt) {
    let tile = this.discards.lastChild;
    let mayChow = (((pid + 1)%4) == this.id);

    let fn = e => {
      interrupt();
      this.clearTimeouts();
      let CLAIM = config.CLAIM;

      // let's spawn a little modal to see what the user actually wanted to do here.
      modal.setContent("What kind of claim are you making?", [
        { label: "Ignore", value: CLAIM.IGNORE },
        (mayChow && this.canChow(discard, CLAIM.CHOW1)) ? { label: "Chow (X**)", value: CLAIM.CHOW1 } : false,
        (mayChow && this.canChow(discard, CLAIM.CHOW2)) ? { label: "Chow (*X*)", value: CLAIM.CHOW2 } : false,
        (mayChow && this.canChow(discard, CLAIM.CHOW3)) ? { label: "Chow (**X)", value: CLAIM.CHOW3 } : false,
        this.canPung(discard) ? { label: "Pung", value: CLAIM.PUNG } : false,
        this.canKong(discard) ? { label: "Kong", value: CLAIM.KONG } : false,
        { label: "Win", value: CLAIM.WIN }, // Let's not pre-filter this one
      ], result => {
        tile.classList.remove('selectable');
        tile.removeEventListener("click", fn);
        if (result === CLAIM.WIN) {
          modal.setContent("How does this tile make you win?", [
            { label: "Actually, it doesn't", value: CLAIM.IGNORE },
            this.haveSingle(discard) ? { label: "Pair", value: CLAIM.PAIR } : false,
            this.canChow(discard, CLAIM.CHOW1) ? { label: "Chow (X**)", value: CLAIM.CHOW1 } : false,
            this.canChow(discard, CLAIM.CHOW2) ? { label: "Chow (*X*)", value: CLAIM.CHOW2 } : false,
            this.canChow(discard, CLAIM.CHOW3) ? { label: "Chow (**X)", value: CLAIM.CHOW3 } : false,
            this.canPung(discard) ? { label: "Pung", value: CLAIM.PUNG } : false
          ], result => {
            if (result === CLAIM.IGNORE) resolve({ claimtype: CLAIM.IGNORE });
            else resolve({ claimtype: CLAIM.WIN, wintype: result });
          });
          return;
        }
        resolve({ claimtype: result });
      });
    }

    tile.classList.add('selectable');
    tile.addEventListener("click", fn);
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

      res.concealed.forEach(t => bank.appendChild(create(t)));

      res.locked.forEach(s => {
        s.forEach(t => {
          let n = create(t.dataset.tile);
          n.dataset.locked = 'locked';
          if (t.dataset.winning) n.dataset.winning = 'winning';
          bank.appendChild(n);
        });
      })

      res.bonus.forEach(t => {
        t = create(t);
        t.dataset.locked = 'locked';
        t.dataset.bonus = 'bonus';
        bank.appendChild(t);
      });

      if (res.winner) {
        this.discards.classList.add('winner');
        bank.classList.add('winner');
      }

      bank.dataset.wincount = res.wincount;
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
  }

  winner() {
    this.el.classList.add('winner');
    this.el.classList.remove('active');
  }

  append(t) {
    this.el.appendChild(t);
    this.sortTiles();
  }

  remove(discard) {
    this.el.removeChild(discard);
  }

  lockClaim(tiles) {
    // visual set locking is handled by see()/4 for human players,
    // we the one thing we do need to do is remove that last discard.
    this.removeLastDiscard();
  }

  playerDiscarded(player, tile) {
    let bank = this.playerbanks[player.id];

    Logger.debug(`${this.id} sees discard ${tile} from ${player.id}`);

    if (player.id != this.id) {
      let blank = bank.querySelector(`[data-tile="-1"]`);
      if (blank) bank.removeChild(blank);
    }

    let discard = create(tile);
    discard.classList.add('discard');
    discard.dataset.from = player.id;
    this.discards.appendChild(discard);

    if (!config.BOT_PLAY) this.startCountDown(config.CLAIM_INTERVAL);

    this.sortTiles(bank);
  }

  see(tiles, player) {
    let bank = this.playerbanks[player.id];

    Logger.debug(`${this.id} sees ${tiles.map(t => t.dataset ? t.dataset.tile : t)} from ${player.id}`);

    tiles.forEach(tile => {
      let face = (tile.dataset ? tile.dataset.tile : tile)|0;

      if (player.id != this.id) {
        // remove a "blank" tile to replace with the one we're seeing.
        let blank = bank.querySelector(`[data-tile="-1"]`);
        if (blank) bank.removeChild(blank);
      }

      let e = create(face);
      if (tile.dataset && tile.dataset.hidden) e.dataset.hidden = 'hidden';
      e.dataset.locked = 'locked';
      bank.appendChild(e);
    });

    this.sortTiles(bank);
  }


  seeClaim(tiles, player, claim) {
    // this differs from see() in that we know we need to remove one
    // "blank" tile fewer than are being revealed. So we add one, and
    // then call see() to offset the otherwise superfluous removal.
    let bank = this.playerbanks[player.id];
    let blank = create(-1);
    bank.appendChild(blank);
    this.see(tiles, player);

    // add a visual signal
    if (!config.BOT_PLAY) {
      this.yellClaim(player.id, claim.claimtype);
    }
  }

  yellClaim(pid, claimtype) {
    let label = 'win';
    if (claimtype === 16) label = 'kong';
    if (claimtype === 8) label = 'pung';
    if (claimtype < 8) label = 'chow';
    let yell = document.createElement('div');
    yell.classList.add('yell');
    yell.textContent = `${label}!`;
    yell.dataset.player = pid;
    document.querySelector('.board').appendChild(yell);
    yell.addEventListener('transitionend ', () => {
      yell.parentNode.removeChild(yell);
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

  sortTiles(e) {
    e = e || this.el;
    Array
    .from(e.querySelectorAll('.tile'))
    .sort(config.SORT_TILE_FN)
    .forEach(tile => e.appendChild(tile));
  }

  getAvailableTiles() {
    return this.el.querySelectorAll('.tile:not([data-bonus]):not([data-locked]');
  }

  getSingleTileFromHand(tile) {
    Logger.debug('searching for',tile,'in hand');
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

  reveal() {
    Array.from(this.el.querySelectorAll(".tile")).forEach(t => {delete t.dataset.hidden;});
  }
}
