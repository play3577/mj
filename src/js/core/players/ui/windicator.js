/**
 * A dedicated bit of code for rotating the winds as hands are played.
 */
const rotateWinds = (function generateRotateWindsFunction() {
  const winds = Array.from(document.querySelectorAll('.player-wind'));
  const indicator = document.querySelector('.windicator');
  const handcount = indicator.querySelector('.hand-counter');

  let previous = 0;

  /**
   * This is the function that is exposed to UI code, and effects
   * the rotation of the player winds, and shifting the wind of
   * the round when appropriate.
   */
  function rotateWinds(wind=false, wotr=false, hand='', draws='') {
    // we mark which round, hand, and replay this is:
    handcount.innerHTML = `round ${1+wotr}<br>hand ${hand}`;
    if (draws) { handcount.innerHTML += `<br>rtr ${draws}`; }

    // the end of the game is indicated by there being no hand number.
    if (!hand) return (indicator.classList.add('done'));

    // determine what the hand wind id would be, and if it's the
    // same as last round's, we don't update anything, because
    // nothing has changed.
    let h = (wotr*4 + wind);
    if (h===previous) return;

    // if the hand wind id is a different id, rotate the winds!
    previous = h;
    let p = (((h/4)|0)%4);
    let offset = (2 * p);

    winds.forEach(e => {
      indicator.style.setProperty('--slide', offset + 'em');
           if (e.classList.contains('tc')) { e.classList.remove('tc'); e.classList.add('rc'); }
      else if (e.classList.contains('rc')) { e.classList.remove('rc'); e.classList.add('bc'); }
      else if (e.classList.contains('bc')) { e.classList.remove('bc'); e.classList.add('lc'); }
      else if (e.classList.contains('lc')) { e.classList.remove('lc'); e.classList.add('tc'); }
    });
  }

  // and of course, make sure to remember to expose that function...
  return rotateWinds;
})();
