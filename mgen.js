function hash(set) {
  let s = `${set.type}`;
  if (set.subtype) { s = `${s}s${set.subtype}`; }
  if (set.type===Constants.PAIR || set.type===Constants.CHOW) { s = `${s}t${set.tile}`; }
  //console.log("hash", set, s);
  return s;
}

function unhash(print, tile) {
  let re = /(\d+)(s(-?\d+))?(t(\d+))?/;
  let m = print.match(re);
  let type = parseInt(m[1]);
  let subtype = m[3] ? parseInt(m[3]) : undefined;
  let required = tile;
  if (type===Constants.CHOW) tile -= subtype;
  let obj = { required, type, subtype, tile };
  //console.log("unhash", print, obj);
  return obj;
}

class Pattern {
  constructor(tiles=[], canChow=false) {
    this.keys = [];
    this.tiles = {};
    tiles.slice().sort((a,b)=>a-b).forEach(v => {
      if (this.tiles[v] === undefined) {
        this.tiles[v] = 0;
      }
      this.tiles[v]++;
      this.keys.push(v);
    });
    this.canChow = canChow;
  }
  copy() {
    let p = new Pattern([], this.canChow);
    p.keys = this.keys.slice();
    p.keys.forEach(k => (p.tiles[k] = this.tiles[k]));
    return p;
  }
  remove(tiles) {
    if (!tiles.forEach) tiles = [tiles];
    tiles.forEach(t => {
      this.tiles[t]--;
      if (this.tiles[t] === 0) {
        delete this.tiles[t];
        this.keys = Object.keys(this.tiles).sort((a,b)=>a-b);
      }
    });
  }
  getSuit(tile) {
    return ((tile/9)|0);
  }
  matchSuit(tile, suit) {
    return this.getSuit(tile) === suit;
  }
  getChowInformation(tile) {
    let suit = (tile / 9)|0;
    let t1 = this.tiles[tile+1];
    if (t1 !== undefined && !this.matchSuit(tile + 1, suit)) t1 = undefined;
    let t2 = this.tiles[tile+2];
    if (t2 !== undefined && !this.matchSuit(tile + 2, suit)) t2 = undefined;
    return { t1, t2, suit};
  }
  checkForChow(tile, result) {
    if (!this.canChow) return;
    if (tile > 26) return;
    let {t1, t2, suit} = this.getChowInformation(tile);
    if (t1 || t2) {
      let set = [], remove;
      if (t1 && t2) { // this is already a chow!
        set.push({ required: false, type: Constants.CHOW, tile });
        remove = [tile, tile+1, tile+2];
      }
      else if (t1) { // connected pair, we need either a first or last tile.
        if (this.matchSuit(tile - 1, suit)) set.push({ required: tile-1, type: Constants.CHOW3, tile });
        if (this.matchSuit(tile + 2, suit)) set.push({ required: tile+2, type: Constants.CHOW1, tile });
        remove = [tile, tile + 1];
      }
      else if (t2) { // gapped pair, we need the middle tile.
        set.push({ required: tile+1, type: Constants.CHOW2, tile });
        remove = [tile, tile + 2];
      }
      this.recurse(remove, set, result);
    }
  }
  recurse(processed, set, result) {
    set.forEach(s => {
      if (s.required) {
        let tile = s.required
        if (!result[tile]) result[tile] = [];
        let print = hash(s);
        let list = result[tile];
        if (list.indexOf(print) === -1) list.push(print);
      }
    });
    let downstream = this.copy();
    downstream.remove(processed);
    if (downstream.keys.length > 0) downstream.expand(result);
  }
  expand(result=[]) {
    let tile = this.keys[0]|0;
    let count = this.tiles[tile];

    if (count===4) {
      // special case: if we already have four, we have all
      // the tiles that are in the game, and there isn't going
      // to be any discard to claim.
      let set = [{ required: false, type: Constants.KONG, tile }];
      this.recurse([tile, tile, tile, tile], set, result);
    } else {
      this.checkForChow(tile, result);
      if (count===1) {
        // We cannot claim pairs "normally", so we do not record it.
        // But, in crazy rulesets where we could claim pairs, the
        // following code would be required:
        //
        // let set = [{ required: tile, type: Constants.PAIR, tile }];
        // this.recurse([tile], set, result);
      }
      if (count===2) {
        let set = [
          { required: false, type: Constants.PAIR, tile },
          { required: tile, type: Constants.PUNG, tile }
        ];
        this.recurse([tile, tile], set, result);
      }
      if (count===3) {
        let set = [
          { required: false, type: Constants.PAIR, tile },
          { required: false, type: Constants.PUNG, tile },
          { required: tile, type: Constants.KONG, tile }
        ];
        this.recurse([tile, tile, tile], set, result);
      }
    }
    return result;
  }
  markWin(results, tile, subtype) {
    if (!results[tile]) results[tile] = [];
    let print = hash({type: Constants.WIN, tile, subtype});
    if (results[tile].indexOf(print) === -1) results[tile].push(print);
  }
  recurseForWin(processed, results, single, pair, set) {
    let downstream = this.copy();
    downstream.remove(processed);
    if (downstream.keys.length > 0) {
      downstream.determineWin(results, single, pair, set);
    } else {
      if (set.length===4 && pair.length===0 && single.length===1) {
        this.markWin(results, single[0], Constants.PAIR);
      }
      else if (set.length===3 && pair.length===2) {
        this.markWin(results, pair[0], Constants.PUNG);
        this.markWin(results, pair[1], Constants.PUNG);
      }
      else if (set.length===3 && pair.length===1 && single.length===2) {
        if (single[1] < 27 && single[0] + 1 === single[1]) {
          let t1 = single[0]-1, s1 = this.getSuit(t1),
              b0 = single[0],   s2 = this.getSuit(b0),
              b1 = single[1],   s3 = this.getSuit(b1),
              t2 = single[1]+1, s4 = this.getSuit(t2);
          if(s1 === s2 && s1 === s3) this.markWin(results, t1, Constants.CHOW3);
          if(s4 === s2 && s4 === s3) this.markWin(results, t2, Constants.CHOW1);
        }
        else if (single[1] < 27 && single[0] + 2 === single[1]) {
          this.markWin(results, single[0]+1, Constants.CHOW2);
        }
      }
    }
  }
  determineWin(results=[], single=[], pair=[], set=[]) {
    let tile = this.keys[0]|0;
    let count = this.tiles[tile];

    if (count>3) this.recurseForWin([tile, tile, tile, tile], results, single, pair, set.concat([`k${tile}`]));
    if (count>2) this.recurseForWin([tile, tile, tile], results, single, pair, set.concat([`p${tile}`]));
    if (count>1) this.recurseForWin([tile, tile], results, single, pair.concat([tile]), set);
    if (count===1) this.recurseForWin([tile], results, single.concat([tile]), pair, set);

    if (tile > 26) return results;
    let {t1, t2} = this.getChowInformation(tile);
    if (t1 && t2) this.recurseForWin([tile, tile+1, tile+2], results, single, pair, set.concat([`c${tile}`]));
    return results;
  }
}

function tilesNeeded(tiles, locked=[], canChow) {
  let p = new Pattern(tiles, canChow);
  let lookout = p.copy().expand();
  let checkwin = p.copy().determineWin([], [], [], locked);
  let waiting = (checkwin.length > 0);
  checkwin.forEach((l,idx) => lookout[idx] = l);
  return { lookout, waiting };
};

if (typeof process !== "undefined" && process.argv.indexOf('mgen.js') !== -1) {
  Constants = require('./constants.js').Constants;

  // open tiles:
  let hand = [1,1,3,4,6,12,13,15,15,15,26,28,30];
  // hand = [1,1,1,6,6,6,9,9,9,14,14,14,27];
  // hand = [1,2,3, 6,6,6, 10,11,12, 26,26,26, 27];
  // hand = [1,2,3, 6,6,6, 10,11,12, 26,26, 27,27];
  // hand = [1,1,1, 1,2,3, 3,3,3, 4,5,6, 7];
  hand = [31,31,31, 33];

  // locked tiles:
  let single = [];
  let pair = [];
  let set = ['k19','c12','p30'];

  // see what happens:
  Logger.log("current hand:", hand);
  Logger.log("discards we want to be on the lookout for:");
  Logger.log(tilesNeeded(hand,single,pair,set));
}
