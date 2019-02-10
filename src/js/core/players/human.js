/**
 * And this is a human player... which is "a kind
 * of bot player" and that might seem surprising,
 * but the reason we do this is because it allows
 * us to get a bot player helping the human player
 * "for free", and that's great!
 */
class HumanPlayer extends BotPlayer {
  constructor(id, proxyWall) {
    super(id, proxyWall);
    this.mayDiscard = false;
    this.maySendClaim = false;

    // we will see the "knowledge" panel with our tracker
    this.tracker.bindTo(document.querySelector(".knowledge"));

    // humans need a UI to play mahjong.
    this.ui = new ClientUI(this.id);
  }

  append(tile, concealed=false) {
    return super.append(tile, concealed);
  }

  determineDiscard(resolve) {
    // Let's ask our "bot" assistant for what
    // it would suggest we throw away:
    super.determineDiscard(suggestion => {
      if (BOT_PLAY) return resolve(suggestion);
      this.ui.listenForDiscard(resolve, suggestion);
    });
  }

  determineClaim(pid, discard, resolve, interrupt) {
    // And of course, the same applies here:
    let suggestion = super.determineClaim(pid, discard, suggestion => {
      if (BOT_PLAY) return resolve(suggestion);
      this.ui.listenForClaim(pid, discard, resolve, interrupt);
    });
  }
}
