const LOG_LEVELS = {
    LOG: 0,
    WARN: 1,
    ERROR: 2,
    DEBUG: 3
}

//const LOG_LEVEL = LOG_LEVELS.DEBUG;
const LOG_LEVEL = LOG_LEVELS.LOG;

const Logger = {
  log:   (...args) => { if(LOG_LEVEL >= LOG_LEVELS.LOG) console.log.apply(console, args); },
  warn:  (...args) => { if(LOG_LEVEL >= LOG_LEVELS.WARN) console.warn.apply(console, args); },
  error: (...args) => { if(LOG_LEVEL >= LOG_LEVELS.ERROR) console.error.apply(console, args); },
  debug: (...args) => { if(LOG_LEVEL >= LOG_LEVELS.DEBUG) console.debug.apply(console, args); },
  trace: (...args) => { if(LOG_LEVEL >= LOG_LEVELS.DEBUG) console.trace.apply(console, args); }
}
