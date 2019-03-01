/**
 * This is an administrative class that is used by Players
 * to track how many instances of each tile are, potentially,
 * still left in the game, based on incomplete information
 * received during the playing of a hand.
 */
class TileTracker {
  constructor(id) {
    this.id = id;
    this.reset();
  }

  /**
   * Reset all tiles to "there are four".
   */
  reset() {
    let tiles = (new Array(34)).fill(4);
    tiles.push(1,1,1,1,1,1,1,1);
    this.tiles = Object.assign({}, tiles);
    if (this.el) this.bindTo(this.el);
  }

  /**
   * Fetch the count associated with a specific tile.
   */
  get(tileNumber) {
    return this.tiles[tileNumber];
  }

  /**
   * Mark a specific tile as having been revealed to this
   * player (but not necessarily to all players!)
   */
  seen(tileNumber) {
    if (tileNumber.dataset) {
      console.log(`Player ${this.id} tracker was passed an HTMLElement instead of a tile`);
      console.trace();
      throw new Error('why is the tracker being given an HTML element?');
    }
    if (this.id == 0) {
      console.debug(`Player ${this.id} removing ${tileNumber} from available tiles.`);
    }
    this.tiles[tileNumber]--;
    if (this.counts) {
      try {
        let e = this.counts[tileNumber].shift();
        e.parentNode.removeChild(e);
      } catch(error) {
        console.log(`Player ${this.id} can't remove ${tileNumber}, because there aren't any left to remove..?`);
        console.trace();
        throw error;
      }
    }
  }

  /**
   * bind this tracker to a UI element for actually seeing how
   * many of each tile is still "in the game" according to
   * this player.
   *
   * Note: this should not be the tiletracker's responsibility,
   * and really it should just be told that there is a UI,
   * and then trigger `ui.renderMePlease(this)`.
   */
  bindTo(htmlElement) {
    // TODO almost all this code should be in the client-ui,
    // with the tracker simply going `if (this.ui) this.ui.[...]`
    // in any location it needs the UI updated.
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
