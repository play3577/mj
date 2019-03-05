class Modal {
  constructor() {
    this.modal = document.querySelector(".modal");
    this.gameBoard = document.querySelector('.board');
    this.panels = [];
    this.choice = new OptionsDialog(this);
    this.settings = new SettingsModal(this);
    this.scores = new ScoreModal(this);
  }

  reveal() {
    this.modal.classList.remove("hidden");
  }

  hide() {
    this.modal.classList.add("hidden");
  }

  /**
   * Create a new modal panel to show data in.
   */
  makePanel (name) {
    let panels = this.panels;
    let panel = document.createElement("div");
    panel.classList.add("panel");
    if (name) panel.classList.add(name);
    panels.forEach(p => (p.style.display = "none"));
    panels.push(panel);
    this.modal.appendChild(panel);
    return panel;
  }

  /**
   * Close the currently-active modal, which will either
   * reveal the underlying modal, or hide the master overlay.
   */
  close(unbind=[]) {
    unbind.forEach(opt => {
      opt.object.addEventListener(opt.evtName, opt.handler);
    });
    let modal = this.modal;
    let panels = this.panels;
    let panel = panels.pop();
    if (panel) modal.removeChild(panel);
    if (panels.length) {
      let panel = panels[panels.length - 1]
      panel.style.display = "block";
      if (panel.gainFocus) panel.gainFocus();
    }
    else {
      this.hide();
      this.gameBoard.focus();
    }
  }

  /**
   * Add a generic footer with an "OK" button,
   * and automated focus handling.
   */
  addFooter(panel, modalLabel="OK", resolve=(()=>{})) {
    let ok = document.createElement('button');
    ok.textContent = modalLabel;
    ok.addEventListener('click', () => {
      this.close([{ object:this.gameBoard, evntName:'focus', handler: panel.gainFocus }]);
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

    panel.gainFocus = () => ok.focus();
    this.gameBoard.addEventListener('focus', panel.gainFocus);
    panel.addEventListener('click', panel.gainFocus);
    panel.addEventListener('touchstart', panel.gainFocus);
    panel.gainFocus();
  }

  /**
   * Offer a button dialog modal
   */
  choiceInput(label, options, resolve, cancel)  {
    this.reveal();
    this.choice.show(label, options, resolve, cancel);
  }

  /**
   * Show the end-of-hand score breakdown.
   */
  setScores(hand, scores, adjustments, resolve) {
    this.reveal()
    this.scores.show(hand, scores, adjustments, resolve);
  };

  /**
   * Show all available settings for the game.
   */
  pickPlaySettings() {
    this.reveal()
    this.settings.show();
  }
}

let modal = new Modal();
