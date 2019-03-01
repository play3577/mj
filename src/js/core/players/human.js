/**
 * And this is a human player... which is "a kind
 * of bot player" and that might seem surprising,
 * but the reason we do this is because it allows
 * us to get a bot player helping the human player
 * "for free", and that's great!
 */
class HumanPlayer extends BotPlayer {
  constructor(id) {
    super(id);
    // humans need a UI to play mahjong.
    this.ui = new ClientUI(this, this.tracker);
  }

  determineDiscard(resolve) {
    // Let's ask our "bot" assistant for what
    // it would suggest we throw away:
    super.determineDiscard(suggestion => {
      if (config.BOT_PLAY) return resolve(suggestion);
      this.ui.listenForDiscard(discard => {

        // If we're discarding, even if our bot superclass
        // determined we were holding a selfdrawn win, we
        // are not claiming a win and so need to unset this:
        if (discard) this.selfdraw = false;

        // Special handling for self-declared kongs:
        if (discard && discard.exception === CLAIM.KONG) {
          let kong = discard.kong;

          // fully concealed kong!
          if (kong.length === 4) this.lockClaim(kong, true);

          // melded kong from existing pung:
          else this.meldKong(kong[0]);
        }

        // And then fall through to the original resolution function
        resolve(discard);
      }, suggestion, this.lastClaim);
    });
  }

  determineClaim(pid, discard, resolve, interrupt, claimTimer) {
    // And of course, the same applies here:
    super.determineClaim(pid, discard, suggestion => {
      if (config.BOT_PLAY) return resolve(suggestion);
      this.ui.listenForClaim(pid, discard, suggestion, resolve, interrupt, claimTimer);
    });
  }
}
