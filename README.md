# Mahjong. In the browser.

1: we're talking real four player mahjong here. Not that solaire game your aunt plays.

2: this README.md is sparse because I'm going to be writing a serial-post on the whole "developing a game in the browser" practice, which is going to be much more informative than this README.md could ever be.

The live version, which just lets you watch four bots play a round of MJ, can be found at https://pomax.github.io/mj - note that the bit play interval has been set to 200ms, instead of the 0ms they actually need to play. This lets you see the game happening, rather than loading the page to discover the bots already finished playing. Because it takes them half a second to play a full round, which is less than the time it takes to load the tile images from cache.

#### Debugging using query parameters

The following URL query parameters are supported for debugging purposes:

- `debug=true` turns on extended debug logging
- `seed=<num>` make pseudo-random number generator use this seed value
- `autoplay=true` immediately starts a game with four bots playing each other
- `play=<num>` number of milliseconds paused between bot actions
- `hand=<num>` number of milliseconds paused on the score screen before starting a new hand
- `force_open_bot_play=true` show the tiles that the "not us" bots are playing with
- `wall_hack=<wall hack name>` override the wall instantiation to always be one specific pattern. See `core/wall.js`.

#### I have questions

I'm sure you do: feel free to [tweet at me](https://twitter.com/TheRealPomax) for shallow engagement, or file an issue over on [the issue tracker](https://github.com/Pomax/mj/issues) if you need deeper engagement.

#### Code stats

- HTML: ~485 LoC
- CSS: ~600 LoC
- JS: ~3300 LoC
