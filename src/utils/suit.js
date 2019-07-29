function suit(t) {
  // exploit ((NaN === NaN) === false) for honours
  if (t >= 27) return NaN;
  return (t / 9) | 0;
}

module.exports = suit;
