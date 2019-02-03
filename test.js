const SEED = 0;
const BOT_PLAY = true;
const CONCEALED = true;
const LOW_TO_HIGH = (a,b) => { a = a.score; b = b.score; return a - b; };
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

const PRNG = new Random(SEED);

while (tiles.length) {
  let pos = (PRNG.nextFloat() * tiles.length)|0;
  wall.push( tiles.splice(pos,1)[0] );
}

console.log(`using wall: [${wall.join(',')}]`);

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

  let play = async (claim) => {
    if (discard) discard.classList.remove('discard');

    let player = players[p];

    player.activate();

    // Get a tile
    if (!claim) {
      // Either from the wall because it's a normal turn...
      let t;
      do {
        t = wall.shift();
        if (p === 2) { player.append(t) }
        else { player.append(t, CONCEALED); }
      } while (t>33 && wall.length);
    } else {
      // ...or from another player's discard as a claim.
      player.claim(p, claim, discard);
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
        return setTimeout(() => play(claim), PLAY_INTERVAL);
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
  let claims = await Promise.all(
    players.map(
      p => new Promise(
        resolve => p.getClaim(currentpid, discard, resolve)
      )
    )
  );

  // Who wins the bidding war?
  let p = -1;
  let claim = CLAIM.IGNORE;
  let win = undefined;
  claims.forEach((c,pid)=> {
    if (c.claimtype > claim) {
      claim = c.claimtype;
      if (c.wintype) win = c.wintype
      p = pid;
    }
  });

  return p === -1 ? undefined : { p, claimtype: claim, wintype: win };
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
