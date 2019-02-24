# Mahjong. In the browser.

1: We're talking real four player mahjong here. Not the one player solitair game. That "game" has literally nothing to do with mahjong.

2: This README.md has been kept sparse pending a set of full length development articles that walk through going from "having an idea" to "having finished writing a fully functional game". 

The live version, which is effectively done (with tweaks of course are still happening), can be found at https://pomax.github.io/mj and uses "Chinese Classical" rules for play and scoring.

![A screenshot of what the live game looks like when set to autoplay](https://user-images.githubusercontent.com/177243/53303363-53589780-381e-11e9-8e2b-8702e56fd303.png)

#### This is a pure HTML, CSS, and JavaScript game

That means there are no bundlers, no web app packaging, no CSS preprocessors or JS transpiling, just an index.html, a bunch of CSS files, and a bunch of JS files. If you can load the page, you now have a full copy of the game that you can save to your desktop and congratulations, you now have your own copy "installed" without every having to install anything.

I can hear you think "but... then isn't it horribly inefficient?" to which I'm just going to point out that this game has a [Google PageSpeed ranking of 97](https://developers.google.com/speed/pagespeed/insights/?url=https%3A%2F%2Fpomax.github.io%2Fmj%2F), so: not even remotely.

#### Debugging using query parameters

The following URL query parameters are supported for debugging purposes:

- `debug=true` turns on extended debug logging
- `seed=<num>` make pseudo-random number generator use this seed value
- `autoplay=true` immediately starts a game with four bots playing each other
- `play=<num>` number of milliseconds paused between bot actions
- `hand=<num>` number of milliseconds paused on the score screen before starting a new hand
- `force_open_bot_play=true` show the tiles that the "not us" bots are playing with
- `wall_hack=<wall hack name>` override the wall instantiation to specific patterns for debugging specific plays. See [`core/wall-hack.js`](https://github.com/Pomax/mj/blob/master/src/js/core/wall-hack.js) for the list of available patterns.

#### I have questions!

That's great, I'd be happy to answer them! Feel free to [tweet at me](https://twitter.com/TheRealPomax) for shallow engagement, or file an issue over on [the issue tracker](https://github.com/Pomax/mj/issues) if you need deeper engagement.
