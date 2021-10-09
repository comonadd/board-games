import {
  makeObservable,
  observable,
  observe,
  action,
  autorun,
  runInAction,
  makeAutoObservable,
} from "mobx";
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
import { WSocket, WSocketState } from "~/WSocket";

const emptyGameState = (): GameState => {
  return {
    players: {},
    whos_turn: null,
    desc: GameStateDesc.WaitingForPlayers,
    particle: null,
    last_player_to_answer: null,
    start_timer: -1,
    all_letters: [],
  };
};

export class WordsGameStore {
  socket: WSocket<ClientMessage, ServerMessage> | null = null;
  step: WordsGameStep = WordsGameStep.Initial;
  // WS synced game state
  gameState: GameState = emptyGameState();
  // the id of the current user given by the server at the start of the session
  myId: PlayerId | null = null;
  // whether the last guess the user has made was wrong
  wrongGuess = false;
  // full winner info
  winner: PlayerInfo | null = null;
  // the nickname user selected for himself this session
  nickname = "";

  get myTurn() {
    return this.gameState.whos_turn === this.myId;
  }

  get myPlayer() {
    if (!this.myId) return null;
    return this.gameState.players[this.myId] ?? null;
  }

  get playersInLobby() {
    return Object.keys(this.gameState.players).length;
  }

  constructor() {
    makeAutoObservable(this);
    autorun(() => {
      if (this.socket === null) return;
      console.log("socket state switched", this.socket.state);
      console.log("curr step", this.step);
      if (this.step === WordsGameStep.Playing) {
        console.log("now playing");
      }
    });
  }

  resetWrongGuess() {
    runInAction(() => {
      this.wrongGuess = false;
    });
  }

  @action
  initGame = (parsed: ServerMessage) => {
    runInAction(() => {
      this.step = WordsGameStep.Playing;
      this.gameState = parsed.state;
      this.myId = parsed.player.id;
      console.log(this);
      console.log("changed", this.gameState, this.step);
    });
  };

  @action
  onServerMessage = (msg: ServerMessage) => {
    const parsed = msg;
    console.log("server message", msg);
    switch (parsed.type) {
      // We get this after joining with a nickname
      case SWMSG.InitGame:
        {
          runInAction(() => {
            this.initGame(parsed);
          });
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
          this.gameState.players[parsed.player.id] = parsed.player;
        }
        break;
      case SWMSG.RemovePlayer:
        {
          delete this.gameState.players[parsed.id];
        }
        break;
      case SWMSG.UserInput:
        {
          const player = this.gameState.players[parsed.id.toString()];
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
  };

  resetState = () => {
    console.log("resetting state");
    this.step = WordsGameStep.Initial;
    this.gameState = emptyGameState();
    this.socket = new WSocket(
      WS_WORDS_API_URL,
      (a: any) => {
        this.onServerMessage(a);
      },
      { retryOnFail: true }
    );
  };

  retryConnect = () => {
    this.resetState();
  };

  join = (nickname: string) => {
    this.nickname = nickname;
    this.rejoin();
  };

  rejoin = () => {
    this.step = WordsGameStep.Joining;
    this.socket!.send({ type: CWMSG.Joining, nickname: this.nickname });
  };

  submitGuess = (userInput: string) => {
    if (userInput.trim().length <= 0) return;
    this.socket!.send({ type: CWMSG.SubmitGuess, guess: userInput });
  };

  updateUserInput = (userInput: string) => {
    this.socket!.send({ type: CWMSG.UpdateInput, input: userInput });
  };
}

const wordsGameStore = new WordsGameStore();

export default wordsGameStore;
