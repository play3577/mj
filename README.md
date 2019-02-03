# Mahjong. In the browser.

1: we're talking real four player mahjong here. Not that solaire game your aunt plays.

2: this readme is sparse because I'm going to be writing a serial-post on the whole "developing a game in the browser" practice, which is going to be much more informative than this README.md could ever be.

The live version, which just lets you watch four bots play a round of MJ, can be found at https://pomax.github.io/mj - note that the bit play interval has been set to 200ms, instead of the 0ms they actually need to play. This lets you see the game happening, rather than loading the page to discover the bots already finished playing. Because it takes them half a second to play a full round, which is less than the time it takes to load the tile images from cache.
