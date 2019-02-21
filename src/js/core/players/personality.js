/**
 * ...docs go here...
 */
class Personality {
  constructor() {
    this.type = false;
  }

  /**
  * A quick way to switch a personality
  * to a "score lots of points" discard
  * policy rather than the default.
  */
  goBig() {
    this.type = 'big';
  }

  /**
  * This is a routing function to go from stats
  * object to a score based on that object.
  */
  getStatScore(stats) {
    if (this.type === false) return 0;
    if (this.type === 'big') return this.getBigScore(stats);
  }

  /**
  * This personality, hopefully, prioritises
  * nice, high scoring hands, by penalising
  * chows and unclean hands, and boosting one
  * suit, honours, and pungs.
  */
  getBigScore(stats) {
    let score = 0;

    // as few chows as possible thanks
    score += -10 * stats.chowCount;

    // and clean, please.
    let s = stats.suit, s1 = s[0]>0, s2 = s[1]>0, s3 = s[2]>0;
    if (s1 || s2 || s3) {
    if (s1 && s2 && s[2]) score -= 30; // eww
    else if ((s1 && s2) || (s2 && s3)) score -= 10; // still meh
    else score += 30; // clean. now we're talking
    } else {
    // goodness, all honours! *_*
    score += 20;
    }

    // and pung hand.
    score += 25 * stats.pungCount;

    return score;
  }
}
