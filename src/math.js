// This "you need the Math namespace!" nonsense
// always drives me nuts. We're aliassing these.
const max = Math.max;
const min = Math.min;
const random = v => v ? (Math.random() * v)|0 : Math.random();
