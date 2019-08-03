/**
 * This set of functions is used to allow players to control play
 * using their arrow keys, rather than their mouse.
 */
const Interaction = (function() {
  // Used for selecting a discard using arrow keys:
  // - left/right arrows navigate throught the tiles
  // - up arrow discards tile

  let cur_focus;

  const refocus = evt => {
    cur_focus.classList.remove("highlight");

    if (evt.keyCode === 36) {
      // home
      evt.preventDefault();
      cur_focus = cur_focus.parentElement.children[0];
    }

    if (evt.keyCode === 35) {
      // end
      evt.preventDefault();
      cur_focus =
        cur_focus.parentElement.children[
          cur_focus.parentElement.children.length - 1
        ];
    }

    if (evt.keyCode === 37) {
      evt.preventDefault();
      if (cur_focus.previousSibling) cur_focus = cur_focus.previousSibling;
      else
        cur_focus =
          cur_focus.parentElement.children[
            cur_focus.parentElement.children.length - 1
          ];
    }
    if (evt.keyCode === 39) {
      evt.preventDefault();
      if (cur_focus.nextSibling) cur_focus = cur_focus.nextSibling;
      else cur_focus = cur_focus.parentElement.children[0];
    }

    cur_focus.classList.add("highlight");

    if (evt.keyCode === 38) {
      evt.preventDefault();
      cur_focus.click();
      disableDiscardKeys();
    }

    if (evt.keyCode === 40) {
      evt.preventDefault();
      console.log("declare kong somehow");
    }
  };

  function enableDiscardKeys(cur) {
    if (!cur_focus) {
      document.addEventListener("keydown", refocus);
    }
    cur_focus = cur;
    cur_focus.classList.add("highlight");
  }

  function disableDiscardKeys() {
    if (cur_focus) {
      document.removeEventListener("keydown", refocus);
    }
    cur_focus = false;
  }

  // Used for interacting with the discard
  // - up/down arrow passes
  // - left/right arrow cycles through claim options

  let cur_discard;
  let claim_button;

  const claimOrPass = evt => {
    let keyCode = evt.keyCode;

    if (keyCode === 38 || keyCode === 40) {
      evt.preventDefault();
      cur_discard.pass();
      disableClaimKeys();
    }

    if (keyCode === 37) {
      evt.preventDefault();
      if (!claim_button) {
        claim_button = document.querySelector(
          "#discard-buttons button:last-child"
        );
      } else {
        claim_button =
          claim_button.previousSibling ||
          document.querySelector("#discard-buttons button:last-child");
      }
      claim_button.focus();
    }

    if (keyCode === 39) {
      evt.preventDefault();
      if (!claim_button) {
        claim_button = document.querySelector("#discard-buttons button");
      } else {
        claim_button =
          claim_button.nextSibling ||
          document.querySelector("#discard-buttons button");
      }
      claim_button.focus();
    }
  };

  function enableClaimKeys(discard) {
    cur_discard = discard;
    claim_button = undefined;
    document.addEventListener("keydown", claimOrPass);
  }

  function disableClaimKeys() {
    cur_discard = false;
    document.removeEventListener("keydown", claimOrPass);
  }

  // General document-based keydown handler.
  function on(evtname, handler) {
    const fn = evt => {
      document.removeEventListener(evtname, fn);
      handler(evt);
    };
    document.addEventListener(evtname, fn);
    return () => document.removeEventListener(evtname, fn);
  }

  return {
    enableDiscardKeys,
    disableDiscardKeys,
    enableClaimKeys,
    disableClaimKeys,
    on
  };
})();

export default Interaction;
