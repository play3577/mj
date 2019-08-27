// Yep, we're adding this straight into the array prototype.
// It should have been there from day one, but isn't.

Array.prototype.roll = function roll(n) {
  return this.slice(n).concat(this.slice(0, n));
};

Array.prototype.count = function count(fn) {
  return this.reduce((tally, e) => (tally += fn(e) ? 1 : 0), 0);
};

Array.prototype.entails = function entails(arr) {
  arr = arr.slice();
  this.forEach(e => {
    let pos = arr.indexOf(e);
    if (pos > -1) arr.splice(pos, 1);
  });
  return arr.length === 0;
};

Array.prototype.equals = function equals(other) {
  const len = other.length;
  if (this.length !== len) return false;
  other = other.slice().sort();
  let a2 = this.slice().sort();
  for (let i = 0; i < len; i++) {
    if (other[i] !== a2[i]) return false;
  }
  return true;
};

Array.prototype.remove = function(elements) {
  let arr = this.slice();
  elements.forEach(e => {
    let pos = arr.indexOf(e);
    if (pos > -1) arr.splice(pos, 1);
  });
  return arr;
};

Array.prototype.awaitForEach = async function(fn) {
  return this.awaitMap(fn);
};

Array.prototype.awaitMap = async function(fn) {
  return Promise.all(
    this.map(
      e =>
        new Promise(async (resolve, _reject) => {
          const result = await fn(e);
          resolve(result);
        })
    )
  );
};
