import React, { useReducer, useMemo, useRef, useState, useEffect } from "react";
import Input from "@material-ui/core/Input";
import "./App.css";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import FavoriteIcon from "@material-ui/icons/Favorite";
import ArrowRightAltIcon from "@material-ui/icons/ArrowRightAlt";
import Grid from "@material-ui/core/Grid";
import { generateInitialNickname, cn, WSocketState, WSocket, useWSocket } from "./util";
import { Screen, ScreenContent, ScreenContentHeader } from "./Screen";
import { MIN_PLAYERS_FOR_GAME, WS_WORDS_API_URL } from "./constants";
import { t, tfmt } from "./ln";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import Immutable, { Map, List } from "immutable";

enum CWMSG {
  Joining = 0,
  UpdateInput = 1,
  SubmitGuess = 2,
}

enum SWMSG {
  InitGame = 0,
  UpdateGameState = 1,
  EndGame = 2,
  GameInProgress = 3,
  UserInput = 4,
  PlayerJoined = 5,
  RemovePlayer = 6,
  WrongGuess = 7,
}

type PlayerId = string;

enum GameStateDesc {
  WaitingForPlayers = 0,
  Playing = 1,
  Starting = 2,
}

interface ImmutableMap<T> extends Map<string, any> {
  get<K extends keyof T>(name: K): T[K];
}

type PlayerInfo = ImmutableMap<{
  nickname: string;
  lives_left: number;
  input: string;
  id: PlayerId;
  letters_left: number[];
}>;

type PlayerInfoById = Map<PlayerId, PlayerInfo>;

type GameState = ImmutableMap<{
  players: PlayerInfoById;
  whos_turn: PlayerId;
  start_timer: number;
  particle: string | null;
  desc: GameStateDesc;
  last_player_to_answer: PlayerId | null;
  all_letters: number[];
}>;

enum WordsGameStep {
  Initial = 0,
  Joining = 1,
  Playing = 2,
  Ended = 3,
  ErrorGameInProgress = 4,
}

interface ClientMessage extends Record<string, any> {
  type: CWMSG;
}

interface ServerMessage extends Record<string, any> {
  type: SWMSG;
}

const emptyGameState = (): GameState => {
  return Map({
    players: Map({}),
    whos_turn: -1,
    desc: GameStateDesc.WaitingForPlayers,
    particle: null,
    last_player_to_answer: null,
    start_timer: -1,
  });
};

const InitialScreen = (props: {
  nickname: string;
  onChange: (v: any) => void;
  join: () => void;
}) => {
  const { nickname, onChange, join } = props;
  const canJoin = nickname.length !== 0;
  return (
    <Screen title={t("ent-nick")}>
      <ScreenContent className="flex flex-c">
        <div>
          <Input
            onChange={onChange}
            value={nickname}
            placeholder="Nickname"
            className="mr-2"
            onKeyDown={(e) => {
              if (e.keyCode === 13 && canJoin) join();
            }}
          />
          <Button disabled={!canJoin} onClick={join} variant="contained" color="primary">
            {t("join")}
          </Button>
        </div>
      </ScreenContent>
    </Screen>
  );
};

const PlayerHearts = React.memo(({ n }: { n: number }) => {
  let hearts = [];
  for (let i = 0; i < n; ++i) {
    hearts.push(<FavoriteIcon key={i} />);
  }
  return <div className="player-hearts">{hearts}</div>;
});

interface OtherTablePlayerProps {
  player: PlayerInfo;
  playerTurn: boolean;
  C: ClientState;
}
const TablePlayer = (props: OtherTablePlayerProps) => {
  const { C, player, playerTurn } = props;
  const myId = C.get("myId");
  const dead = player.get("lives_left") === 0;
  return (
    <div
      className={cn({
        player: true,
        player_dead: dead,
        player_turn: playerTurn,
      })}
    >
      <div className="player-nickname">
        {player.get("nickname")}{" "}
        {player.get("id") === myId && <span className="ml-1">({t("you")})</span>}
      </div>
      <PlayerHearts n={player.get("lives_left")} />
      <div className="player-input">{player.get("input")}</div>
    </div>
  );
};

interface GameEndedScreenProps {
  join: () => void;
  C: ClientState;
}

const GameEndedScreen = ({ join, C }: GameEndedScreenProps) => {
  const winner = C.get("winner");
  const myId = C.get("myId");
  return (
    <Screen title="Game Ended">
      <ScreenContent className="flex flex-col game-ended-message flex flex-c">
        <div className="mb-4">
          <Typography component="h1" variant="h5">
            {winner
              ? winner.get("id") === myId
                ? t("game-ended-me")
                : tfmt("game-ended", winner.get("nickname"))
              : "N/A"}
          </Typography>
        </div>
        <Button onClick={join} color="primary" variant="contained" size="large" className="ph-16">
          <Typography component="p" variant="body1" className="fs-16">
            {t("join")}
          </Typography>
        </Button>
      </ScreenContent>
    </Screen>
  );
};

interface GameTableProps {
  C: ClientState;
  socket: WSocket<CWMSG>;
}

const GameTable = ({ C, socket }: GameTableProps) => {
  const gameState = C.get("gameState");
  const myId = C.get("myId");
  const angle = 360 / gameState.get("players").size;
  const circleSize = 300;
  const playersById = gameState.get("players");
  const players: List<PlayerInfo> = playersById ? List(playersById.values()) : List();
  const playerIdxById = players.reduce((acc: Record<PlayerId, number>, p, idx) => {
    acc[p.get("id")] = idx;
    return acc;
  }, {});
  const renderedPlayers = useMemo(() => {
    if (players.size === 0) return <div>No players joined yet</div>;
    if (players.size === 1) {
      const pid = players.get(0)!.get("id");
      return (
        <Paper elevation={1} key={pid} className="player-slot">
          <TablePlayer
            player={players.get(0)!}
            playerTurn={gameState.get("whos_turn") === pid}
            C={C}
          />
        </Paper>
      );
    }
    return players.map((player: PlayerInfo, idx) => {
      const pid = player.get("id");
      const p = {
        gameState,
        player,
        playerTurn: gameState.get("whos_turn") === pid,
      };
      // Calculate table position
      const rot = idx * angle;
      const style = {
        transform: `rotate(${rot}deg) translate(${circleSize / 2}px) rotate(${-rot}deg)`,
      };
      return (
        <Paper elevation={1} key={pid} className="player-slot" style={style}>
          <TablePlayer C={C} {...p} />
        </Paper>
      );
    });
  }, [gameState, myId]);

  const renderedArrow = useMemo(() => {
    const t = gameState.get("whos_turn");
    if (t === undefined || t === null || t === -1) {
      return null;
    }
    const rot = playerIdxById[gameState.get("whos_turn") as any] * angle;
    const style = {
      transform: `rotate(${rot}deg)`,
    };
    return (
      <div className="wg-turn-arrow" style={style}>
        <ArrowRightAltIcon
          style={{
            fontSize: 80,
          }}
        />
      </div>
    );
  }, [gameState.get("whos_turn")]);

  return (
    <div className="player-table">
      <div className="player-table-center">
        {gameState.get("particle") && (
          <div className="particle-to-guess">{gameState.get("particle")!.toUpperCase()}</div>
        )}
        {renderedArrow}
        {renderedPlayers}
      </div>
    </div>
  );
};

const StartingScreen = (props: GameTableProps) => {
  const gs = props.C.get("gameState");
  const ts = tfmt("starting", gs.get("start_timer"));
  return (
    <Screen title={ts}>
      <ScreenContent>
        <ScreenContentHeader title={ts} />
        <GameTable {...props} />
      </ScreenContent>
    </Screen>
  );
};

const WaitingForPlayersScreen = (props: GameTableProps) => {
  const gs = props.C.get("gameState");
  return (
    <Screen title={t("waiting-players")}>
      <ScreenContent>
        <ScreenContentHeader
          title={tfmt("waiting-players", gs.get("players").size, MIN_PLAYERS_FOR_GAME)}
        />
        <GameTable {...props} />
      </ScreenContent>
    </Screen>
  );
};

const JoiningScreen = () => {
  return (
    <Screen title={t("ent-nick")}>
      <ScreenContent className="flex flex-c">{t("joining")}</ScreenContent>
    </Screen>
  );
};

const ConnectingScreen = () => {
  return (
    <Screen title={t("ent-nick")}>
      <ScreenContent className="flex flex-c">{t("connecting")}</ScreenContent>
    </Screen>
  );
};

const PlayingScreen = (props: GameTableProps & { socket: WSocket<CWMSG> }) => {
  const { C, socket } = props;
  const gameState = C.get("gameState");
  const myId = C.get("myId");
  // Input
  const myTurn = gameState.get("whos_turn") === myId;
  const [userInput, setUserInput] = useState<string>("");
  const updateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };
  const submitGuess = () => {
    if (userInput.trim().length <= 0) return;
    socket.send(CWMSG.SubmitGuess, { guess: userInput });
    setUserInput("");
  };
  useEffect(() => {
    if (myTurn) {
      socket.send(CWMSG.UpdateInput, { input: userInput });
    }
  }, [userInput]);

  // Auto-focus on current player's turn
  const myInputRef = useRef<any>(null);
  useEffect(() => {
    if (!myTurn) return;
    // Reset user input before each turn, then focus on it
    setUserInput("");
    if (myInputRef.current === null) {
      console.warn("Input reference is null, can't focus");
      return;
    }
    myInputRef.current.focus();
  }, [myTurn]);

  const playersById = gameState.get("players");
  const myPlayer = playersById.get(myId);
  const lettersLeftList = myPlayer.get("letters_left");
  const usedLettersTable = useMemo(() => {
    let allLetters = gameState.get("all_letters");
    const lettersLeft = new Set(lettersLeftList);
    return (
      <div className="wletter-table">
        {allLetters.map((letter: number) => {
          const ch = String.fromCharCode(letter);
          return (
            <Paper
              elevation={1}
              className={cn({ wletter: true, wletter_used: !lettersLeft.has(letter) })}
            >
              {ch}
            </Paper>
          );
        })}
      </div>
    );
  }, [lettersLeftList]);

  return (
    <Screen title="Playing">
      <ScreenContent>
        <ScreenContentHeader title={t("in-game")} />
        <GameTable {...props} C={C} />
        {myTurn && (
          <Input
            className={cn({
              "user-input": true,
              "user-input_wrong": myTurn && C.get("wrongGuess"),
            })}
            value={userInput}
            placeholder={t("user-input-answer")}
            inputRef={myInputRef}
            onChange={updateInput}
            onKeyDown={(e) => {
              if (e.keyCode === 13) {
                submitGuess();
              }
            }}
          />
        )}
      </ScreenContent>
      {usedLettersTable}
    </Screen>
  );
};

const ErrorGameInProgressScreen = (props: { tryAgain: () => void }) => {
  const { tryAgain } = props;
  return (
    <Screen title={t("in-game")}>
      <Paper elevation={1} className="screen-msg">
        <div className="mb-4">{t("in-game")}</div>
        <Button onClick={tryAgain} variant="contained" color="primary">
          {t("try-again")}
        </Button>
      </Paper>
    </Screen>
  );
};

const FailedToConnectScreen = (props: { retry: () => void }) => {
  const { retry } = props;
  const title = t("failed-to-connect");
  return (
    <Screen title={title}>
      <Paper elevation={1} className="screen-msg">
        <div className="screen-msg-title">
          <ErrorOutlineIcon style={{ fontSize: 30, color: "grey" }} className="mr-2" />
          <div>Something went wrong</div>
        </div>
        <div className="fcg fs-18">{t("failed-to-connect")}</div>
        <Button
          onClick={retry}
          variant="contained"
          color="primary"
          size="large"
          className="w-100 mt-4"
        >
          {t("try-again")}
        </Button>
      </Paper>
    </Screen>
  );
};

const GameScreen = (props: { socket: WSocket<CWMSG>; join: () => void; C: ClientState }) => {
  const { C, join, socket } = props;
  const myId = C.get("myId");
  const gameState = C.get("gameState");
  if (gameState === null) return <div>Loading...</div>;
  return (
    <>
      {gameState.get("desc") === GameStateDesc.WaitingForPlayers && (
        <WaitingForPlayersScreen {...props} C={C} />
      )}
      {gameState.get("desc") === GameStateDesc.Starting && <StartingScreen {...props} C={C} />}
      {gameState.get("desc") === GameStateDesc.Playing && <PlayingScreen {...props} C={C} />}
    </>
  );
};

enum ActionType {
  ServerMessage = 0,
  ResetState = 1,
  SetStep = 2,
}

interface ClientAction {
  type: ActionType;
  payload?: any;
}

type ClientState = ImmutableMap<{
  step: WordsGameStep;
  gameState: GameState;
  myId: PlayerId | null;
  winner: PlayerInfo | null;
  wrongGuess: boolean;
}>;

const initialClientState: ClientState = Map({
  step: WordsGameStep.Initial,
  gameState: emptyGameState(),
  myId: null,
  winner: null,
  wrongGuess: false,
});

const serverMessageReducer = (state: ClientState, msg: ServerMessage): ClientState => {
  const parsed = msg;
  console.log(parsed);
  switch (parsed.type) {
    // We get this after joining with a nickname
    case SWMSG.InitGame:
      {
        console.log("asdfasdfasdf");
        state = state.set("step", WordsGameStep.Playing);
        state = state.set("gameState", Map(Immutable.fromJS(parsed.state) as any));
        state = state.set("myId", String(parsed.player.id));
        return state;
      }
      break;
    case SWMSG.UpdateGameState:
      {
        // Generic game state update
        return state.updateIn(["gameState"], (gs: GameState) =>
          gs.merge(Map(Immutable.fromJS(parsed.state) as any) as any),
        );
      }
      break;
    case SWMSG.PlayerJoined:
      {
        const nextState = state.updateIn(["gameState", "players"], (players: PlayerInfoById) =>
          players.set(parsed.player.id, Map(parsed.player)),
        );
        return nextState;
      }
      break;
    case SWMSG.RemovePlayer:
      {
        const nextState = state.updateIn(["gameState", "players"], (players: PlayerInfoById) =>
          players.remove(parsed.id),
        );
        return nextState;
      }
      break;
    case SWMSG.UserInput:
      {
        return state!.setIn(["gameState", "players", parsed.id.toString(), "input"], parsed.input);
      }
      break;
    case SWMSG.WrongGuess:
      {
        return state.set("wrongGuess", true);
      }
      break;
    case SWMSG.EndGame:
      {
        state = state.set("step", WordsGameStep.Ended);
        state = state.set("winner", Map(parsed.winner));
        return state;
      }
      break;
    case SWMSG.GameInProgress:
      {
        return state.set("step", WordsGameStep.ErrorGameInProgress);
      }
      break;
    default:
      {
        console.warn("Unhandled message");
        console.warn(parsed);
        return state;
      }
      break;
  }
};

const gameStateReducer = (state: ClientState, action: ClientAction): ClientState => {
  console.group("reducer dispatch");
  console.log(action);
  console.log(state);
  console.groupEnd();
  const parsed = action;
  switch (action.type) {
    case ActionType.ServerMessage:
      {
        return serverMessageReducer(state, action.payload);
      }
      break;
    case ActionType.ResetState:
      {
        return initialClientState;
      }
      break;
    case ActionType.SetStep:
      {
        return state.set("step", action.payload);
      }
      break;
    default:
      {
        console.warn("Unknown action");
        return state;
      }
      break;
  }
};

const WordsGame = () => {
  const [nickname, setNickname] = useState<string>(generateInitialNickname());
  const [C, dispatch] = useReducer<typeof gameStateReducer>(gameStateReducer, initialClientState);
  const [userGuess, setState] = useState<string>("");
  const resetState = () => dispatch({ type: ActionType.ResetState });
  const socket = useWSocket<CWMSG, ClientMessage, ServerMessage>(
    WS_WORDS_API_URL,
    (messageHistory: ServerMessage[]) => {
      for (let i = 0; i < messageHistory.length; ++i) {
        const parsed = messageHistory[i];
        dispatch({ type: ActionType.ServerMessage, payload: parsed });
      }
    },
  );

  useEffect(() => {
    switch (socket.state) {
      case WSocketState.Closed:
        {
          resetState();
        }
        break;
    }
  }, [socket.state]);

  const join = () => {
    dispatch({ type: ActionType.SetStep, payload: WordsGameStep.Joining });
    socket.send(CWMSG.Joining, { nickname });
  };

  // Render
  const game = useMemo(() => {
    console.log("C updated, re-rendering the game");
    console.log(C.toJS());
    const retry = () => {
      socket.reset();
      resetState();
    };
    switch (socket.state) {
      case WSocketState.Connecting:
        {
          return <ConnectingScreen />;
        }
        break;
      case WSocketState.Closed:
        {
          return <FailedToConnectScreen retry={retry} />;
        }
        break;
    }
    const step = C.get("step");
    switch (step) {
      case WordsGameStep.Initial:
        {
          return (
            <InitialScreen
              nickname={nickname}
              onChange={(e) => setNickname(e.target.value)}
              join={join}
            />
          );
        }
        break;
      case WordsGameStep.ErrorGameInProgress:
        {
          return <ErrorGameInProgressScreen tryAgain={retry} />;
        }
        break;
      case WordsGameStep.Joining:
        {
          return <JoiningScreen />;
        }
        break;
      case WordsGameStep.Playing:
        {
          return <GameScreen socket={socket} C={C} join={join} />;
        }
        break;
      case WordsGameStep.Ended:
        {
          return <GameEndedScreen join={join} C={C} />;
        }
        break;
      default: {
        return <div>Invalid state: {step === undefined ? "empty" : step}</div>;
      }
    }
  }, [C, nickname, socket.state]);

  return game;
};

export default WordsGame;
