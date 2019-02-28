/**
 * A resolver class that will run the function
 * passed as `startWaiting`, with a concurrent
 * timeout running that will trigger the
 * `timeoutFunction` function after a specific
 * number of milliseconds.
 *
 * This timeout can be paused using `.pause()`,
 * which will return a promise that can be
 * `await`ed to effect a non-blocking "pause".
 */
class TaskTimer {

  /**
   * @param {function} startWaiting
   * @param {function} timeoutFunction
   * @param {milliseconds} timeoutInterval
   */
  constructor(startWaiting, timeoutFunction, timeoutInterval) {
    this.id = TaskTimer.id++;
    this.created = Date.now();
    this.overrideKickedIn = false;
    this.timeoutInterval = timeoutInterval;
    this.timeoutFunction = timeoutFunction;

    this.startTimeout();
    setTimeout(() => startWaiting(this), 0);
    console.debug(`resolve-or-timeout ${this.id} started`);
  }

  startTimeout() {
    this.overrideTrigger = setTimeout(() => {
      this.overrideKickedIn = true;
      this.timeoutFunction();
    }, this.timeoutInterval);
  }

  hasTimedOut() {
    return this.overrideKickedIn;
  }

  interrupt() {
    if (!this.overrideKickedIn) {
      clearTimeout(this.overrideTrigger);
    }
  }

  isPaused() {
    return this.paused;
  }

  pause() {
    this.interrupt();
    let elapsed = Date.now() - this.created;
    this.timeoutInterval =  this.timeoutInterval - elapsed;

    let resolver = resolve => (this._resolve_pause_lock = resolve);
    this.paused = new Promise(resolver);

    return this.paused;
  }

  resume() {
    this._resolve_pause_lock();
    this.paused = false;
    this.created = Date.now();
    this.startTimeout();
  }
}

TaskTimer.id = 0;

// ============
// TESTING CODE
// ============

if (typeof process !== "undefined") {
  let start = Date.now();
  console.log(Date.now(), 'started run');

  new TaskTimer(
    (timer) => {
      // do nothing, so this will get cancelled.
    },
    () => {
      console.log(Date.now(), 'cancelled 1 after 1000ms');
    },
    1000
  );

  new TaskTimer(
    (timer) => {
      setTimeout(() =>{
        timer.interrupt();
        console.log(Date.now(), 'ran 2 for 500ms');
      }, 500);
    },
    () => {
      console.log(Date.now(), 'cancelled');
    },
    1000
  );

  let runtime;
  new TaskTimer(
    (timer) => {
      setTimeout(async() => {
        console.log(Date.now(), 'pausing 3');
        let p = timer.pause();

        setTimeout(() =>{
          timer.resume();
          runtime = Date.now() - 250;
        }, 2000);

        console.log(Date.now(), 'awaiting 3 to resume (after 2000ms)');
        await p;
        console.log(Date.now(), 'await for 3 resolved');
      }, 250)
    },
    () => {
      console.log(Date.now(), `cancelled 3 after ${Date.now() - runtime}ms of active runtime`);
    },
    1000
  );
}
