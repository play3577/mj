const html = document.querySelector('html');
const winds = Array.from(document.querySelectorAll('.player-wind'));
const indicator = document.querySelector('.windicator');
const handcount = indicator.querySelector('.hand-counter');

let previous = 0;

function rotateWinds(wind=false, wotr=false, hand='', draws='') {

  handcount.innerHTML = `round ${1+wotr}<br>hand ${hand}`;
  if (draws) { handcount.innerHTML += `<br>rtr ${draws}`; }

  if (!hand) return (indicator.classList.add('done'));

  let h = (wotr*4 + wind);

  if (h===previous) return;
  previous = h;

  let p = (((h/4)|0)%4);
  let offset = (2 * p);

  console.log(offset);

  winds.forEach(e => {
    indicator.style.setProperty('--slide', offset + 'em');

    if(e.classList.contains('tc')) {
      e.classList.remove('tc');
      e.classList.add('rc');
    }
    else if(e.classList.contains('rc')) {
      e.classList.remove('rc');
      e.classList.add('bc');
    }
    else if(e.classList.contains('bc')) {
      e.classList.remove('bc');
      e.classList.add('lc');
    }
    else if(e.classList.contains('lc')) {
      e.classList.remove('lc');
      e.classList.add('tc');
    }
  });
}
