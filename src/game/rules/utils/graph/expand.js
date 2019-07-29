// helper function: is a partial path already entailed by
// the full path we know?
// E.g. [2,5] is entailed by [1,2,3,4,5,6].
function entailed(target, paths) {
  return paths.some(path =>
    target.every(tset => path.some(set => set.entails(tset)))
  );
}

/**
 * Expand a graph starting at `root` into a set of unique paths
 * from the root to the end of the graph (signalled by not having
 * any outbound links).
 */
module.exports = function expand(root, ignoreChowPairs, paths = [], sofar = []) {
  let outbound = root.outbound;

  if (outbound.length === 0 && sofar.length && !entailed(sofar, paths)) {
    paths.push(sofar);
  }

  outbound
    .sort((a, b) => b.tiles.length - a.tiles.length)
    .forEach(link => {
      let next = sofar.slice();
      let tiles = link.tiles;
      if (tiles.length > 1) {
        if (ignoreChowPairs && tiles.length===2 && tiles[0] !== tiles[1]) {}
        else next.push(tiles);
      }
      expand(link.targetNode, ignoreChowPairs, paths, next);
    });

  return paths;
};
