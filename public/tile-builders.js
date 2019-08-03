// used anywhere a tile <li> needs to be built.
const TileBuilders = {
  // builds a regular tile
  buildTile: tilenumber =>
    li(
      {
        className: "tile",
        "data-tile": tilenumber
      },
      tilenumber
    ),

  // builds a "concealed" tile
  buildHidden: () => TileBuilders.buildTile(-1),

  // builds a tile belonging to a (locked) set
  buildSetTile: (tilenumber, setnum) =>
    li(
      {
        className: "tile",
        dataset: {
          tile: tilenumber,
          setnum
        }
      },
      tilenumber
    ),

  // builds all tiles in a (locked) set
  buildSet: (set, setnum) =>
    ul(set.map(t => TileBuilders.buildSetTile(t, setnum))),

  // build a player.locked set entry, which is
  // a claim object containing a tile array,
  // rather than being a tile array itself.
  buildLockedSet: (claim, setnum) => TileBuilders.buildSet(claim.tiles, setnum)
};

export default TileBuilders;
