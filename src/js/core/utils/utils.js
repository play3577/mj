if (typeof process !== "undefined") {
  document = require('./dom-shim.js');
}

/**
 * Tack a bunch of functions onto any span such
 * that we can refactor "tiles" to no longer be
 * HTMLSpanElement objects.
 */
const enrich = span => {
  span.getFrom = () => (span.dataset.from|0);
  span.setFrom = (pid) => (span.dataset.from = pid);

  span.hide = () => (span.dataset.hidden = 'hidden');
  span.isHidden = () => (!!span.dataset.hidden);
  span.reveal = () => { delete span.dataset.hidden; };

  span.conceal = () => (span.dataset.concealed = 'concealed');
  span.isConcealed = () => (!!span.dataset.concealed);

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
  let span = enrich(document.createElement('span'));
  span.className = 'tile';
  span.dataset.tile = tileNumber;

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
