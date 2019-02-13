const create = (t, hidden) => {
  let span = document.createElement('span');
  span.className = 'tile';
  span.dataset.tile = t;
  if (t < 34) {
    if (hidden) { span.dataset.hidden = 'hidden'; }
  } else {
    span.dataset.bonus = 'bonus';
    span.dataset.locked = 'locked';
  }
  span.getTileFace = () => (span.dataset.tile|0);
  return span;
}

const countTileOccurences = clone => {
  // let's just compute this *super* naively.
  clone.forEach(t => {
    let val = t.getTileFace();
    let count = 1;
    clone.forEach(o => {
      if (t===o) return;
      let val2 = o.getTileFace();
      if (val === val2) {
        count++;
      }
    });
    t.count = count;
  });
};

const removeAllListeners = el => {
  // When adding a function like this, make sure
  // you have an idea of how you're going to make
  // sure you can remove it as soon as possible
  // again, e.g. using an event delegator that
  // comes with an .off() or .forget() or the like.
  let c = el.cloneNode();
  while (el.children.length) {
    c.appendChild(el.firstChild);
  }
  el.parentNode.replaceChild(c, el);
  return c;
};
