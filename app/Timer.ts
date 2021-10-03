import { runInAction, makeAutoObservable } from "mobx";

class Timer {
  current = 0;
  tickDuration = 0;
  handle: any = null;
  tickDown = true;
  initialValue = 0;
  duration = 0;

  constructor(tickDuration: number, duration: number, tickDown = true) {
    makeAutoObservable(this);
    this.tickDuration = tickDuration;
    this.duration = duration;
    this.initialValue = tickDown ? duration : 0;
    this.current = this.initialValue;
    this.tickDown = tickDown;
  }

  get finished(): boolean {
    return this.tickDown ? this.current <= 0 : this.current >= this.duration;
  }

  get currentSeconds(): number {
    return this.current / 1000;
  }

  reset() {
    runInAction(() => {
      this.current = this.initialValue;
      clearInterval(this.handle);
    });
  }

  start() {
    this.handle = setInterval(() => {
      runInAction(() => {
        if (this.finished) {
          this.reset();
        } else {
          const k = this.tickDown ? -1 : 1;
          this.current += k * this.tickDuration;
        }
      });
    }, this.tickDuration);
  }

  pause() {
    clearInterval(this.handle);
  }
}

export default Timer;
