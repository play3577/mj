function legalClaim(claimtype, wintype, tilenumber, tiles, locked, maychow) {
  if (claimtype === "win") {
    claimtype = wintype;
    wintype = true;
  }

  // convert tiles into tile counts
  const count = {};
  tiles.forEach(tile => {
    count[tile] = count[tile] || 0;
    count[tile]++;
  });

  // TODO: improve the below checks to verify that the rest of
  //       the hand conforms to a winning pattern.

  // simple checks
  if (wintype && claimtype === "pair" && count[tilenumber]) return true;
  if (claimtype === "pung" && count[tilenumber] >= 2) return true;
  if (claimtype === "kong" && count[tilenumber] === 3) return true;

  // slightly-more-work checks.
  if (maychow && claimtype.indexOf("chow") > -1) {
    const suit = (tilenumber / 9) | 0;
    const t = tilenumber,
      p2 = t - 2,
      p1 = t - 1,
      n1 = t + 1,
      n2 = t + 2;

    const samesuit = t => t < 27 && ((t / 9) | 0) === suit;

    if (claimtype === "chow3" && count[p2] && samesuit(p2) && count[p1])
      return true;

    if (
      claimtype === "chow2" &&
      count[p1] &&
      samesuit(p1) &&
      count[n1] &&
      samesuit(n1)
    )
      return true;

    if (claimtype === "chow1" && count[n2] && samesuit(n2) && count[n1])
      return true;
  }

  // TODO: technically if this is a win, we need to also verify that the remaining
  //       tiles form legal sets, but that's something we can do much later.
  return false;
}

// Make sure we can use this in node and browser context alike:
module.exports = { legalClaim };
