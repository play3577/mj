// Simple general purpose modal
let modal = document.querySelector(".modal");

/**
 * ...
 */
modal.choiceInput = (label, options, resolve) => {
  let panel = modal.querySelector('.panel');
  panel.innerHTML = `<p>${label}</p>`;

  options.filter(v=>v).forEach(data => {
    let btn = document.createElement("button");
    btn.textContent = data.label;
    btn.addEventListener("click", e => {
      modal.classList.add("hidden");
      resolve(data.value);
    });
    panel.appendChild(btn);
  });

  modal.classList.remove("hidden");
};

/**
 * ...
 */
modal.setScores = (hand, scores, adjustments, resolve) => {
  console.log(adjustments);

  let panel = modal.querySelector('.panel');
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
      <td>pay/loss</td>
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
        alert(scores[pid].log.join('\n'));
      });
    });
  panel.appendChild(table);

  let ok = document.createElement('button');
  ok.textContent = 'OK';
  ok.addEventListener('click', () => {
    modal.classList.add("hidden");
    resolve();
  });
  panel.appendChild(ok);

  if(config.BOT_PLAY) setTimeout(() => ok.click(), config.HAND_INTERVAL);

  modal.classList.remove("hidden");
};
