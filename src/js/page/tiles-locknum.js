(function generateLockedSetSeparationCSS() {

  const style = document.createElement("style");
  const rules = [];
  const max = 8 + 4*4 + 2; // all bonus tiles, four kongs, and a pair (damn!)
  const max_dist = 5;      // locknum difference between two first-tiles-in-set

  for (let i=1; i<max; i++) {
    for (let j=i+1; j<=i+max_dist; j++) {
      // NOTE: This relies on the --mr variable that is declared in tiles-locknum.css
      rules.push(`.tile[data-locknum="${i}"] + .tile[data-locknum="${j}"] { margin-left: var(--mr); }`);
    }
  }

  const css = rules.join('\n');
  style.textContent = css;
  document.head.appendChild(style);

})();
