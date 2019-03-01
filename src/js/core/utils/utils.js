/**
 * Create a <span data-tile="..."></span> element
 * from a specified tile number. Also, because it's
 * such a frequent need, this adds a `getTileFace()`
 * function to the span itself.
 */
const create = (tileNumber, hidden) => {
  let span = document.createElement('span');
  span.className = 'tile';
  span.dataset.tile = tileNumber;
  if (tileNumber < 34) {
    if (hidden) { span.dataset.hidden = 'hidden'; }
  } else {
    span.dataset.bonus = 'bonus';
    span.dataset.locked = 'locked';
  }
  span.getTileFace = () => (span.dataset.tile|0);
  return span;
}
