import { action, autorun, runInAction, makeAutoObservable } from "mobx";
import { Milliseconds } from "~/util";

export interface WSOptions {
  retryOnFail: boolean;
  maxRetryAttempts: number;
  retryTimeout: Milliseconds;
}

export enum WSocketState {
  Connecting = 0,
  Closed = 1,
  Opened = 2,
}

export class WSocket<C, S> {
  socket: WebSocket;
  retryAttemptsLeft: number;
  maxRetryAttempts: number;
  onMessage: (msg: S) => void;
  state: WSocketState = WSocketState.Connecting;
  url: string;
  retryOnTimeout = false;
  retryTimeout = 3;

  constructor(
    url: string,
    onMessage: (msg: S) => void,
    options?: Partial<WSOptions>
  ) {
    makeAutoObservable(this);
    this.maxRetryAttempts = options?.maxRetryAttempts ?? 3;
    this.onMessage = onMessage;
    this.url = url;
    this.reset();
    this.retryOnTimeout = options?.retryOnFail ?? false;
    this.retryTimeout = options?.retryTimeout ?? 3;
  }

  initSocket = () => {
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener("message", (event: any) => {
      const parsed: S = JSON.parse(event.data);
      this.onMessage(parsed);
    });
    this.socket.addEventListener("open", (event: any) => {
      runInAction(() => {
        this.state = WSocketState.Opened;
      });
    });
    this.socket.addEventListener("close", (event: any) => {
      if (this.retryOnTimeout && this.retryAttemptsLeft > 0) {
        setTimeout(() => {
          --this.retryAttemptsLeft;
          this.initSocket();
        }, this.retryTimeout * 1000);
      } else {
        this.state = WSocketState.Closed;
      }
    });
  };

  reset = () => {
    runInAction(() => {
      this.retryAttemptsLeft = this.maxRetryAttempts;
      this.state = WSocketState.Connecting;
      this.initSocket();
    });
  };

  send(msg: C) {
    const json = JSON.stringify(msg);
    this.socket.send(json);
  }
}

export default WSocket;
