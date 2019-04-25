const __roll_sort =  (a,b) => a < b ? -1 : b > a ? 1 : 0;

/**
 * A tree to list-of-paths unrolling function.
 */
function unroll(list, seen=[], result=[]) {
  list = list.slice();
  seen.push(list.shift());
  if (!list.length) {
    seen.sort(__roll_sort);
    let print = seen.toString();
    let found = result.some(sofar => sofar.toString() === print);
    if (!found) result.push(seen);
  }
  else list.forEach(tail => unroll(tail, seen.slice(), result));
  return result;
}

if (typeof process !== "undefined") {
  let create = require('../game/game-tile.js');
  module.exports = { create, unroll };
}
