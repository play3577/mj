/**
 * A class that encodes all the various "non-standard-play"
 * limit hands, e.g. limits with 14 tile hands that cannot
 * be parsed as four sets and a pair.
 */
class LimitHands {
  // Test to see if any of the known limit hands apply
  test(singles, sets, lockedSets) {
    const tiles = singles.concat(sets.flat());
    const locked = lockedSets.flat();
    if (tiles.length + locked.length < 14) return;
    const cleaned = (add = []) => tiles.concat(add).sort();
    if (this.hasAllGreen(cleaned(locked))) return `All green`;
    if (this.hasThirteenOrphans(cleaned(locked))) return `Thirteen orphans`;
    if (this.hasNineGates(cleaned(), lockedSets)) return `Nine gates`;
  }

  /**
   * Check for all green:
   *
   * hand comprised of all the "green" bamboo tiles,
   * i.e. 2, 3, 4, 6, 8, and green dragons.
   */
  hasAllGreen(tiles) {
    let green = [1, 2, 3, 5, 7, 31];
    green.forEach(t => {
      let pos = tiles.indexOf(t);
      for (; pos > -1; pos = tiles.indexOf(t)) {
        tiles.splice(pos, 1);
      }
    });
    return tiles.length === 0;
  }

  /**
   * Check for thirteen orphans:
   *
   * The 1 and 9 of each suit, once; each wind
   * and dragon, once; a pairing tile for any.
   */
  hasThirteenOrphans(tiles) {
    let thirteen = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
    thirteen.forEach(t => {
      let pos = tiles.indexOf(t);
      if (pos > -1) tiles.splice(pos, 1);
    });
    return tiles.length === 1 && thirteen.indexOf(tiles[0]) > -1;
  }

  /**
   * Check for nine gates:
   *
   * 1,1,1, 2,3,4,5,6,7,8, 9,9,9, and a
   * pairing tile for any. All same suit.
   */
  hasNineGates(tiles, lockedSize) {
    if (lockedSize > 2) return false;
    if (tiles.some(t => t >= 27)) return false;
    let suit = (tiles[0] / 9) | 0;
    if (tiles.some(t => ((t / 9) | 0) !== suit)) return false;
    let offset = suit * 9;
    let nine = [0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8].map(t => t + offset);
    nine.forEach(t => {
      let pos = tiles.indexOf(t);
      if (pos > -1) tiles.splice(pos, 1);
    });
    return tiles.length === 1 && offset < tiles[0] && tiles[0] < offset + 8;
  }
}

module.exports = LimitHands;
