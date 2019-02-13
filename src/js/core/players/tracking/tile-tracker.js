class TileTracker {
  constructor(id) {
    this.id = id;
    this.reset();
  }
  reset() {
    let tiles = (new Array(34)).fill(4);
    tiles.push(1,1,1,1,1,1,1,1);
    this.tiles = Object.assign({}, tiles);
    if (this.el) this.bindTo(this.el);
  }
  get(tile) {
    return this.tiles[tile];
  }
  seen(tile) {
    if (tile.dataset) {
      Logger.log(`Player ${this.id} tracker was passed an HTMLElement instead of a tile`);
      Logger.trace();
      throw new Error('why is the tracker being given an HTML element?');
    }
    if (this.id == 2) {
      Logger.debug(`Player ${this.id} removing ${tile} from available tiles.`);
    }
    this.tiles[tile]--;
    if (this.counts) {
      try {
        let e = this.counts[tile].shift();
        e.parentNode.removeChild(e);
      } catch(error) {
        Logger.log(`Player ${this.id} can't remove ${tile}, because there aren't any left to remove..?`);
        Logger.trace();
        throw error;
      }
    }
  }
  bindTo(htmlElement) {
    this.el = htmlElement;
    this.el.innerHTML = '';
    this.counts = {};
    Object.keys(this.tiles).forEach(tile => {
      let count = this.tiles[tile];
      let div = document.createElement('div');
      div.classList.add('tile-count');
      if (tile>33) div.classList.add('hidden');
      this.el.appendChild(div)
      this.counts[tile] = [];
      while(count--) {
        let e = create(tile)
        e.removeAttribute('class');
        this.counts[tile].push(e);
        div.appendChild(e);
      }
    })
  }
}
