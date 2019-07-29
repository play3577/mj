import RANDOM_NAMES from "./random-names.js";
import TileBuilders from "./tile-builders.js";
import Interaction from "./interaction.js";

// Used by morphdom in update()
const onBeforeElUpdated = (fromEl, toEl) => !fromEl.isEqualNode(toEl);

// Used in the claim/win button actions
const removeClaimOptions = () => {
  document
    .querySelectorAll(`.claim-button`)
    .forEach(b => b.parentNode.removeChild(b));
};


/**
 * The web client is effectively a thin client around
 * the real client - it receives state updates that ensure
 * that the browser is always in the same state as the
 * real client, and its main purpose is to make sure it
 * presents that state to the user in whatever fashion
 * makes the most sense (vue, react, vanilla JS with
 * template string HTML, whatever works for you).
 */
export default class WebClientClass {
  setRandomName() {
    let name = RANDOM_NAMES[this.id];
    if (name) this.server.user.setName(name);
  }

  constructor() {
    this.timers = {};
    setTimeout(() => this.setRandomName(), 500);
    window.webclient = this;
    // TODO: add a way to declare a kong on one's own turn.
    // TODO: add a way to merge a kong on one's own turn.
    // TODO: add in chat functionality?
  }

  /**
   * This a socketless API function that gets called automatically
   * any time the remote client updates its state. The socketless
   * framework coordinates synchronization, and any time the
   * client state is updated, this function will run.
   */
  update() {
    // We "rebuild" the entire UI every time an update comes in,
    // which browsers can do REALLY REALLY FAST as long as you
    // don't update the live DOM until you're done, because it's
    // not the DOM that kills you, it's the reflow that happens
    // if you generate your new DOM _in_ the active DOM, rather
    // than generating the entire thing first, and then performing
    // a single old-for-new swap.

    const ui = main(
      { id: `client` },
      this.renderActiveGame(),
      div(
        { id: `lobbydata` },
        this.renderGameList(),
        section(
          { id: `lobby` },
          ul({ id: `users` }, this.renderUsers()),
          ul({ id: `chat` })
        )
      ),
      this.renderFooter()
    );

    // This is the smarter part: we just regenerated the entire UI,
    // but we don't swap out the old for the new. Instead, we use
    // morphdom to selectively replace only the parts that have changed,
    // with a speed-up trick mentioned in the docs.
    //
    // See https://github.com/patrick-steele-idem/morphdom for more
    // information on why adding that `onBeforeElUpdated` helps.

    morphdom(document.getElementById(`client`), ui, { onBeforeElUpdated });
    this.bindDocumentEvents();
  }


  /**
   * This has to run after morphdom's changed "all the things", as we
   * cannot tack document-level event listening to elements that aren't
   * actually in the DOM.
   */
  bindDocumentEvents() {
    // Key bindings for letting the player select a discard.
    if (this.inGameLoop && this.currentPlayer === this.seat) {
      let cur = this.getLatest() || document.querySelector(`#seat-${this.seat} .tiles .tile`);
      Interaction.enableDiscardKeys(cur);
    } else Interaction.disableDiscardKeys();

    // Key bindings for letting the player claim a discard.
    Interaction.disableClaimKeys();
    if (this.currentDiscard) Interaction.enableClaimKeys(this.currentDiscard);
    else Interaction.disableClaimKeys();

    // Key bindings for letting the player indicate "ready for play".
    if (this.removeReady) this.removeReady = this.removeReady();
    if (document.querySelector('.ready-for-deal-button')) {
      this.removeReady = Interaction.on(`keydown`, evt => {
        if (evt.keyCode === 38) {
          this.server.round.ready();
        }
      });
    }

    // Key bindings for letting the player indicate "ready for next round".
    if (this.nextReady) this.nextReady = this.nextReady();
    if (document.querySelector(`.next-button`)) {
      this.nextReady = Interaction.on(`keydown`, evt => {
        if (evt.keyCode === 38) {
          this.server.game.ready();
        }
      });
    }
  }


  /**
   * This function renders the game that we're currently playing,
   * provided, of course, that we're involved in an active game.
   */
  renderActiveGame() {
    if (!this.currentGame) return;
    return section(
      { id: `active-game` },
      div(
        { id: `game-header` },
        this.renderGameHeader()
      ),
      this.renderGamePanel()
    );
  }

  /**
   * During play this needs to render the player tilebanks,
   * but at the end of rounds this needs to instead render
   * the score breakdown.
   */
  renderGamePanel() {
    if (this.wininfo) return this.renderScoreBreakdown()
    const wall = this.wall ? div({ id: `wall` }, this.renderWall()) : false;
    return [
      wall,
      div({ id: `players` }, this.renderPlayers()),
      div({ id: `discard` }, this.renderDiscard()),
      div({ id: `prompt` }), // preallocate this element: we may fill it with play buttons
    ];
  }

  /**
   * Render a score breakdown for all players, showing the tiles
   * they had, and how many points they received based on those.
   */
  renderScoreBreakdown() {
    let nextRoundButton;
    if (this.waiting) {
      const next = evt => {
        evt.target.disabled = true;
        this.server.game.ready();
      };
      nextRoundButton = button(
        { className: "next-button", "on-click": next },
        `${this.draw ? `Retry` : `Next`} round`
      );
    }

    let leaveGameButton;
    if (this.currentGame.finished) {
      const leave = () => this.server.game.leave();
      leaveGameButton = button(
        { className: `leave-button`, "on-click": leave },
        `leave game`
      );
    }

    return div(
      { className: "score-dialog" },
      nextRoundButton,
      leaveGameButton,
      this.renderPlayerScoreBreakDown()
    );
  }

  /**
   * Return the mapping of player to player score breakdown.
   */
  renderPlayerScoreBreakDown() {
    const { points, scores } = this.wininfo;

    return points.map((breakdown, p) => {
      const player = this.currentGame.players[p];

      breakdown.log.push(`summary: ${breakdown.score} tilepoints, ${breakdown.doubles} doubles, ${breakdown.total} total points`);
      breakdown.log.push(`old score: ${player.score - scores[p]}, adjustment: ${scores[p]}`);
      breakdown.log.push(`${this.currentGame.finished ? `final` : `new`} score: ${player.score}`);

      return ul(
        ul(
          { className: "mini-tiles" },
          span(player.name, ` (${player.windGlyph}) `),
          ul(player.tiles.map(TileBuilders.buildTile)),
          ul(player.locked.map(TileBuilders.buildLockedSet)),
          ul(player.bonus.map(TileBuilders.buildTile)),
        ),

        breakdown.log.map(line => li(line))
      )
    });
  }

  /**
   * Basic game information like name, round, and wind.
   */
  renderGameHeader() {
    const game = this.currentGame;
    const [adjective, ...animal] = game.name.split(' ');

    const heading = h1(`${adjective} `, a({
      href: `https://wikipedia.org/wiki/${animal.join(' ')}`,
      target: `_blank`
    }, animal.join(' ')));

    if (game.finished) return heading;

    return [
      span(`Round ${game.round.round}`),
      heading,
      span(`Wind of the round: ${game.round.windGlyph}`)
    ];
  }

  /**
   * This renders our local knowledge of what the wall
   * might still look like, in absence of knowing what
   * every other player is holding.
   */
  renderWall() {
    return Object.keys(this.wall).map(tilenumber => {
      return div(
        makearray(this.wall[tilenumber]).map(() => TileBuilders.buildTile(tilenumber))
      );
    });
  }

  /**
   * There are two types of players that we need to render:
   * ourselves, and not-ourselves. As such, this function
   * is primarily a routing function that draws all the bits
   * that are shared between us and others, and delegates
   * the bits that are different to secondary functions.
   */
  renderPlayers() {
    return this.currentGame.players.map(player => {
      if (player.seat === undefined) return;

      const props = {
        id: `seat-${player.seat}`,
        // We need to generate several classes
        className: classes(`player`, {
          active: player.seat === this.currentPlayer,
          winner: this.winner !== false && this.winner.id === player.id,
          left: player.left
        }),
        // and several data-attributes
        dataset: {
          seat: player.seat,
          wind: player.wind,
          glyph: player.windGlyph,
          name: player.name || player.id,
          score: player.score
        }
      };

      // As the only thing that differes is in showing
      // tiles, that's the only thing we delegate.
      return div(props, this.renderTiles(player));
    });
  }

  /**
   * This is purely a routing function for either our
   * own tiles (which we should see), or other player's
   * tiles (about which we know almost nothing).
   */
  renderTiles(player) {
    if (player.id === this.id) return this.renderOwnTiles();
    return this.renderOtherTiles(player);
  }

  /**
   * Rendering our own tiles is mostly a matter of just
   * doing that: render our tiles, then render our "locked"
   * sets of tiles, and any bonus tiles we may have picked up.
   * Finally, we also want to highlight the tile we just drew,
   * if it's our turn, because that makes play much easier
   * for human players.
   */
  renderOwnTiles() {
    const tiles = [
      this.renderHandTiles(),
      this.renderLockedTiles(),
      ul(
        { className: `bonus` },
        this.bonus.map(TileBuilders.buildTile)
      ),
      this.renderPlayButtons()
    ];
    this.highlightLatest(tiles[0]);
    return tiles;
  }

  /**
   * Render our own tiles: build `<li>` for each tile in this.tiles.
   */
  renderHandTiles() {
    // build tiles, but with added "click to discard" functionality
    const tiles = ul(
      { className: `tiles` },
      this.tiles.map(TileBuilders.buildTile).map(tile => {
        tile.on(`click`, evt => {
          if (!this.currentDiscard) {
            let tilenumber = parseInt(evt.target.dataset.tile);
            this.server.game.discardTile({ tilenumber });
          }
        })
        return tile;
      })
    );

    return tiles;
  }

  /**
   * Render our locked tiles: in order to make sure we
   * show them in groups, we tag all tiles with their
   * respective "set number".
   */
  renderLockedTiles() {
    return ul(
      { className: `locked` },
      this.locked.map(TileBuilders.buildLockedSet)
    );
  }

  /**
   * When it's our turn, it's always possible that the tile
   * we just drew was the tile we were waiting on to win,
   * so make sure to add a button that lets us declare that
   * we've won. People might mistakenly click it, just like
   * how in a real game you might mistakenly declare a win.
   * This is very much intentional, and many rules cost you
   * a whole lot of points if you declare a win erroneously.
   */
  renderPlayButtons() {
    // if someone won, play buttons are not required.
    if (this.winner !== false) return;

    // Is the entire game finished? If so, we don't need buttons either.
    let game = this.currentGame;
    if (game.finished) return;

    // Otherwise, render any buttons that make sense to show.

    let readyButton;
    if (this.waitingForDeal) {
      const ready = () => this.server.round.ready();
      readyButton = [
        button(
          { className: `ready-for-deal-button`, "on-click": ready },
          `ready`
        ),
        this.renderTimer(`play`)
      ];
    }
    const readyContainer = span({ className: `ready` }, readyButton);

    let winButton;
    if (!this.waitingForDeal && this.seat === this.currentPlayer) {
      const declareWin = () => confirm("Declare win?") ? this.server.game.declareWin() : undefined;
      winButton = button(
        { className: `declare-win-button`, "on-click": declareWin },
        `declare win`
      );
    }
    const winContainer = span({ className: `declare-win` }, winButton);

    return [readyContainer, winContainer];
  }

  /**
   * If it's our turn, return the (really, 'a') tile that we
   * were just dealt by the game.
   */
  getLatest(tiles) {
    if (!this.latestTile) return;
    tiles = tiles || document.querySelector(`#seat-${this.seat} .tiles`);
    const qs = `.tile[data-tile="${this.latestTile}"]`;
    return tiles.querySelector(qs);
  }

  /**
   * In order to allow human players to track what just happened
   * during a deal, we want to highlight the tile they just drew.
   */
  highlightLatest(tiles) {
    let tile = this.getLatest(tiles);
    if (tile) tile.classList.add(`latest`);
  }

  /**
   * Rendering other player's tiles requires knowing how many tiles
   * they have in their hand, without actually knowing how many
   * tiles they have in their hand: all we know is how many tiles
   * they have "locked" so far. However, we know that at outset they
   * should have 13 tiles, so we first figure out how many tiles they
   * have locked, and then use that to determine how many tiles they
   * must therefore have left in their hand. Maths!
   */
  renderOtherTiles(player) {
    let tilecount = 13;

    // First, figure out how many tiles this player has locked.
    // We use a custom function rather than the TileBuilders
    // version, as we need to do tile counting while building.
    const buildLocked = (claim, setnum) => {
      // how many tiles are involved in this claimed set?
      let { tilenumber, claimtype, wintype } = claim;
      if (claimtype === `win`) claimtype = wintype;
      let chowtype = false;
      if (claimtype.startsWith(`chow`)) {
        chowtype = parseInt(claimtype.replace(`chow`, ``)) - 1;
      }
      let count = claimtype === `kong` ? 4 : claimtype === `pair` ? 2 : 3;
      tilecount -= count;

      // Generate the "face up" tiles for this set, with some logic
      // that ensures for chows we generate a sequence.
      return makearray(count).map((_, i) => {
        let num = tilenumber + (chowtype === false ? 0 : i - chowtype);
        return TileBuilders.buildSetTile(num, setnum);
      });
    };

    const locked = (player.locked || []).map(buildLocked);

    // If this is the active player, and they've not discarded yet,
    // they will have one more tile because they just drew one, or
    // they just claimed something and have an extra tile that way.
    if (player.seat === this.currentPlayer && !this.currentDiscard) {
      tilecount++;
    }

    // Now we can generate the correct number of hidden tiles.
    // With one exception: if this game is over, we KNOW what tiles
    // that player is holding, and we can just directly generate them.
    // Did we do a bit more work in that case? Yes, but that's fine,
    // because it's rare, and imperceptibly fast.
    const tiles = player.tiles
      ? player.tiles.map(TileBuilders.buildTile)
      : makearray(tilecount).map(TileBuilders.buildHidden);

    // Finally, if this player is holding any bonus tiles, show those.
    let bonus;
    if (player.bonus) {
      const rendered = player.bonus.map(TileBuilders.buildTile);
      bonus = ul({ className: `bonus` }, rendered);
    }

    return [
      ul({ className: `tiles` }, tiles),
      ul({ className: `locked` }, locked),
      bonus
    ];
  }

  /**
   * The discard is a special tile that every player should be
   * able to click, but for different reasons:
   *
   * - the player that just discarded it should be able to take it back, and
   * - all other players should be able to place a claim on it.
   */
  renderDiscard() {
    if (!this.currentDiscard) return;

    let undoDiscard;
    if (this.currentDiscard.id === this.id) {
      undoDiscard = async evt => {
        let result = await this.server.game.undoDiscard();
        if (!result.allowed) evt.target.classList.add("claimed");
      };
    }

    const tilenumber = this.currentDiscard.tilenumber;
    const discardTile = TileBuilders.buildTile(tilenumber).on(`click`, undoDiscard);

    let claimOptions;
    if (this.currentDiscard.id !== this.id) {
      claimOptions = span(
        { id: `discard-buttons` },
        this.renderClaimOptions()
      );
    }

    this.currentDiscard.pass = () => {
      this.server.game.pass();
    };

    return span(
      `Current discard: `,
      discardTile,
      claimOptions,
      this.renderTimer(`discard`)
    );
  }

  // A helper function to determine whether we may claim a chow
  // from the discarding player.
  mayChow() {
    let l = this.players.length;
    let cs = (this.currentPlayer + 1) % l;
    return this.seat === cs;
  }

  /**
   * Claim options depend on the tile being played, and the player's
   * tiles in hand. However, one option is always to pass.
   */
  renderClaimOptions() {
    const pass = () => {
      removeClaimOptions();
      document.querySelector(`.pass-button`).disabled = true;
      this.server.game.pass();
    };

    const passButton = button({
      className: `btn pass-button`,
      "on-click": pass,
      disabled: this.passed
    }, "pass");

    return [
      passButton,
      this.generateClaimButtons()
    ];
  }

  /**
   * Generate all the possible claims that we might be able to
   * make for this discard, including a "win" option - when clicked,
   * this will present us with all the ways we can claim a win,
   * rather than all the ways we can normally claim a tile.
   */
  generateClaimButtons() {
    if (this.passed) return;

    const disableButtons = () => document
      .querySelectorAll(`.claim-button, .pass-button`)
      .forEach(b => (b.disabled = true));

    // Any claim that isn't a win leads to that claim getting
    // sent to the server for the current discard. There are
    // take-backies for claims!
    const processClaim = claimtype => {
      if (claimtype !== `win`) {
        disableButtons();
        return this.server.game.claim({ claimtype });
      }
    };

    // If a user clicks the win button, remove the regular
    // claim options and replace them with win options.
    const generateWinButtons = claims => {
      removeClaimOptions();
      const buttonRow = document.querySelector(`.pass-button`).parentNode;

      claims.filter(claim => claim.claimtype === `win`).forEach(claim => {
        const opt = {
          className: `btn claim-button win-button`,
          "on-click": () => {
            disableButtons();
            this.server.game.claim(claim);
          }
        };
        buttonRow.appendChild(button(opt, claim.wintype));
      });
    };

    const claims = [];
    let includeWinButton = false;
    // console.log(this.seat, this.currentDiscard.seat, this.mayChow());
    const possiblePlays = findTilesNeeded(this.tiles, this.locked.map(c => c.tiles), !this.mayChow()).evaluations;
    // console.log(possiblePlays);
    possiblePlays.forEach(play =>
      play.claimable.forEach(claim => {
        const { tilenumber, claimtype, wintype } = claim;
        if (claimtype === `win`) includeWinButton = true;
        if (tilenumber === this.currentDiscard.tilenumber) {
          if (claims.find(c => c.claimtype === claimtype && c.wintype === wintype)) return;
          claims.push(claim);
        }
      })
    );

    console.log(possiblePlays);

    const makeClaimButton = claim => {
      const { claimtype, wintype } = claim;
      let label = claimtype;
      let makeClaim =  () => processClaim(claimtype);
      return button({ className: `btn claim-button`, "on-click": makeClaim }, label);
    };

    return [
      claims.filter(claim => claim.claimtype !== `win`).map(makeClaimButton),
      !includeWinButton ? false : button({
        className: `btn claim-button`,
        "on-click": () => generateWinButtons(claims)
      }, `win` )
    ];
  }

  /**
   * Render either the list of all games that have been built
   * on the server, but only if we're not in a game right now.
   * If we are, we'll want to see that instead, of course.
   */
  renderGameList() {
    if (this.currentGame) return false;
    return section(
      { id: `gamelist` },
      ul({ id: `games` }, this.renderGames())
    );
  }

  /**
   * This function renders "lobby" information relating to games:
   * which games have been created, who's in them, etc.
   * If a game hasn't started yet, offer players the option to
   * join, and if the player was the one who created the game,
   * offer them the option to start the game.
   */
  renderGames() {
    return this.games.map(g => {
      if (g.finished) return;

      let joinStartButton = button(
        { disabled: !!this.currentGame },
        (g.id === this.id) ? `start` : `join`
      );

      let addBotButton;
      let configButton;
      let configurationPanel;

      if (g.id === this.id) {
        addBotButton = button({
          className: 'add-bot',
          'on-click': () => this.server.game.addBot(g.name)
        }, `add bot`);

        if (this.configure) {
          configurationPanel = this.renderConfigurationPanel(g);
        } else {
          configButton = button({
            className: 'change-config',
            'on-click': () => {
              this.configure = true;
              this.update();
            }
          }, `configure`);
        }
      }
      let item = li(
        { className: `game` },
        joinStartButton,
        `game: `,
        strong(g.name),
        `, players: `,
        g.players
          .map(p => this.users.find(u => u.id === p.id).name || p.id)
          .join(", "),
        addBotButton,
        configButton,
        configurationPanel,
      );

      if (g.inProgress) joinStartButton.disabled = true;
      else {
        let joinOrStart = async () => {
          this.server.game.join(g.name);
          this.server.game.start(g.name);
          // Note that these two operations are mutually
          // exclusive, because owner's can't join, and
          // non-owners can't start a game.
          joinStartButton.off(`click`, joinOrStart);
          joinStartButton.disabled = true;
        };
        joinStartButton.on(`click`, joinOrStart);
      }

      return item;
    });
  }

  /**
   * Turn the config a thing that can be changed
   */
  renderConfigurationPanel(game) {
    console.log(this.currentGame);

    // get a COPY of the config, so we can mess with it but discard the
    // changes in case the user selects "cancel" instead of "done".
    const config = JSON.parse(
      JSON.stringify(
        game.config ? game.config : getConfig(game.name)
      )
    );

    const options = Object.keys(config).map(key => {
      const entry = config[key];
      const { value, type } = entry;

      let control;

      // toggle switch
      if (type === `boolean`) {
        control = label(
          key,
          input({
            type: `checkbox`,
            value,
            checked: value===true,
            'on-input': evt => {
              entry.value = evt.target.checked;
              this.update();
            }
          })
        );
      }

      // number input
      if (type === `number`) {
        control = label(
          key,
          input({
            type,
            value,
            'on-input': evt => {
              entry.value = parseInt(evt.target.value);
              this.update();
            }
          })
        );
      }

      // pull-down selector
      if (type.forEach) {
        control = label(
          key,
          select({
            'on-change': evt => {
              entry.value = evt.target.value
              if (typeof value === `number`) {
                entry.value = parseInt(entry.value);
              }
              this.update();
            }
          },
          option(),
          type.map(v => option({ value: v, selected: v===value }, v)))
        );
      }
      return li(control);
    });

    const commitButton = button({ 'on-click': () => {
      this.configure = false;
      this.server.game.config(config);
    }}, `done`);

    const cancelButton = button({ 'on-click': () => {
      this.configure = false;
      this.update();
    }}, `cancel`);

    return div(
      h2('configuration'),
      ul(options),
      commitButton,
      cancelButton
    );
  }

  /**
   * This function renders "lobby" information relating to users:
   * show an entry for each client that the server thinks is connected.
   */
  renderUsers() {
    // If the user we're rendering is ourselves, offer a button
    // that lets us change our name. Because why not?
    const renderChangeButton = user => {
      if (user.id !== this.id) return;

      const changeName = () => {
        const name = prompt("your name?");
        if (name && name.trim()) this.server.user.setName(name);
      };

      return [` ←`, button(
        { className: `rename`, "on-click": changeName },
        `change name`
      )];
    };

    // If we know a user's name, render them by name. Otherwise, by id.
    const renderUser = user => {
      // filter bots from the name list, they are only relevant to games.
      if (user.name && user.name.indexOf('Bot') === 0) return false;

      // anyone else gets listed as expected
      return li(
        { className: `user` },
        span(
          { className: `name` },
          user.name || `unknown user ${user.id}`
        ),
        renderChangeButton(user)
      );
    }

    return this.users.map(renderUser);
  }

  /**
   * The footer contains the "create a game" and "quit from the server" buttons.
   */
  renderFooter() {
    let createGame;
    if (!this.currentGame) {
      createGame = p(
        `Create a game: `,
        button({ id: `create`, "on-click": () => this.server.game.create() }, `create`)
      );
    }

    const quit = () => {
      this.server.quit();
      window.location.port = 8000;
    };

    const quitServer = p(
      `Disconnect from the server: `,
      button({ id: `quit`, "on-click": quit }, `quit`)
    );

    // And the footer, which just wraps those two.
    return footer(createGame, quitServer);
  }

  // ===========================================
  //
  //          Timer functionality code
  //
  // ===========================================

  getTimer(name) {
    if (!this.timers[name]) {
      this.timers[name] = {
        timeout: false,
        value: 0,
        bar: undefined
      };
    }
    return this.timers[name];
  }

  /**
   * When a discard occurs, the server is already
   * counting down to close the claim window, and
   * so we want to make sure that the user gets
   * some kind of visual feedback in terms of how
   * close we are to claim resolution.
   */
  startTimer(name, timeout) {
    const timer = this.getTimer(name);
    const startTime = Date.now();
    const tick = (name) => {
      const passed = Date.now() - startTime;
      const timeoutProgress = passed / timeout;
      this.updateTimer(name, timeoutProgress);
      if (passed > timeout) return;
      timer.timeout = setTimeout(() => tick(name), 100);
    };
    tick(name);
  }

  /**
   * Update the visual timer based on how far
   * along we are.
   */
  updateTimer(name, value) {
    const timer = this.getTimer(name);
    timer.value = (100 * value) | 0;
    const bar = document.querySelector(`#${name}-timer .timer-bar`);
    if (bar) bar.style.width = `${timer.value}%`;
  }

  /**
   * If you start a timer, you need to be able
   * to stop it, too.
   */
  cancelTimer(name) {
    this.updateTimer(name, -1);
    clearTimeout(this.getTimer(name).timeout);
  }

  /**
   * Render a timer
   */
  renderTimer(name) {
    const timer = this.getTimer(name);
    const bar = span({ className: `timer-bar` });
    if (timer.value) bar.style.width = `${timer.value}%`;
    return span({ id: `${name}-timer`, className: `timer` }, bar);
  }

  // ===========================================
  //
  //  The  following  functions  are  handlers
  //  that we  need to  explicitly  listen for
  //  because they act as signals for updating
  //  parts of  the UI,  but don't cause state
  //  changes in the client, and so don't lead
  //  to a call to update() by socketless.
  //
  // ===========================================

  /**
   * ...
   */
  async "round:getReady"(timeout) {
    this.startTimer(`play`, timeout);
  }

  /**
   * ...
   */
  async "round:playStarted"() {
    this.cancelTimer(`play`);
  }

  /**
   * When the current player changes, we need to
   * cancel the discard timer. We could do this
   * by tracking the "previous" current player
   * and then in the update() function checking
   * whether that update's currentPlayer is the
   * same as, or different from, the previous
   * value, but that's quite a bit of code,
   * whereas we can also just listen for the
   * change signal and run one line of code.
   */
  async "round:setCurrentPlayer"(seat) {
    this.cancelTimer(`discard`);
  }

  /**
   * When a discard occurs, start the discard
   * timer. Again, we could do this by adding
   * code to update() that checks whether the
   * currentDiscard value changed, but that's
   * again far more code than just listening
   * for the discard signal, instead.
   */
  async "round:playerDiscarded"({ timeout }) {
    this.startTimer(`discard`, timeout);
  }

  /**
   * When a claim is awarded by the game
   * server, the discard is no longer relevant
   * and we should kill the timer. Again,
   * we could track this but you get the idea
   * by now.
   */
  async "round:claimAwarded"() {
    this.cancelTimer(`discard`);
  }

  /**
   * When a player takes back their dicard,
   * the discard timer no longer applies.
   */
  async "round:playerTookBack"({ id, seat, tilenumber }) {
    this.cancelTimer(`discard`);
  }
}

ClientServer.generateClientServer(WebClientClass);
