/**
 * This is a graphical interface that players can use
 * to visualise their game knowledge, and allow external
 * interaction (human overrides for bots, or just plain
 * human input for... well, humans)
 */
class ClientUI {
  constructor(id) {
    this.id = id;
    this.discards = document.querySelector(".discards");
    this.playerbanks = document.querySelectorAll(".player");
    this.el = this.playerbanks[2];
    this.reset();
  }

  reset() {
    this.el.setAttribute("class", "player");
    this.playerbanks.forEach(b => {
      b.innerHTML = '';
      b.classList.remove('winner');
    });
    this.el.innerHTML = '';

    let discards = this.discards;
    discards.innerHTML = '';
    discards.setAttribute('class', 'discards');
  }

  handWillStart() {
    // when the game starts, we know one thing about all
    // players: they have 13 tiles.
    this.playerbanks.forEach((b,i) => {
      if (b === this.el) return;
      for(let i=0; i<13; i++) {
        b.appendChild(create(-1));
      }
    });
    // NOTE: THIS IS NOT TRUE IF SOMEONE DECLARED A KONG
    // IMMEDIATELY but then again we haven't add that
    // logic in yet so let's not worry about that right now.
  }

  endOfHand(disclosure) {
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

  markTurn(turn, wind) {
    this.el.dataset.wind = ['東','南','西','北'][wind];
  }

  activate() {
    this.el.classList.add('active');
  }

  disable() {
    this.el.classList.remove('active');
  }

  markWaiting(val) {
    if (val) this.el.classList.add('waiting');
    else this.el.classList.remove('waiting');
  }

  markWinner() {
    this.el.dataset.wincount = parseInt( this.el.dataset.wincount || 0 ) + 1;
  }

  getWinCount() {
    return this.el.dataset.wincount;
  }

  winner() {
    this.el.classList.add('winner');
    this.el.classList.remove('active');
  }

  append(t) {
    this.el.appendChild(t);
    this.sortTiles();
  }

  see(tile, player, discard, locked) {
    let bank = this.playerbanks[player.id];
    if (!discard) {
      let e = create(tile);
      if (locked !== false) e.dataset.locked = 'locked';
      if (tile < 34) {
        let blank = bank.querySelector('[data-tile="-1"]');
        if (blank) bank.replaceChild(e, blank);
        else bank.appendChild(e);
      }
      else bank.appendChild(e);
    }
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
