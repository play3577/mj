# Mahjong. In the browser.

1: we're talking real four player mahjong here. Not that solaire game your aunt used to play on "Yahoo! games".

2: this README.md is sparse because I'm going to be writing a serial-post on the whole "developing a game in the browser" practice, which is going to be much more informative than this README.md could ever be.

The live version, which is effectively done (with tweaks of course are still happening), can be found at https://pomax.github.io/mj and uses "Chinese Classical" rules for play and scoring.

![image](https://user-images.githubusercontent.com/177243/53303347-273d1680-381e-11e9-8356-9c3968335274.png)

#### Debugging using query parameters

The following URL query parameters are supported for debugging purposes:

- `debug=true` turns on extended debug logging
- `seed=<num>` make pseudo-random number generator use this seed value
- `autoplay=true` immediately starts a game with four bots playing each other
- `play=<num>` number of milliseconds paused between bot actions
- `hand=<num>` number of milliseconds paused on the score screen before starting a new hand
- `force_open_bot_play=true` show the tiles that the "not us" bots are playing with
- `wall_hack=<wall hack name>` override the wall instantiation to always be one specific pattern. See [`core/wall.js`](https://github.com/Pomax/mj/blob/master/src/js/core/wall-hack.js).

#### I have questions..?

That's great, I'd be happy to answer them! Feel free to [tweet at me](https://twitter.com/TheRealPomax) for shallow engagement, or file an issue over on [the issue tracker](https://github.com/Pomax/mj/issues) if you need deeper engagement.
