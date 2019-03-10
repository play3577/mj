# Mahjong. In the browser.

1: We're talking real four player mahjong here. Not the one player solitair game. That "game" has literally nothing to do with mahjong.

2: This README.md has been kept sparse pending a set of full length development articles that walk through going from "having an idea" to "having finished writing a fully functional game".

The live version, which is effectively done (with tweaks of course are still happening), can be found at https://pomax.github.io/mj and uses "Chinese Classical" rules for play and scoring.

### What it looks like

![A screenshot of what the live game looks like when set to autoplay](https://user-images.githubusercontent.com/177243/53316594-5767d200-387d-11e9-86e2-ed8957d7feb2.png)

### This is a pure HTML, CSS, and JavaScript game

That means there are no bundlers, no web app packaging, no CSS preprocessors or JS transpiling, just an index.html, a bunch of CSS files, and a bunch of JS files. If you can load the page, you now have a full copy of the game that you can save to your desktop and congratulations, you now have your own copy "installed" without doing anything beyond just downloading the page and its local page assets.

I can hear the web devs amongst you thinking "but... then isn't it horribly inefficient?" to which I'm just going to point out that this is how we used to write the web and it was, and still is, blazing fast. This game has a [Google PageSpeed ranking of 98](https://developers.google.com/speed/pagespeed/insights/?url=https%3A%2F%2Fpomax.github.io%2Fmj%2F), so: don't be fooled (or, don't fool yourself) into thinking everything needs to be a web app bundle to be performant.

### Debugging using query parameters

Open `index.html` in your browser. Debugging options are set via URL query parameter, however, the way to toggle these is via the settings menu.

![A screenshot of the settings menu](https://user-images.githubusercontent.com/177243/53782965-9b358980-3ec4-11e9-8dd1-f81ed3aeba59.png)

### Node based testing

Most of the code is aware of whether it's running in the browser, or in node context. As such, the following things work:

- `node src/js/test/hand-generator` generates all possible hand patterns (based on tile category, not tile face)
- `node src/js/test/play-game` plays an entire game between four bots.
- `node src/js/core/algorithm/tiles-needed.js` runs unit tests
- `node src/js/core/scoring/chinese-classical.js` runs unit tests

### I have (a) question(s)!

I'd be happy to answer them! Feel free to [tweet at me](https://twitter.com/TheRealPomax) for shallow engagement, or file an issue over on [the issue tracker](https://github.com/Pomax/mj/issues) if you need deeper engagement.
