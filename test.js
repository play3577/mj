const BOT_PLAY = true;
const CONCEALED = true;
const LOW_TO_HIGH = (a,b) => { a = a.score; b = b.score; return a - b; };
const CLAIM = { IGNORE: 0, CHOW: 1, CHOW1: 1, CHOW2: 2, CHOW3: 3, PUNG: 4, KONG: 8, WIN: 16 };
const CLAIM_INTERVAL = 5000;
const PLAY_INTERVAL = 20;
const ARTIFICIAL_HUMAN_DELAY = 10;
const SORT_TILE_FN = (a,b) => a.getTileFace() - b.getTileFace();

const create = (t, hidden) => {
  let span = document.createElement('span');
  span.className = 'tile';
  span.dataset.tile = t;
  if (t < 34) {
    if (hidden) { span.dataset.hidden = 'hidden'; }
  } else {
    span.dataset.bonus = 'bonus';
    span.dataset.locked = 'locked';
  }
  span.getTileFace = () => span.dataset.tile|0;
  return span;
}

const countTileOccurences = clone => {
  // let's just compute this *super* naively.
  clone.forEach(t => {
    let val = t.getTileFace();
    let count = 1;
    clone.forEach(o => {
      if (t===o) return;
      let val2 = o.getTileFace();
      if (val === val2) {
        count++;
      }
    });
    t.count = count;
  });
};

const removeAllListeners = el => {
  // When adding a function like this, make sure
  // you have an idea of how you're going to make
  // sure you can remove it as soon as possible
  // again, e.g. using an event delegator that
  // comes with an .off() or .forget() or the like.
  let c = el.cloneNode();
  while (el.children.length) {
    c.appendChild(el.firstChild);
  }
  el.parentNode.replaceChild(c, el);
  return c;
};


// =========================================
//        Let's define a Player class!
// =========================================


class Player {
  constructor(htmlelement) {
    this.el = htmlelement;
    this.id = htmlelement.id;
    this.locked = [];
  }
  activate() {
    this.el.classList.add('active');
  }
  disable() {
    this.el.classList.remove('active');
  }
  winner() {
    this.el.classList.add('winner');
    this.el.classList.remove('active');
  }
  append(t, concealed) {
    this.el.appendChild(create(t, concealed));
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
  sortTiles() {
    Array.from(
      this.el.querySelectorAll('.tile')
    ).sort(SORT_TILE_FN).forEach(tile => this.el.appendChild(tile));
  }
  tileValue(faceValue) {
    // This ranking is basically arbitrary, because
    // the real value comes from having an actual
    // strategy, which this simple implementation
    // obviously doesn't have. Well... yet!
    let i = parseInt(faceValue);
    if (i < 27) {
      return 1.0; // numerical tile
    }
    else if (i < 31) {
      return 1.0; // honour tile (wind)
    }
    else {
      return 1.0; // honour tile (dragon)
    }
  }
  async chowExists(pid, tile)  {
    // If this isn't a numerical tile, no chow can be formed.
    if (tile > 26)  return CLAIM.IGNORE;

    // nor if the discard did not come from the previous player.
    let next = (pid + 1) % 4;
    let valid = next == this.id;
    if (!valid) return CLAIM.IGNORE;

    // We're still here: can we form a chow with this discard?
    let tiles = this.getTileFaces();
    let face = tile % 9;
    let tm2 = (face > 1) ? tiles.indexOf(tile - 2) >= 0 : false;
    let tm1 = (face > 0) ? tiles.indexOf(tile - 1) >= 0 : false;
    let t1  = (face < 8) ? tiles.indexOf(tile + 1) >= 0 : false;
    let t2  = (face < 7) ? tiles.indexOf(tile + 2) >= 0 : false;
    let c1 = t1 && t2;
    let c2 = tm1 && t1;
    let c3 = tm2 && tm1;

    if (c1) return CLAIM.CHOW1;
    if (c3) return CLAIM.CHOW3;
    if (c2) return CLAIM.CHOW2;
    return CLAIM.IGNORE;
  }
  isWinningTile(tile) {
    // ...code goes here...
    return false;
  }
  async getDiscard(resolve) {
    return this.determineDiscard(resolve);
  }
  determineDiscard(resolve) {
    // players have a way to determine what the discard,
    // but we're not going to specify _how_ to determine
    // that here. We'll leave that up to the specific
    // player types instead.
    resolve(undefined);
  }
  async getClaim(pid, discard, resolve) {
    // in terms of universal behaviour, we want
    // to make sure that we exit early if this is
    // "our own" discard. No bidding on that please.
    if (pid == this.id) {
      return resolve(CLAIM.IGNORE);
    }

    // Then, set up a timeout that ensures we
    // send "IGNORE!" if we take too long to
    // decide on whether we want this discard.
    let overrideKickedIn = false;

    let overrideTrigger = setTimeout(() => {
      overrideKickedIn = true;
      resolve(CLAIM.IGNORE)
    }, CLAIM_INTERVAL);

    // And similarly, make sure to cancel the
    // timeout check if we do have a claim
    // determined within the allotted time.
    let interrupt = () => {
      if (!overrideKickedIn) {
        clearTimeout(overrideTrigger);
      }
    };

    let claim = this.determineClaim(pid, discard, claim => {
      if (!overrideKickedIn) {
        clearTimeout(overrideTrigger);
        resolve(claim);
      }
    }, interrupt);
  }
  determineClaim(pid, discard, resolve, interrupt) {
    // Just like determineDiscard, players have a way
    // to determine whether they want a discard, and
    // for what, but we're not going to say how to
    // determine that in this class.
    resolve(CLAIM.IGNORE);
  }
  claim(p, claimtype, discard) {
    // being awared a discard based on a claims, however,
    // is universal: the tiles get locked.

    let set = [];

    this.el.appendChild(discard);
    discard.dataset.locked = 'locked';
    let locked = 1;
    let tile = discard.getTileFace();
    set.push(discard);

    // lock related tiles if this was a pung/kong
    if (claimtype >= CLAIM.PUNG) {
      let tiles = this.el.querySelectorAll(`.tile[data-tile='${tile}']:not([data-locked]`);

      Array.from(tiles).forEach(t => {
        if (t.getTileFace() == tile) {
          delete t.dataset.hidden;
          t.dataset.locked = 'locked';
          set.push(t);
          locked++;
        }
      });

      // if the player locks away a total of 4 tiles, they need a tile from the wall
      // to compensate for the loss of a tile.
      if (locked === 4 && wall.length) {
        this.getSupplementTile(p);
      }

      this.locked.push(set);

      return false;
    }

    let t1, t2;

    if (claimtype === CLAIM.CHOW1) {
      t1 = this.el.querySelector(`.tile[data-tile='${tile + 1}']:not([data-locked]`);
      t2 = this.el.querySelector(`.tile[data-tile='${tile + 2}']:not([data-locked]`);
    }
    else if (claimtype === CLAIM.CHOW2) {
      t1 = this.el.querySelector(`.tile[data-tile='${tile - 1}']:not([data-locked]`);
      t2 = this.el.querySelector(`.tile[data-tile='${tile + 1}']:not([data-locked]`);
    }
    else if (claimtype === CLAIM.CHOW3) {
      t1 = this.el.querySelector(`.tile[data-tile='${tile - 2}']:not([data-locked]`);
      t2 = this.el.querySelector(`.tile[data-tile='${tile - 1}']:not([data-locked]`);
    }

    delete t1.dataset.hidden;
    t1.dataset.locked = 'locked';

    delete t2.dataset.hidden;
    t2.dataset.locked = 'locked';

    set.push(t1);
    set.push(t2);
    this.locked.push(set);
  }
  getSupplementTile(p) {
    let t;
    do {
      t = wall.shift();
      if (p===2) this.append(t)
      else this.append(t, CONCEALED);
    } while (t>33 && wall.length);
  }
}


// ==========================================
//  Cool, so what kind of players are there?
// ==========================================


/**
 * This guy should be obvious: bots are simply
 * automated processes that follow play rules
 * and simply do what the code says to do.
 */
class BotPlayer extends Player {
  constructor(htmlelement) {
    super(htmlelement);
  }
  determineDiscard(resolve) {
    // we only consider tiles that we can legally play with, meaning
    // (obvious) not bonus tiles, and not any tile already involved
    // in a play-claim earlier.
    let tiles = this.el.querySelectorAll('.tile:not([data-bonus]):not([data-locked]');

    // if we have no concealed tiles, that means it became our turn by
    // declaring a win off of a discard. So... don't discard!
    if (!tiles.length) return resolve(undefined);

    // Now then. Let's figure out which tiles are worth keeping,
    // and which tiles are worth throwing away.

    // First, let's see how many of each tile we have.
    let tileCount = [];
    let ids = Array.from(tiles).map(tile => {
      let id = tile.getTileFace();
      if (!tileCount[id]) { tileCount[id] = 0; }
      tileCount[id]++;
      return id;
    });

    // Cool. With that sorted out, let's start ranking
    // tiles in terms of what they will let us form.
    let tileValues = [];
    ids.forEach( id => {
      let value = 0;
      if (tileCount[id] >= 3) {
        value = CLAIM.KONG;
      } else

      if (tileCount[id] === 2) {
        value = CLAIM.PUNG;
      } else

      if (tileCount[id] === 1) {
        if (id < 27) {
          let face = id % 9;
          if (face > 0 && tileCount[id-1] > 0) {
            // note: this works because undefined <=> 0 are all false,
            // whereas if tileCount[id-1] is an actual number, it's
            // going to be at least 1.
            value = CLAIM.CHOW;
          }
          else if (face < 8 && tileCount[id+1] > 0) {
            value = CLAIM.CHOW;
          }
        }
      }
      else {
        value = this.tileValue(id);
      }

      tileValues[id] = value;
    });

    // so, which tile scores the lowest?
    let tile = 0;
    let l = Number.MAX_VALUE;
    tileValues.forEach((value,pos) => { if (value < l) { l = value; tile = pos; }});

    let discard = this.el.querySelector(`.tile[data-tile='${tile}']:not([data-locked]`);
    resolve(discard);
  }
  async determineClaim(pid, discard, resolve, interrupt) {
    // which tile is this?
    let tile = discard.getTileFace();

    // build a quick list of what we might actually be interested in
    let lookout = window.tilesNeeded(this.getTileFaces());

    // is this tile in the list?
    if (lookout[tile]) {
      let claim = CLAIM.IGNORE;
      lookout[tile].map(unhash).forEach(set => {
        let type = set.type;
        if (type === Constants.PAIR) return;
        if (type === Constants.CHOW) {
          if (tile - set.tile === 1) type = CLAIM.CHOW2;
          if (tile - set.tile === 2) type = CLAIM.CHOW3;
        }
        if (type > claim) {
          claim = type;
        }
      });
      return resolve(claim);
    }
    return resolve(CLAIM.IGNORE);
  }
}

/**
 * And this is a human player... which is "a kind
 * of bot player" and that might seem surprising,
 * but the reason we do this is because it allows
 * us to get a bot player helping the human player
 * "for free", and that's great!
 */
class HumanPlayer extends BotPlayer {
  constructor(htmlelement) {
    super(htmlelement);
    this.mayDiscard = false;
    this.maySendClaim = false;
  }
  determineDiscard(resolve) {
    // Let's ask our "bot" assistant for what it would
    // suggest we throw away:
    super.determineDiscard(suggestion => {
      if (BOT_PLAY) {
        return resolve(suggestion);
      }

      suggestion.classList.add('suggestion');

      // Set up click-listening for tiles: if the user clicks
      // any tile that is still concealed in their hand, that's
      // the tile they're discarding.
      let fn = e => {
        tiles.forEach(tile => removeEventListener("click", fn));
        suggestion.classList.remove('suggestion');
        resolve(e.target);
      };

      // And start listening for clicks. Even though this may
      // take an hour or more, play will resume
      this.getTiles().forEach(tile => tile.addEventListener("click", fn));
    });
  }
  determineClaim(pid, discard, resolve, interrupt) {
    // and of course, the same applies here:
    let suggestion = super.determineClaim(pid, discard, suggestion => {
      if (BOT_PLAY) {
        return resolve(suggestion);
      }

      let fn = e => {
        interrupt();

        // let's spawn a little modal to see what the user actually wanted to do here.
        modal.setContent("What kind of claim are you making?", [
          { label: "Ignore", value: CLAIM.IGNORE },
          { label: "Chow (X**)", value: CLAIM.CHOW1 },
          { label: "Chow (*X*)", value: CLAIM.CHOW2 },
          { label: "Chow (**X)", value: CLAIM.CHOW3 },
          { label: "Pung", value: CLAIM.PUNG },
          { label: "Kong", value: CLAIM.KONG },
          { label: "Win", value: CLAIM.WIN },
        ], result => {
          discard.removeEventListener("click", fn);
          resolve(result);
        });
        modal.classList.remove('hidden');
      }

      discard.addEventListener("click", fn);
    });
  }
}

// =========================================
//            HTML boostrapping!
// =========================================


let html = document.querySelector("html");
let ps = document.getElementById("pslide");
let ws = document.getElementById("wslide");
let discards = document.querySelector(".discards");

ps.addEventListener("input", e => {
  let v = e.target.value;
  html.style.setProperty("--ph", v + "em");
});

ws.addEventListener("input", e => {
  let v = e.target.value;
  html.style.setProperty("--w", v + "em");
});

// =========================================
//      A simple general purpose modal
// =========================================


let modal = document.querySelector(".modal");
modal.setContent = (label, options, resolve) => {
  let panel = modal.querySelector('.panel');
  panel.innerHTML = `<p>${label}</p>`;

  options.forEach(data => {
    let btn = document.createElement("button");
    btn.textContent = data.label;
    btn.addEventListener("click", e => {
      resolve(data.value);
      modal.classList.add("hidden");
    });
    panel.appendChild(btn);
  });
}

// =========================================
//                  Setup!
// =========================================


let players  = Array.from(document.querySelectorAll(".player")).map(
  (htmlelement, idx) => (idx===2) ? new HumanPlayer(htmlelement) : new BotPlayer(htmlelement)
);
let base = [...new Array(34)].map((_,i) => i);
let tiles = base.concat(base).concat(base).concat(base).concat([34,35,36,37,38,39,40,41]);
let wall = [];

while (tiles.length) {
  let pos = (Math.random() * tiles.length)|0;
  wall.push( tiles.splice(pos,1)[0] );
}

players.forEach((player, p) => {
  let bank = wall.splice(0,13);
  for(let i=0; i<bank.length; i++) {
    let t = bank[i];

    if (p===2) player.append(t)
    else player.append(t, CONCEALED);

    // bonus tile?
    if (t > 33) {
      bank.push(wall.shift());
    }

    // At this point, a player should be
    // able to decide whether or not to
    // declare any kongs they might have
    // in their hand. While unlikely, it
    // is entirely possible for this to
    // lead to a player declaring four
    // kongs before play has even started.

    // We will add this in later.
  };
});

players.forEach(player => player.sortTiles());

// =========================================
//               Game code!
// =========================================


// Game loop!
function playGame() {
  let p = 2;
  let discard = undefined;
  let stop = false;
  let winner = false;

  let play = async (claimtype) => {
    if (discard) discard.classList.remove('discard');

    let player = players[p];

    player.activate();

    // Get a tile
    if (!claimtype) {
      // Either from the wall because it's a normal turn...
      let t;
      do {
        t = wall.shift();
        if (p === 2) { player.append(t) }
        else { player.append(t, CONCEALED); }
      } while (t>33 && wall.length);
    } else {
      // ...or from another player's discard as a claim.
      player.claim(p, claimtype, discard);
    }

    // cosmetics: order this player's tile bank
    player.sortTiles();

    // Now throw a tile away!
    discard = await new Promise(resolve => player.getDiscard(resolve));

    // Did someone win?
    if (discard === undefined) {
      stop = true;
      winner = p;
      console.log(`Player ${p} wins this round!`);
      player.winner();
      discards.classList.add('winner');
    }

    // They did not. Does someone else want this discard?
    else {
      delete discard.dataset.hidden;
      discards.appendChild(discard);
      discard.classList.add('discard');
      let claim = await getAllClaims(p, discard);

      // see that "await" keyboard up there? That means
      // we're going to block _this function_ from actually
      // resolving that assignment, until getAllClaims has
      // data to give back. That's cool!

      if (claim !== undefined) {
        p = claim.p;
        player.disable();
        return setTimeout(() => play(claim.claim), PLAY_INTERVAL);
      }

      // If we get here, we didn't return early due to claims.
      // Are the tiles left to let the next player have turn?
      if (!wall.length) {
        console.log("OUT OF TILES");
        discards.classList.add('exhausted');
      }

      // Looks like there are, on to the next player.
      if (!stop && wall.length) {
        p = (p + 1) % 4;
        return setTimeout(() => {
          player.disable();
          play();
        }, PLAY_INTERVAL);
      }
    }
  };

  console.log("starting");
  play();
}

async function getAllClaims(currentpid, discard) {
  // get all players to put in a claim bid
  let claims = await Promise.all(players.map(p => new Promise(resolve => p.getClaim(currentpid, discard, resolve))));

  // Did anyone win?
  let p = -1;
  let claim = CLAIM.IGNORE;
  claims.forEach((bid,pid) => {
    if (bid>claim) {
      claim=bid;
      p=pid;
    }
  });

  return p === -1 ? undefined : {p, claim};
}


// =========================================
//          Twitter the sparrows!
// =========================================

playGame();

// chowExists(0, 1, 1, [
//   {dataset:{tile: 0}},
//   {dataset:{tile: 2}},
//   {dataset:{tile: 6}},
//   {dataset:{tile: 6}},
//   {dataset:{tile: 10}},
//   {dataset:{tile: 11}},
//   {dataset:{tile: 11}},
//   {dataset:{tile: 12}},
//   {dataset:{tile: 14}},
//   {dataset:{tile: 18}},
//   {dataset:{tile: 20}},
//   {dataset:{tile: 22}},
//   {dataset:{tile: 23}}]);
