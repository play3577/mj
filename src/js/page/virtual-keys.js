// keyhandling maps
const VK_LEFT = {
  "37": true, // left cursor
  "65": true  // 'a' key
};

const VK_RIGHT = {
  "39": true, // right cursor
  "68": true  // 'd' key
};

const VK_UP = {
  "38": true, // up cursor
  "87": true  // 'w' key
};

const VK_DOWN = {
  "40": true, // down cursor
  "83": true  // 's' key
};

const VK_START = {
  "36": true // home
};

const VK_END = {
  "35": true // end
};

const VK_SIGNAL = {
  "13": true, // enter
  "32": true  // space
};

// Make sure we put in the signal lock to prevent
// OS/application-level keyrepeat from incorrectly
// triggering click events:

let vk_signal_lock = false;

function lock_vk_signal() {
  vk_signal_lock = true;
  document.addEventListener('keyup', unlock_vk_signal);
};

function unlock_vk_signal(evt) {
  let code = evt.keyCode;
  if (VK_UP[code] || VK_SIGNAL[code]) {
    vk_signal_lock = false;
    document.removeEventListener('keyup', unlock_vk_signal);
  }
};
