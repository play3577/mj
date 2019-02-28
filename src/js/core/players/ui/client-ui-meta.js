/**
 * This is a graphical interface that players can use
 * to visualise their game knowledge, and allow external
 * interaction (human overrides for bots, or just plain
 * human input for... well, humans)
 */
class ClientUIMeta {
  constructor(player, tracker) {
    this.player = player;
    this.tracker = tracker;
    // seed the "knowledge" panel with our tracker
    this.tracker.bindTo(document.querySelector(".knowledge"));
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

  /**
   *
   */
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

  /**
   *
   */
  clearTimeouts() {
    this.timeouts.forEach(t => clearTimeout(t));
    this.bar.style.width = `0%`;
    this.bar.classList.remove('active');
  }

  /**
   *
   */
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

  /**
   *
   */
  setRules(rules) {
    this.rules = rules;
  }

  /**
   *
   */
  handWillStart(redraw, resolve) {
    if (config.BOT_PLAY) return resolve();
    if (redraw) modal.choiceInput('Hand was a draw, ready to start again?', [{label: "ready",value: false}], resolve);
    else modal.choiceInput('Ready to start playing?', [{label: "ready!",value: false}], resolve);
  }

  /**
   *
   */
  markTilesLeft(remaining) {
    let ui = document.querySelector('.wall.data');
    ui.textContent = `${remaining} tiles left`;

  }

  /**
   *
   */
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

  /**
   *
   */
  removeLastDiscard() {
    if (this.discards.lastChild) {
      this.discards.removeChild(this.discards.lastChild);
    }
  }

  /**
   *
   */
  nextPlayer() {
    this.discards.lastChild.classList.remove('selectable');
  }

  /**
   *
   */
  haveSingle(tile) {
    let tiles = this.getAllTilesInHand(tile.dataset ? tile.getTileFace() : tile);
    return tiles.length >= 1;
  }

  /**
   *
   */
  canPung(tile) {
    let tiles = this.getAllTilesInHand(tile.dataset ? tile.getTileFace() : tile);
    return tiles.length >= 2;
  }

  /**
   *
   */
  canKong(tile) {
    let tiles = this.getAllTilesInHand(tile.dataset ? tile.getTileFace() : tile);
    return tiles.length === 3;
  }

  /**
   *
   */
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
   *
   */
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

  /**
   *
   */
  endOfGame(scores) {
    let v=0, b=-1;
    scores.forEach( (score,id) => { if (score>v) { v = score; b = id; }});
    this.playerbanks.forEach( (e,id) => {
      e.classList.remove('waiting');
      e.classList.remove('winner');
      if (id===b) e.classList.add('game-winner');
    });

    // clear out the player banks, discards, and tile tracker.
    let remove = [];
    this.playerbanks.forEach(bank => {
      remove = [...remove, ...bank.querySelectorAll('.tile')];
    });
    remove = [...remove, ...this.discards.querySelectorAll('.tile')];
    remove.forEach(t => t.parentNode.removeChild(t));

    // and then for aesthetic purposes, fill the player banks and tracker
    this.playerbanks.forEach(bank => {
      new Array(13).fill(-1).forEach(t => bank.appendChild(create(t)));
    });

    this.tracker.reset();
  }

  /**
   *
   */
  recordScores(scores) {
    scores.forEach((score, b) => {
      let d = this.playerbanks[b].dataset;
      if (!d.score) d.score = 0;
      d.score = parseInt(d.score) + score;
    });
  }

  /**
   *
   */
  markHand(hand, wind) {
    this.el.dataset.wind = ['東','南','西','北'][wind];
  }

  /**
   *
   */
  activate(id) {
    this.playerbanks.forEach(b => b.classList.remove('active'));
    this.playerbanks[id].classList.add('active');
    if (id != this.id) {
      let latest = this.el.querySelector('.tile.latest');
      if (latest) latest.classList.remove('latest');
    }
  }

  /**
   *
   */
  disable() {
    this.el.classList.remove('active');
  }

  /**
   *
   */
  markWaiting(val) {
    if (val) this.el.classList.add('waiting');
    else this.el.classList.remove('waiting');
  }

  /**
   *
   */
  markWinner(wincount) {
    this.el.dataset.wincount = wincount;
    this.el.classList.add('winner');
    this.el.classList.remove('active');
  }

  /**
   *
   */
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

  /**
   *
   */
  remove(tile) {
    this.el.removeChild(tile);
  }

  /**
   *
   */
  lockClaim(tiles) {
    this.removeLastDiscard();
    let locknum = 1 + this.getLockedTiles().length;
    tiles.forEach(tile => {
      tile.dataset.locknum = locknum;
      this.append(tile);
    });
    this.sortTiles();
  }

  /**
   *
   */
  meldKong(tile) {
    // find another tile like this, but locked, which can only be a pung.
    let other = this.el.querySelector(`.tile[data-locked][data-tile='${tile.getTileFace()}']`);
    tile.dataset.locknum = other.dataset.locknum;
    tile.dataset.locked = 'locked';
    this.el.appendChild(tile);
    this.sortTiles();
  }

  /**
   *
   */
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

  /**
   *
   */
  see(tiles, player) {
    console.debug(`${this.id} sees ${tiles.map(t => t.dataset ? t.getTileFace() : t)} from ${player.id}`);

    let bank = this.playerbanks[player.id];

    // create a new locked set
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

    this.sortTiles(bank);
  }

  /**
   *
   */
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
      this.renderClaimAnnouncement(player.id, claim.claimtype);
    }
  }

  /**
   *
   */
  renderClaimAnnouncement(pid, claimtype) {
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

  /**
   *
   */
  receivedTile(player) {
    if (player.id === this.id) return;
    let bank = this.playerbanks[player.id];
    bank.append(create(-1));
    this.sortTiles(bank);
  }

  /**
   *
   */
  sortTiles(bank) {
    bank = (bank||this.el);
    Array
    .from(bank.querySelectorAll('.tile'))
    .sort(this.tilebank_sort_function)
    .forEach(tile => bank.appendChild(tile));
  }

  /**
   *
   */
  getLockedTiles(bank) {
    return (bank||this.el).querySelectorAll('.tile[data-locked]');
  }

  /**
   *
   */
  getAvailableTiles() {
    return this.el.querySelectorAll('.tile:not([data-bonus]):not([data-locked])');
  }

  /**
   *
   */
  getSingleTileFromHand(tile) {
    return this.el.querySelector(`.tile[data-tile='${tile}']:not([data-locked])`);
  }

  /**
   *
   */
  getAllTilesInHand(tile) {
    return this.el.querySelectorAll(`.tile[data-tile='${tile}']:not([data-locked])`);
  }

  /**
   *
   */
  getTiles(allTiles) {
    return this.el.querySelectorAll(`.tile${allTiles ? ``: `:not([data-locked])`}`);
  }

  /**
   *
   */
  getTileFaces(allTiles) {
    return Array.from(this.getTiles(allTiles)).map(t => t.getTileFace());
  }

  /**
   *
   */
  getDuplicates(tile) {
    return this.el.querySelectorAll(".tile[data-tile='"+tile+"']:not([data-locked])");
  }

  /**
   *
   */
  getLatestTile() {
    return this.el.querySelector(`.latest`);
  }

  /**
   *
   */
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
