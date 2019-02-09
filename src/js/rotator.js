const html = document.querySelector('html');
const winds = Array.from(document.querySelectorAll('.player-wind'));
const indicator = document.querySelector('.windicator');

let shuffles = 0;

indicator.addEventListener("click", rotateWinds);

function rotateWinds(evt) {
  shuffles++;
  offset = (2 * (((shuffles/4)|0)%4))

  if (shuffles < 16) winds.forEach(e => {
    html.style.setProperty('--slide', offset + 'em');

    if(e.classList.contains('tc')) {
      e.classList.remove('tc');
      e.classList.add('lc');
    }
    else if(e.classList.contains('rc')) {
      e.classList.remove('rc');
      e.classList.add('tc');
    }
    else if(e.classList.contains('bc')) {
      e.classList.remove('bc');
      e.classList.add('rc');
    }
    else if(e.classList.contains('lc')) {
      e.classList.remove('lc');
      e.classList.add('bc');
    }
  });
  else winds.forEach(e => {
    indicator.classList.add('done');
  });
  return shuffles;
}
