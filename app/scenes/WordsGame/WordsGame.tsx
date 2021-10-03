import React, { useReducer, useMemo, useRef, useState, useEffect } from "react";
import Input from "@material-ui/core/Input";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import ArrowRightAltIcon from "@material-ui/icons/ArrowRightAlt";
import Grid from "@material-ui/core/Grid";
import {
  generateInitialNickname,
  cn,
  WSocketState,
  WSocket,
  useWSocket,
} from "~/util";
import {
  Screen,
  ScreenContent,
  ScreenContentHeader,
} from "~/components/Screen";
import { MIN_PLAYERS_FOR_GAME, WS_WORDS_API_URL } from "~/constants";
import { t, tfmt } from "~/ln";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import Immutable, { Map, List } from "immutable";
import {
  CWMSG,
  SWMSG,
  PlayerId,
  GameStateDesc,
  ImmutableMap,
  PlayerInfo,
  ClientState,
  GameState,
  WordsGameStep,
  ActionType,
  ClientMessage,
} from "./types";
import GameEndedScreen from "./GameEndedScreen";
import TablePlayer from "./TablePlayer";
import InitialScreen from "./InitialScreen";
import GameTable from "./GameTable";

const displayActionLog = false;

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
          title={tfmt(
            "waiting-players",
            gs.get("players").size,
            MIN_PLAYERS_FOR_GAME
          )}
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

type Dispatch = (a: ClientAction) => void;

const PlayingScreen = (
  props: GameTableProps & { dispatch: Dispatch; socket: WSocket<CWMSG> }
) => {
  const { dispatch, C, socket } = props;
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
    if (!myTurn) {
      dispatch({ type: ActionType.ResetWrongGuess });
      return;
    }
    // Reset user input before each turn, then focus on it
    setUserInput("");
    if (myInputRef.current === null) {
      console.warn("Input reference is null, can't focus");
      return;
    }
    myInputRef.current.focus();
  }, [myTurn]);

  const playersById = gameState.get("players")!;
  const myPlayer = myId ? playersById.get(myId)! : null;
  const lettersLeftList = myPlayer !== null ? myPlayer.get("letters_left") : [];
  const usedLettersTable = useMemo(() => {
    let allLetters = gameState.get("all_letters");
    const lettersLeft = new Set(lettersLeftList);
    return (
      <div className="wletter-table">
        {allLetters.map((letter: number) => {
          const ch = String.fromCharCode(letter);
          return (
            <Paper
              key={letter}
              elevation={1}
              className={cn({
                wletter: true,
                wletter_used: !lettersLeft.has(letter),
              })}
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
        <Input
          disabled={!myTurn}
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
          <ErrorOutlineIcon
            style={{ fontSize: 30, color: "grey" }}
            className="mr-2"
          />
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

const GameScreen = (props: {
  dispatch: Dispatch;
  socket: WSocket<CWMSG>;
  join: () => void;
  C: ClientState;
}) => {
  const { C, join, socket } = props;
  const myId = C.get("myId");
  const gameState = C.get("gameState");
  if (gameState === null) return <div>Loading...</div>;
  return (
    <>
      {gameState.get("desc") === GameStateDesc.WaitingForPlayers && (
        <WaitingForPlayersScreen {...props} C={C} />
      )}
      {gameState.get("desc") === GameStateDesc.Starting && (
        <StartingScreen {...props} C={C} />
      )}
      {gameState.get("desc") === GameStateDesc.Playing && (
        <PlayingScreen {...props} C={C} />
      )}
    </>
  );
};

const initialClientState: ClientState = Map({
  step: WordsGameStep.Initial,
  gameState: emptyGameState(),
  myId: null,
  winner: null,
  wrongGuess: false,
});

const serverMessageReducer = (
  state: ClientState,
  msg: ServerMessage
): ClientState => {
  const parsed = msg;
  switch (parsed.type) {
    // We get this after joining with a nickname
    case SWMSG.InitGame:
      {
        state = state.set("step", WordsGameStep.Playing);
        state = state.set(
          "gameState",
          Map(Immutable.fromJS(parsed.state) as any)
        );
        state = state.set("myId", String(parsed.player.id));
        return state;
      }
      break;
    case SWMSG.UpdateGameState:
      {
        // Generic game state update
        return state.updateIn(["gameState"], (gs: any) =>
          gs.merge(Map(Immutable.fromJS(parsed.state) as any) as any)
        );
      }
      break;
    case SWMSG.PlayerJoined:
      {
        const nextState = state.updateIn(
          ["gameState", "players"],
          (players: any) => players.set(parsed.player.id, Map(parsed.player))
        );
        return nextState;
      }
      break;
    case SWMSG.RemovePlayer:
      {
        const nextState = state.updateIn(
          ["gameState", "players"],
          (players: any) => players.remove(parsed.id)
        );
        return nextState;
      }
      break;
    case SWMSG.UserInput:
      {
        return state!.setIn(
          ["gameState", "players", parsed.id.toString(), "input"],
          parsed.input
        );
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

const gameStateReducer = (
  state: ClientState,
  action: ClientAction
): ClientState => {
  if (displayActionLog) {
    console.group("reducer dispatch");
    console.info(action);
    console.info(state.toJS());
    console.groupEnd();
  }
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
    case ActionType.ResetWrongGuess:
      {
        return state.set("wrongGuess", false);
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
  const [C, dispatch] = useReducer<typeof gameStateReducer>(
    gameStateReducer,
    initialClientState
  );
  const [userGuess, setState] = useState<string>("");
  const resetState = () => dispatch({ type: ActionType.ResetState });
  const socket = useWSocket<CWMSG, ClientMessage, ServerMessage>(
    WS_WORDS_API_URL,
    (messageHistory: ServerMessage[]) => {
      for (let i = 0; i < messageHistory.length; ++i) {
        const parsed = messageHistory[i];
        dispatch({ type: ActionType.ServerMessage, payload: parsed });
      }
    }
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
          return (
            <GameScreen dispatch={dispatch} socket={socket} C={C} join={join} />
          );
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
