import { action, autorun, runInAction, makeAutoObservable } from "mobx";
import {
  CWMSG,
  SWMSG,
  PlayerId,
  GameStateDesc,
  PlayerInfo,
  ClientState,
  GameState,
  WordsGameStep,
  ActionType,
  ClientMessage,
  ServerMessage,
} from "~/wordsGameTypes";
import { WS_WORDS_API_URL } from "~/constants";
import { Milliseconds } from "~/util";

const emptyGameState = (): GameState => {
  return {
    players: new Map(),
    whos_turn: null,
    desc: GameStateDesc.WaitingForPlayers,
    particle: null,
    last_player_to_answer: null,
    start_timer: -1,
    all_letters: [],
  };
};

interface WSOptions {
  retryOnFail: boolean;
  maxRetryAttempts: number;
  retryTimeout: Milliseconds;
}

export enum WSocketState {
  Connecting = 0,
  Closed = 1,
  Opened = 2,
}

class WSocket<C, S> {
  socket: WebSocket;
  retryAttemptsLeft: number;
  maxRetryAttempts: number;
  onMessage: (msg: S) => void;
  state: WSocketState = WSocketState.Connecting;

  constructor(url: string, onMessage: (msg: S) => void, options?: WSOptions) {
    makeAutoObservable(this);
    this.maxRetryAttempts = options?.maxRetryAttempts ?? 3;
    this.onMessage = onMessage;
    this.reset();
  }

  initSocket = () => {
    this.socket = new WebSocket(WS_WORDS_API_URL);
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
      runInAction(() => {
        this.state = WSocketState.Closed;
      });
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

export class WordsGameStore {
  socket: WSocket<ClientMessage, ServerMessage>;
  step: WordsGameStep;
  // WS synced game state
  gameState: GameState;
  // the id of the current user given by the server at the start of the session
  myId?: PlayerId;
  // whether the last guess the user has made was wrong
  wrongGuess = false;
  // full winner info
  winner?: PlayerInfo;
  // the nickname user selected for himself this session
  nickname?: string;

  get myTurn() {
    return this.gameState.whos_turn === this.myId;
  }

  get myPlayer() {
    if (!this.myId) return null;
    return this.gameState.players.get(this.myId) ?? null;
  }

  constructor() {
    makeAutoObservable(this);
    this.socket = new WSocket(WS_WORDS_API_URL, (a: any) => {
      console.log(this);
      this.step = WordsGameStep.Playing;
    });
    this.step = WordsGameStep.Initial;
    this.gameState = emptyGameState();
    autorun(() => {
      console.log("socket state switched", this.socket.state);
      switch (this.socket.state) {
        case WSocketState.Closed:
          {
            this.resetState();
          }
          break;
      }
      console.log("curr step", this.step);
    });
  }

  resetWrongGuess() {
    runInAction(() => {
      this.wrongGuess = false;
    });
  }

  @action
  initGame = (parsed: ServerMessage) => {
    this.step = WordsGameStep.Playing;
    this.gameState = parsed.state;
    this.myId = parsed.player.id;
    console.log("changed", this.gameState, this.step);
  };

  onServerMessage = (msg: ServerMessage) => {
    const parsed = msg;
    console.log("server message", msg);
    runInAction(() => {
      switch (parsed.type) {
        // We get this after joining with a nickname
        case SWMSG.InitGame:
          {
            this.initGame(parsed);
          }
          break;
        case SWMSG.UpdateGameState:
          {
            // Generic game state update
            this.gameState = { ...this.gameState, ...parsed.state };
          }
          break;
        case SWMSG.PlayerJoined:
          {
            this.gameState.players.set(parsed.player.id, parsed.player);
          }
          break;
        case SWMSG.RemovePlayer:
          {
            this.gameState.players.delete(parsed.id);
          }
          break;
        case SWMSG.UserInput:
          {
            const player = this.gameState.players.get(parsed.id.toString());
            if (player) {
              player["input"] = parsed.input;
            }
          }
          break;
        case SWMSG.WrongGuess:
          {
            this.wrongGuess = true;
          }
          break;
        case SWMSG.EndGame:
          {
            this.step = WordsGameStep.Ended;
            this.winner = parsed.winner;
          }
          break;
        case SWMSG.GameInProgress:
          {
            this.step = WordsGameStep.ErrorGameInProgress;
          }
          break;
        default:
          {
            console.warn("Unhandled server message");
            console.warn(parsed);
          }
          break;
      }
    });
  };

  resetState = () => {
    this.gameState = emptyGameState();
  };

  retryConnect = () => {
    this.socket.reset();
    this.resetState();
  };

  join = (nickname: string) => {
    this.nickname = nickname;
    this.rejoin();
  };

  rejoin = () => {
    this.step = WordsGameStep.Joining;
    this.socket.send({ type: CWMSG.Joining, nickname: this.nickname });
  };

  submitGuess = (userInput: string) => {
    if (userInput.trim().length <= 0) return;
    this.socket.send({ type: CWMSG.SubmitGuess, guess: userInput });
  };

  updateUserInput = (userInput: string) => {
    this.socket.send({ type: CWMSG.UpdateInput, input: userInput });
  };
}

const wordsGameStore = new WordsGameStore();

export default wordsGameStore;
