class ScoreModal {
  constructor(modal) {
    this.modal = modal;
  }



  /**
   * Show the entire game's score progression
   */
  showFinalScores(gameui, rules, scoreHistory, resolve) {
    console.log(scoreHistory);

    let panel = this.modal.makePanel(`final-scores`);
    panel.innerHTML = `<h3>Game finished</h3>`;

    let base = new Array(4).fill(rules.player_start_score);

    let table = document.createElement('table');
    let tbody = document.createElement('tbody');
    table.appendChild(tbody);
    tbody.innerHTML = `
      <tr>
        <th>hand</th>
        <th>player 0</th>
        <th>player 1</th>
        <th>player 2</th>
        <th>player 3</th>
        <th>&nbsp;</th>
      </tr>
      <tr>
        <td>&nbsp;</td>
        ${base.map(v => `<td>${v}</td>`).join('\n')}
        <td>&nbsp;</td>
      </tr>
    `;

    scoreHistory.forEach((record,hand) => {
      hand = hand + 1;
      let row = document.createElement('tr');
      let content = [0,1,2,3].map(id => {
        let winner = record.disclosure[id].winner;
        let value = record.adjustments[id];
        let score = (base[id] = base[id] + value);
        return `<td>${winner ? `<strong>${score}</strong>` : score}</td>`;
      });
      row.innerHTML = `
        <td>${hand}</td>
        ${content.join('\n')}
        <td><button>details</button></td>
      `;
      row.querySelector('button').addEventListener('click', () => {
        // load a specific hand ending into the UI
        gameui.loadHandPostGame(record.disclosure);
        // and show the score breakdown for that hand
        this.show(hand, record.scores, record.adjustments);
      });
      tbody.appendChild(row);
    });
    panel.appendChild(table);

    this.modal.addFooter(panel, "Back to the menu", resolve);
    panel.scrollTop = 0;
  }

  /**
   * Show the end-of-hand score breakdown.
   */
  show(hand, scores, adjustments, resolve) {
    let panel = this.modal.makePanel(`scores`);
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
        <td><button>details</button></td>
        <td><button>details</button></td>
        <td><button>details</button></td>
        <td><button>details</button></td>
      </tr>
    </table>
    `;
    let table = builder.querySelector('table');
    Array
      .from(table.querySelectorAll('tr.details td'))
      .slice(1)
      .map((e,pid) => {
        e.addEventListener('click', evt => {
          this.showScoreDetails(pid, scores[pid].log);
        });
      });
    panel.appendChild(table);

    if (resolve) this.modal.addFooter(panel, "Play next hand", resolve, true);
    else this.modal.addFooter(panel, "OK");
  }

  /**
   * Show a detailed score log for a particular player.
   */
  showScoreDetails(pid, log) {
    let panel = this.modal.makePanel(`score-breakdown`);
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

    this.modal.addFooter(panel, "Back to the scores");
  }
}
