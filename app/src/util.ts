import { useRef, useEffect, useState, useCallback } from "react";

type CNArg = (string | undefined | null)[] | Record<string, boolean>;
export const cn = (...cns: CNArg[]): string => {
  let res = "";
  for (let i = 0; i < cns.length; ++i) {
    const cn = cns[i];
    if (cn instanceof Array) {
      if (i !== 0) res += " ";
      res += cn.join(" ");
    } else if (cn instanceof Object) {
      let currIdx = i;
      for (const key in cn) {
        if (cn[key]) {
          if (currIdx !== 0) res += " ";
          res += key;
          ++currIdx;
        }
      }
    }
  }
  return res;
};

export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  sTransformer: (v: T) => any,
  dTransformer: (v: any) => T
): [T, (v: T) => void] {
  const localStorageItem = localStorage.getItem(key);
  const [data, setData] = useState<T>(
    localStorageItem ? dTransformer(JSON.parse(localStorageItem)) : initialValue
  );
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(sTransformer(data)));
  }, [data]);
  return [data, setData];
}

export const range = (start: number, stop: number, step: number) =>
  Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);

export function shuffleArray<T>(arr: T[]): T[] {
  let indices = range(0, arr.length - 1, 1);
  let result = [];
  while (indices.length !== 0) {
    let idx = Math.floor(Math.random() * indices.length);
    const elem = arr[idx];
    result.push(elem);
    indices.splice(idx, 1);
  }
  return result;
}

export function randomChoice<T>(arr: T[]): T {
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}

export const capitalize = (s: string): string =>
  s[0].toUpperCase() + s.substring(1);

export type Milliseconds = number;
export type Seconds = number;

export interface Timer {
  reset: () => void;
  stop: () => void;
  start: () => void;
  current: Milliseconds;
  finished: boolean;
}
export const timerSeconds = (t: Timer) => Math.round(t.current / 1000);
export const useMSTimer = (
  tickDuration: Milliseconds,
  countTo: Milliseconds,
  countDown = true
): Timer => {
  const initialTime = countDown ? countTo : 0;
  const [current, setCurrent] = useState<Milliseconds>(initialTime);
  const [stopped, setStopped] = useState<boolean>(false);
  const finished =
    (countDown && current <= 0) || (!countDown && current >= countTo);
  useEffect(() => {
    setTimeout(() => {
      if (stopped) return;
      if (finished) {
        setStopped(true);
        return;
      }
      if (countDown) {
        setCurrent(current - tickDuration);
      } else {
        setCurrent(current + tickDuration);
      }
    }, tickDuration);
  }, [tickDuration, stopped, current]);
  const reset = () => {
    setCurrent(initialTime);
    setStopped(false);
  };
  const start = () => {
    setStopped(false);
  };
  const stop = () => {
    setStopped(true);
  };
  return {
    reset,
    start,
    stop,
    current,
    finished,
  };
};

export enum WSocketState {
  Connecting = 0,
  Closed = 1,
  Opened = 2,
}

export interface WSocket<CT> {
  send: (type: CT, msgPayload: any) => void;
  state: WSocketState;
  reset: () => void;
}

interface WSOptions {
  retryOnFail: boolean;
  maxRetryAttempts: number;
  retryTimeout: Milliseconds;
}
export function useWSocket<CT, C, S>(
  wsAPIURL: string,
  msgHistoryListener: (msgHistory: S[]) => void,
  options?: WSOptions
): WSocket<CT> {
  const {
    retryOnFail = true,
    maxRetryAttempts = 3,
    retryTimeout = 500,
  } = options || {};
  const socket = useRef<WebSocket | null>(null);
  const [state, setState] = useState<WSocketState>(WSocketState.Connecting);

  // Initialize socket
  const onOpen = (event: any) => {
    console.info(`Connected to ${wsAPIURL}`);
    setState(WSocketState.Opened);
  };
  const retryAttemptsLeft = useRef<number>(maxRetryAttempts);
  const onClose = (event: any) => {
    if (retryOnFail && retryAttemptsLeft.current > 0) {
      setState(WSocketState.Connecting);
      console.info(
        `Failed to connect. Retrying... Attempts left: ${retryAttemptsLeft.current!}`
      );
      retryAttemptsLeft.current = retryAttemptsLeft.current - 1;
      setTimeout(() => {
        initSocket();
      }, retryTimeout);
    } else {
      setState(WSocketState.Closed);
    }
  };
  const initSocket = () => {
    try {
      let sock = new WebSocket(wsAPIURL);
      sock.addEventListener("open", onOpen);
      sock.addEventListener("close", onClose);
      socket.current = sock;
    } catch (err) {}
  };
  useEffect(() => {
    initSocket();
  }, []);
  const reset = () => {
    retryAttemptsLeft.current = maxRetryAttempts;
    setState(WSocketState.Connecting);
    initSocket();
  };

  // Send message
  const send = (type: CT, m: any) => {
    if (state !== WSocketState.Opened) {
      console.warn("Trying to send messages on a closed socket");
      return false;
    }
    socket.current!.send(JSON.stringify({ type, ...m }));
    return true;
  };

  // Handle messages
  const [messageHistory, setMessageHistory] = useState<S[]>([]);
  useEffect(() => {
    const onMessage = (event: any) => {
      const parsed = JSON.parse(event.data);
      setMessageHistory([...messageHistory, parsed]);
    };
    socket.current!.addEventListener("message", onMessage);
    return () => {
      socket.current!.removeEventListener("message", onMessage);
    };
  }, [messageHistory]);
  useEffect(() => {
    if (messageHistory.length === 0) return;
    msgHistoryListener(messageHistory);
    setMessageHistory([]);
  }, [messageHistory]);

  // Interface
  return {
    send,
    state,
    reset,
  };
}

const NICKNAME_PARTICLES_FIRST = [
  "red",
  "green",
  "yellow",
  "fancy",
  "curious",
  "surprised",
  "black",
  "big",
  "different",
  "free",
  "important",
  "large",
  "little",
  "local",
  "major",
  "old",
  "social",
  "strong",
  "white",
];
const NICKNAME_PARTICLES_SECOND = [
  "squirrel",
  "cat",
  "elephant",
  "rhino",
  "monkey",
  "dog",
  "turtle",
  "rabbit",
  "parrot",
  "kitten",
  "hamster",
  "mouse",
  "snake",
  "sheep",
  "deer",
  "horse",
  "chicken",
  "bee",
  "turkey",
  "cow",
  "duck",
];
export const generateInitialNickname = () => {
  const first = capitalize(randomChoice(NICKNAME_PARTICLES_FIRST));
  const second = capitalize(randomChoice(NICKNAME_PARTICLES_SECOND));
  const num = Math.round(Math.random() * 1000);
  return `${first} ${second} #${num}`;
};
