# Mahjong. In the browser.

1: we're talking real four player mahjong here. Not that solaire game your aunt plays.

2: this readme is sparse because I'm going to be writing a serial-post on the whole "developing a game in the browser" practice, which is going to be much more informative than this README.md could ever be.

The live version, which just lets you watch four bots play a round of MJ, can be found at https://pomax.github.io/mj - note that the bit play interval has been set to 200ms, instead of the 0ms they actually need to play. This lets you see the game happening, rather than loading the page to discover the bots already finished playing. Because it takes them half a second to play a full round, which is less than the time it takes to load the tile images from cache.

#### url query params

Because it's fun, you can append `?play=<num>&hand=<num>` to the URL to change the bot play speed, and the pause between hands, and you can append `autoplay` to start the page with bots autoplaying... so if you want to see the bots work as fast as the UI will let them, hit up https://pomax.github.io/mj/?play=0&hand=0&autoplay and enjoy the fireworks.
