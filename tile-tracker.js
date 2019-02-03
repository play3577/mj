class TileTracker {
  constructor() {
    this.reset();
  }
  reset() {
    let tiles = (new Array(34)).fill(4);
    tiles.push(1,1,1,1,1,1,1,1);
    this.tiles = Object.assign({}, tiles);
  }
  seen(tile) {
    this.tiles[tile]--;
  }
}
