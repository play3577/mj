class SettingsModal {
  constructor(modal) {
      this.modal = modal;
  }

  /**
   * Configure all the configurable options and
   * then relaunch the game on the appropriate URL.
   */
  show() {
    let panel = this.modal.makePanel(`settings`);
    panel.innerHTML = `
      <h3>Change the game settings</h3>
      <p>
        The follow settings change how the game works, but while
        the first three options are related to playing the game,
        all the other options are primarily intended for debugging.
      </p>
    `;

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
      rules: RULES.toString(),
      force_open_bot_play: FORCE_OPEN_BOT_PLAY.toString(),
      show_claim_suggestion: SHOW_CLAIM_SUGGESTION.toString(),
      show_bot_suggestion: SHOW_BOT_SUGGESTION.toString(),
      bot_chicken_threshold: BOT_CHICKEN_THRESHOLD.toString(),
      debug: DEBUG.toString(),
      seed: SEED.toString(),
      nosound: NO_SOUND.toString() ,
      autoplay: PLAY_IMMEDIATELY.toString(),
      pause_on_blur: PAUSE_ON_BLUR.toString(),
      force_draw: FORCE_DRAW.toString(),
      play: PLAY_INTERVAL.toString(),
      hand: HAND_INTERVAL.toString(),
      bot_delay: BOT_DELAY_BEFORE_DISCARD_ENDS.toString(),
      wall_hack:  WALL_HACK
    };

    const options = {
      'Rules': { key: 'rules', options: [...Ruleset.getRulesetNames()] },
      'Always show everyone\'s tiles': { key: 'force_open_bot_play', options: ['true','false'] },
      'Highlight claimable discards': { key: 'show_claim_suggestion', options: ['true','false'] },
      'Show bot play suggestions': { key: 'show_bot_suggestion', options: ['true','false'] },
      '-': {},
      'Turn on debug logging' : { key: 'debug', options: ['true','false'] },
      'Set random number seed': { key: 'seed' },
      'Play without sound': { key: 'nosound', options: ['true','false'] },
      'Autostart bot play': { key: 'autoplay', options: ['true','false'] },
      'Bot quick play threshold': { key: 'bot_chicken_threshold' },
      'Pause game unless focused': { key: 'pause_on_blur', options: ['true','false'] },
      'Pretend hands start after a draw': { key: 'force_draw', options: ['true','false'] },
      'Delay (in ms) between player turns': { key: 'play' },
      'Delay (in ms) before starting next hand': { key: 'hand' },
      'Delay (in ms) for bots reacting to things': { key: 'bot_delay' },
      'Set up a specific wall': { key: 'wall_hack', options: ['', ...Object.keys(WallHack.hacks)], value: values.wall_hack },
    };


    Object.keys(options).forEach(label => {
      if (label==='-') {
        let row = document.createElement('tr');
        row.innerHTML = `<td colspan="2">&nbsp;</td>`;
        return table.appendChild(row);
      }
      let data = options[label];
      let value = values[data.key];
      let row = document.createElement('tr');
      let field = `<input class="field" type"text" value="${value}">`;
      if (data.options) {
        field = `<select class="field">${data.options.map(t => `<option value="${t}"${t===value? ` selected`:``}>${t.replace(/_/g,' ')}</option>`)}</select>`;
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
    row.innerHTML = `
      <td>
        <input id="ok" type="submit" value="Play using these settings">
      </td>
      <td>
        <input id="reset" type="reset" value="Reset to default settings">
      </td>
    `;
    table.appendChild(row);

    form.addEventListener("submit", evt => {
      evt.preventDefault();
      let query = Object.keys(values).map(key => `${key}=${values[key]}`);
      window.location.search = `?${query.join('&')}`;
    });

    let ok = table.querySelector('#ok');
    panel.gainFocus = () => ok.focus();

    let reset = table.querySelector('#reset');
    reset.addEventListener('click', evt => (window.location.search=''));

    this.modal.addFooter(panel, "Discard changes");
  }
}

if (typeof process !== "undefined") {
  module.exports = SettingsModal;
}
