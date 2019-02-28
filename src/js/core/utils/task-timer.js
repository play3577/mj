/**
 * A resolver class that will run the function
 * passed as `startWaiting`, with a concurrent
 * timeout running that will trigger the
 * `timeoutFunction` function after a specific
 * number of milliseconds.
 *
 * This timeout can be paused using `.pause()`,
 * with the pause lock being resumable through
 * `.resume()`, as well as `.pause().resume()`.
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
    clearTimeout(this.overrideTrigger);
    let elapsed = Date.now() - this.created;
    this.timeoutInterval =  this.timeoutInterval - elapsed;
    this.paused = true;
    return () => this.resume();
  }

  resume() {
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
      setTimeout(() =>{
        timer.pause();
        console.log(Date.now(), 'paused 3 after 250ms');

        setTimeout(() =>{
          timer.resume();
          runtime = Date.now() - 250;
          console.log(Date.now(), 'resumed 3 after 2000ms of pause');
        }, 2000);
      }, 250)
    },
    () => {
      console.log(Date.now(), `cancelled 3 after ${Date.now() - runtime}ms of active runtime`);
    },
    1000
  );
}
