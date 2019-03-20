if (typeof process !== "undefined") {
  let shim = require('./dom-shim.js');
  document = shim.document;
  ClassList = shim.Classlist;
}

class DatasetObject {
  constructor() {
    this.classList = new ClassList();
    this.attributes = {};
    this.dataset = {};
  }

  mark(label) { this.classList.add(label); }
  unmark(label) { this.classList.remove(label); }

  setTitle(title) { if (title) this.setAttribute("title", title); else this.removeAttribute("title"); }

  setAttribute(a,v) { this.attributes[a] = v; }
  removeAttribute(a) { delete this.attributes[a]; }

  getFrom() { return this.dataset.from; }
  setFrom(pid) { this.dataset.from = pid; }

  hide() { this.dataset.hidden = 'hidden'; }
  isHidden() { return !!this.dataset.hidden; }
  reveal() { delete this.dataset.hidden; }

  conceal() { this.dataset.concealed = 'concealed'; }
  isConcealed() { return !!this.dataset.concealed; }
  unconceal() { delete this.dataset.concealed }

  winning() { this.dataset.winning = 'winning'; }
  isWinningTile() { return !!this.dataset.winning; }

  lock(locknum) {
    this.dataset.locked = 'locked';
    if (locknum) this.dataset.locknum = locknum;
  }
  meld() { this.dataset.melded = 'melded'; }
  isLocked() { return !!this.dataset.locked; }
  getLockNumber() { return this.dataset.locknum; }
  unlock() { delete  this.dataset.locked; }

  bonus() { this.dataset.bonus = 'bonus'; this.lock() };
  isBonus() { return !!this.dataset.bonus; }
  supplement() { this.dataset.supplement = 'supplement'; }

  setTileFace(tile) { this.dataset.tile = tile; }
  getTileFace() { return this.dataset.tile; }
  getTileSuit() {
      let num = this.getTileFace();
      if (num < 9) return 0;
      if (num < 18) return 1;
      if (num < 27) return 2;
      if (num < 30) return 3;
      return 4;
  }

  copy()  {
    let dso = new DatasetObject();
    dso.classList = this.classList.copy();
    dso.dataset = JSON.parse(JSON.stringify(this.dataset));
    dso.attributes = JSON.parse(JSON.stringify(this.attributes));
    return dso;
  }
}

/**
 * Tack a bunch of functions onto any span such
 * that we can refactor "tiles" to no longer be
 * HTMLSpanElement objects.
 */
const enrich = span => {

  span.mark = (label) => span.classList.add(label);
  span.unmark = (label) => span.classList.remove(label);

  span.setTitle = (title) => { if (title) span.setAttribute("title", title); else span.removeAttribute("title"); }

  span.getFrom = () => (span.dataset.from|0);
  span.setFrom = (pid) => (span.dataset.from = pid);

  span.hide = () => (span.dataset.hidden = 'hidden');
  span.isHidden = () => (!!span.dataset.hidden);
  span.reveal = () => { delete span.dataset.hidden; };

  span.conceal = () => (span.dataset.concealed = 'concealed');
  span.isConcealed = () => (!!span.dataset.concealed);
  span.unconceal = () => { delete span.dataset.concealed; }

  span.winning = () => (span.dataset.winning = 'winning');
  span.isWinningTile = () => (!!span.dataset.winning);

  span.lock = (locknum) => {
    span.dataset.locked = 'locked';
    if (locknum) span.dataset.locknum = locknum;
  };
  span.meld = () => (span.dataset.melded = 'melded');
  span.isLocked = () => (!!span.dataset.locked);
  span.getLockNumber = () => (span.dataset.locknum|0);
  span.unlock = () => { delete span.dataset.locked; };

  span.bonus = () => { span.dataset.bonus = 'bonus'; span.lock() };
  span.isBonus = () => (!!span.dataset.bonus);
  span.supplement = () => (span.dataset.supplement = 'supplement');

  span.setTileFace = tile => (span.dataset.tile = tile);
  span.getTileFace = () => (span.dataset.tile|0);
  span.getTileSuit = () => {
    let num = span.getTileFace();
    if (num < 9) return 0;
    if (num < 18) return 1;
    if (num < 27) return 2;
    if (num < 30) return 3;
    return 4;
  };

  span.copy = () => enrich(span.cloneNode());

  return span;
};

/**
 * Create a <span data-tile="..."></span> element
 * from a specified tile number. Also, because it's
 * such a frequent need, this adds a `getTileFace()`
 * function to the span itself.
 */
const create = (tileNumber, hidden) => {
  let span;

  if (typeof process !== "undefined") {
    span = new DatasetObject();
  } else {
    span = enrich(document.createElement('span'));
    span.className = 'tile';
  }

  span.setTileFace(tileNumber);

  if (tileNumber < 34) {
    if (hidden) { span.hide(); }
  } else span.bonus();

  return span;
}

/**
 * A tree to list-of-paths unrolling function.
 */
function unroll(list, seen=[], result=[]) {
  list = list.slice();
  seen.push(list.shift());
  if (!list.length) result.push(seen);
  else list.forEach(tail => unroll(tail, seen.slice(), result));
  return result;
}

if (typeof process !== "undefined") {
  module.exports = { create, unroll };
}
