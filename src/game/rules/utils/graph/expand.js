// helper function: is a partial path already entailed by
// the full path we know? E.g.:
//
//    [1,2,3]
//
// is entailed by
//
//   [[1,1,1], [4,4], [1,2,3], [32,32,32]]
//
function entailed(target, paths) {
  return paths.some(path =>
    target.every(tset => path.some(set => set.entails(tset)))
  );
}

/**
 * Expand a graph starting at  some node `root` into a set of unique
 * paths through the graph. The end of the graph is simply any node
 * that has no outbound links.
 *
 * This function is not very complicated... but it's super useful.
 */
module.exports = function expand(
  root,
  ignoreChowPairs,
  paths = [],
  sofar = []
) {
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
        if (ignoreChowPairs && tiles.length === 2 && tiles[0] !== tiles[1]) {
        } else next.push(tiles);
      }
      expand(link.targetNode, ignoreChowPairs, paths, next);
    });

  return paths;
};
