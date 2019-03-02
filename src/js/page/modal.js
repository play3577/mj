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
    if (Object.keys(data).length===0) {
      return panel.appendChild(document.createElement('br'));
    }

    if (data.heading) {
      let heading = document.createElement('h1');
      heading.textContent = data.heading;
      return panel.appendChild(heading);
    }


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
    `<tr><th>points</th><th>element</th></tr>`,
    ...log.map(line => {
      let mark = ` for `;
      if (line.indexOf(mark) > -1) {
        let parts = line.split(mark);
        return `<tr><td>${parts[0].replace(/doubles?/, `dbl`)}</td><td>${parts[1]}</td></tr>`;
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


/**
 * Configure all the configurable options and
 * then relaunch the game on the appropriate URL.
 */
modal.pickPlaySettings = () => {
  let panel = makePanel(`settings`);
  panel.innerHTML = `<h3>Change game settings</h3>`;

  let form = document.createElement('form');
  form.setAttribute("name", "settings");
  form.setAttribute("action", "index.html");
  form.setAttribute("method", "GET");
  let table = document.createElement('table');
  table.innerHTML = `
    <tr>
      <th>setting</th>
      <th>value</th>
    </tr>
  `;
  form.appendChild(table);
  panel.appendChild(form);

  // add all config options here
  const values = {
    debug: DEBUG.toString(),
    seed: SEED.toString(),
    nosound: NO_SOUND.toString() ,
    autoplay: PLAY_IMMEDIATELY.toString(),
    pause_on_blur: PAUSE_ON_BLUR.toString(),
    force_draw: FORCE_DRAW.toString(),
    force_open_bot_play: FORCE_OPEN_BOT_PLAY.toString(),
    show_bot_claim_suggestion: SHOW_BOT_CLAIM_SUGGESTION.toString(),
    play: PLAY_INTERVAL.toString(),
    hand: HAND_INTERVAL.toString(),
    bot_delay: BOT_DELAY_BEFORE_DISCARD_ENDS.toString(),
    wall_hack:  WALL_HACK
  };

  const options = {
    'Turn on debug logging' : { key: 'debug', options: ['true','false'] },
    'Set random number seed': { key: 'seed' },
    'Play without sound': { key: 'nosound', options: ['true','false'] },
    'Autostart bot play': { key: 'autoplay', options: ['true','false'] },
    'Pause game unless focused': { key: 'pause_on_blur', options: ['true','false'] },
    'Pretend hands start after a draw': { key: 'force_draw', options: ['true','false'] },
    'Always show everyone\'s tiles': { key: 'force_open_bot_play', options: ['true','false'] },
    'Highligh discard if you can claim it': { key: 'show_bot_claim_suggestion', options: ['true','false'] },
    'Delay (in ms) between player turns': { key: 'play' },
    'Delay (in ms) before starting next hand': { key: 'hand' },
    'Delay (in ms) for bots reacting to things': { key: 'bot_delay' },
    'Set up a specific wall': { key: 'wall_hack', options: ['', ...Object.keys(WallHack.hacks)] },
  };


  Object.keys(options).forEach(label => {
    let data = options[label];
    let value = values[data.key];
    let row = document.createElement('tr');
    let field = `<input class="field" type"text" value="${value}">`;
    if (data.options) {
      field = `<select class="field">${data.options.map(t => `<option${t===value? ` selected`:``}>${t}</option>`)}</select>`;
    }
    row.innerHTML = `
      <td>${label}</td>
      <td>${field}</td>
    `;
    table.appendChild(row);
    let element = row.querySelector('.field:last-child');
    element.addEventListener('input', evt => {
      values[data.key] = evt.target.value;
    });
  });

  let row = document.createElement('tr');
  row.innerHTML = `<td colspan="2"><input id="ok" type="submit" value="Play using these settings"></td>`;
  table.appendChild(row);

  form.addEventListener("submit", evt => {
    evt.preventDefault();
    let query = Object.keys(values).map(key => `${key}=${values[key]}`);
    window.location.search = `?${query.join('&')}`;
  });

  modal.classList.remove("hidden");

  panel.gainFocus = () => ok.focus();
  document.addEventListener('focus', panel.gainFocus);
  panel.gainFocus();
}
