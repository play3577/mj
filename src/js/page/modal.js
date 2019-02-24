// Simple general purpose modal
let modal = document.querySelector(".modal");
let panels = [];

/**
 * Create a new modal panel to show data in.
 */
function makePanel(name) {
  let panel = document.createElement("div");
  panel.classList.add("panel");
  if (name) panel.classList.add(name);
  panels.forEach(p => (p.style.display = "none"));
  panels.push(panel);
  modal.appendChild(panel);
  return panel;
}

/**
 * Close the currently-active modal, which will either
 * reveal the underlying modal, or hide the master overlay.
 */
function close() {
  let panel = panels.pop();
  if (panel) modal.removeChild(panel);
  if (panels.length) {
    let panel = panels[panels.length - 1]
    panel.style.display = "block";
    if (panel.gainFocus) panel.gainFocus();
  }
  else modal.classList.add("hidden");
}

/**
 * This modal offers a label and a set of button choices
 * to pick from. Buttons can be navigated with the
 * cursor keys for one handed play.
 */
modal.choiceInput = (label, options, resolve, cancel) => {
  let panel = makePanel();
  panel.innerHTML = `<h1>${label}</h1>`;

  let bid = 0;
  let btns = [];

  options.filter(v=>v).forEach(data => {
    let btn = document.createElement("button");
    btn.textContent = data.label;
    btn.addEventListener("click", e => {
      close();
      document.removeEventListener('focus', panel.gainFocus);
      resolve(data.value);
    });
    btn.addEventListener("keydown", e => {
      e.stopPropagation();
      let code = e.keyCode;
      let willBeHandled = (VK_UP[code] || VK_DOWN[code] || VK_START[code] || VK_END[code]);
      if (!willBeHandled) return;
      e.preventDefault();
      if (VK_UP[code]) bid = (bid===0) ? btns.length - 1 : bid - 1;
      if (VK_DOWN[code]) bid = (bid===btns.length - 1) ? 0 : bid + 1;
      if (VK_START[code]) bid = 0;
      if (VK_END[code]) bid = btns.length - 1;
      btns[bid].focus();
    });
    panel.appendChild(btn);
  });

  modal.classList.remove("hidden");

  btns = panel.querySelectorAll(`button`);
  panel.gainFocus = () => btns[bid].focus();

  if (cancel) {
    let handleKey = evt => {
      if (evt.keyCode === 27) {
        evt.preventDefault();
        document.removeEventListener('keydown', handleKey);
        modal.classList.add("hidden");
        cancel();
      }
    }
    document.addEventListener('keydown', handleKey);
  }

  document.addEventListener('focus', panel.gainFocus);
  panel.gainFocus();
};

/**
 * Show a detailed score log for a particular player.
 */
function showScoreDetails(pid, log) {
  let panel = makePanel(`score-breakdown`);
  panel.innerHTML = `<h3>Score breakdown for player ${pid}</h3>`;

  let table = document.createElement('table');
  let data = [
    `<tr><th>element</th><th>points</th></tr>`,
    ...log.map(line => {
      let mark = ` for `;
      if (line.indexOf(mark) > -1) {
        let parts = line.split(mark);
        return `<tr><td>${parts[1]}</td><td>${parts[0].replace('double', 'dbl')}</td></tr>`;
      } else {
        return `<tr><td colspan="2">${line}</td></tr>`;
      }
    })
  ];
  table.innerHTML = data.join(`\n`);
  panel.appendChild(table);

  let ok = document.createElement('button');
  ok.textContent = 'OK';
  ok.addEventListener('click', close);
  panel.appendChild(ok);
  ok.focus();
}

/**
 * Show the end-of-hand score breakdown.
 */
modal.setScores = (hand, scores, adjustments, resolve) => {
  let panel = makePanel(`scores`);
  panel.innerHTML = `<h3>Scores for hand ${hand}</h3>`;

  let builder = document.createElement('div');
  builder.innerHTML = `
  <table>
    <tr>
      <th>&nbsp;</th>
      <th>player 0</th>
      <th>player 1</th>
      <th>player 2</th>
      <th>player 3</th>
    </tr>
    <tr>
      <td>winner</td>
      <td>${scores[0].winner ? '*' : ''}</td>
      <td>${scores[1].winner ? '*' : ''}</td>
      <td>${scores[2].winner ? '*' : ''}</td>
      <td>${scores[3].winner ? '*' : ''}</td>
    </tr>
    <tr>
      <td>basic</td>
      <td>${scores[0].score}</td>
      <td>${scores[1].score}</td>
      <td>${scores[2].score}</td>
      <td>${scores[3].score}</td>
    </tr>
    <tr>
      <td>doubles</td>
      <td>${scores[0].doubles}</td>
      <td>${scores[1].doubles}</td>
      <td>${scores[2].doubles}</td>
      <td>${scores[3].doubles}</td>
    </tr>
    <tr>
      <td>total</td>
      <td>${scores[0].total}</td>
      <td>${scores[1].total}</td>
      <td>${scores[2].total}</td>
      <td>${scores[3].total}</td>
    </tr>
    <tr>
      <td>win/loss</td>
      <td>${adjustments[0]}</td>
      <td>${adjustments[1]}</td>
      <td>${adjustments[2]}</td>
      <td>${adjustments[3]}</td>
    </tr>
    <tr class="details">
      <td>&nbsp;</td>
      <td>details</td>
      <td>details</td>
      <td>details</td>
      <td>details</td>
    </tr>
  </table>
  `;
  let table = builder.querySelector('table');
  Array
    .from(table.querySelectorAll('tr.details td'))
    .slice(1)
    .map((e,pid) => {
      e.addEventListener('click', evt => {
        showScoreDetails(pid, scores[pid].log);
      });
    });
  panel.appendChild(table);

  let ok = document.createElement('button');
  ok.textContent = 'OK';
  ok.addEventListener('click', () => {
    close();
    document.removeEventListener('focus', panel.gainFocus);
    resolve();
  });
  panel.appendChild(ok);

  // Auto-dismiss the score panel during bot play,
  // UNLESS the user interacts with the modal.
  let dismiss = () => ok.click();
  if(config.BOT_PLAY) setTimeout(() => dismiss(), config.HAND_INTERVAL);
  panel.addEventListener('click', () => {
    dismiss = () => {};
    panel.gainFocus();
  });

  modal.classList.remove("hidden");

  panel.gainFocus = () => ok.focus();
  document.addEventListener('focus', panel.gainFocus);
  panel.gainFocus();
};
