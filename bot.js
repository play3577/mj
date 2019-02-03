/**
 * This guy should be obvious: bots are simply
 * automated processes that follow play rules
 * and simply do what the code says to do.
 */
class BotPlayer extends Player {
  constructor(htmlelement, wall) {
    super(htmlelement, wall);
  }

  append(tile, concealed=true) {
    return super.append(tile, concealed);
  }

  determineDiscard(resolve) {
    if (this.has_won) return resolve(undefined);

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

  /**
   * Automated claim policy, see `tilesNeeded` in `./mgen.js`
   */
  async determineClaim(pid, discard, resolve, interrupt) {
    // which tile is this?
    let tile = discard.getTileFace();

    // build a quick list of what we might actually be interested in
    let canChow = ((pid+1)%4 == this.id);
    let {lookout, waiting} = window.tilesNeeded(this.getTileFaces(), this.locked, canChow);
    let looking = {};
    lookout.forEach( (l,i) => l ? (looking[i] = l) : false);
    this.markWaiting(waiting);

    // is the current discard in the list of tiles we want?
    let claim = CLAIM.IGNORE, wintype;
    if (lookout[tile]) {
      lookout[tile].map(print => unhash(print,tile)).forEach(set => {
        let type = set.type;
        if (type === Constants.PAIR) return;
        if (type === Constants.CHOW) {
          if ((pid+1)%4 != this.id) return;
          type = convertSubtypeToClaim(set.subtype);
        }
        if (type === CLAIM.WIN) {
          wintype = set.subtype ? set.subtype : 'normal';
        }
        if (type > claim) {
          claim = type;
        }
      });
      return resolve({claimtype: claim, wintype});
    }

    return resolve({claimtype: CLAIM.IGNORE});
  }
}
