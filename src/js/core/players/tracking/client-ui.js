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

  handWillStart() {
    // not doing anything here for now.
  }

  startCountDown(ms) {
    let update = fraction => (this.bar.style.width = `${100 - 100 * fraction}%`);
    for (let i=0, fraction, e=10; i<=e; i++) {
      fraction = i/e;
      this.timeouts.push(setTimeout(() => update(fraction), ms*fraction));
    }
    this.timeouts.push(setTimeout(() => update(1), ms + 10));
  }

  listenForDiscard(resolve, suggestion) {
    let tiles = [];

    let stile = this.getSingleTileFromHand(suggestion.dataset.tile);
    stile.classList.add('suggestion');

    let fn = e => {
      stile.classList.remove('suggestion');
      tiles.forEach(tile => {
        tile.classList.remove('selectable');
        tile.removeEventListener("click", fn);
      });
      resolve(e.target);
    };

    tiles = this.getAvailableTiles();
    tiles.forEach(tile => {
      tile.classList.add('selectable');
      tile.addEventListener("click", fn);
    });
  }

  removeLastDiscard() {
    this.discards.removeChild(this.discards.lastChild);
  }

  nextPlayer() {
    this.discards.lastChild.classList.remove('selectable');
  }

  listenForClaim(pid, discard, resolve, interrupt) {
    let tile = this.discards.lastChild;

    let fn = e => {
      interrupt();
      this.clearTimeouts();

      // let's spawn a little modal to see what the user actually wanted to do here.
      modal.setContent("What kind of claim are you making?", [
        { label: "Cancel", value: CLAIM.IGNORE },
        { label: "Chow (X**)", value: CLAIM.CHOW1 },
        { label: "Chow (*X*)", value: CLAIM.CHOW2 },
        { label: "Chow (**X)", value: CLAIM.CHOW3 },
        { label: "Pung", value: CLAIM.PUNG },
        { label: "Kong", value: CLAIM.KONG },
        { label: "Win", value: CLAIM.WIN },
      ], result => {
        tile.classList.remove('selectable');
        tile.removeEventListener("click", fn);
        if (result === CLAIM.WIN) {
          modal.setContent("How does this tile make you win?", [
            { label: "Cancel", value: CLAIM.IGNORE },
            { label: "Pair", value: CLAIM.PAIR },
            { label: "Chow (X**)", value: CLAIM.CHOW1 },
            { label: "Chow (*X*)", value: CLAIM.CHOW2 },
            { label: "Chow (**X)", value: CLAIM.CHOW3 },
            { label: "Pung", value: CLAIM.PUNG }
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
      res.concealed.forEach(t => this.see(t, {id}, false, false));
      res.locked.forEach(s => {
        if (!s[0].dataset.winning) return;
        s.forEach(t => bank.querySelector(`[data-locked][data-tile="${t.dataset.tile}"]:not([data-winning])`).dataset.winning = 'winning');
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

  markTurn(turn, wind) {
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

  lock(tiles) {
    // visual set locking is handled by see()/4 instead for human players.
  }

  see(tile, player, discard, locked=true, concealed=false) {
    let bank = this.playerbanks[player.id];

    // remove a blank (for not-us banks)
    if (player.id !== this.id) {
      let blank = bank.querySelector(`[data-tile="-1"]`);
      if (blank) bank.removeChild(blank);
    }

    if (!discard) {
      let e = create(tile);
      if (concealed) e.dataset.hidden = 'hidden';
      if (locked === true) e.dataset.locked = 'locked';
      bank.appendChild(e);
    } else {
      discard = create(tile);
      discard.classList.add('discard');
      discard.dataset.from = player.id;
      this.discards.appendChild(discard);
      if (!BOT_PLAY) this.startCountDown(CLAIM_INTERVAL);
    }
    this.sortTiles(bank);
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
    .sort(SORT_TILE_FN)
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
