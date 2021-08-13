import logo from "./logo.svg";
import React, { useMemo, useCallback, useRef, useState, useEffect } from "react";
import ReactDOM from "react-dom";
import Input from "@material-ui/core/Input";
import "./App.css";
import Card from "@material-ui/core/Card";
import Paper from "@material-ui/core/Paper";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import ReplayIcon from "@material-ui/icons/Replay";
import SettingsIcon from "@material-ui/icons/Settings";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import { version } from "../package.json";
import { Link, BrowserRouter as Router, Route, Switch } from "react-router-dom";
import FavoriteIcon from "@material-ui/icons/Favorite";
import ArrowRightAltIcon from "@material-ui/icons/ArrowRightAlt";
import { cn } from "./util";
import { Screen, ScreenContent } from "./Screen";

const WS_WORDS_API_URL = `ws://${location.hostname}:8080/words/`;

enum CWMSG {
  Joining = 0,
  UpdateInput = 1,
  SubmitGuess = 2,
}

enum SWMSG {
  InitGame = 0,
  UpdateGameState = 1,
}

type PlayerId = number;
interface PlayerInfo {
  nickname: string;
  lives_left: number;
  input: string;
}

enum GameStateDesc {
  WaitingForPlayers = 0,
  Playing = 1,
  Starting = 2,
  Ended = 3,
}

interface GameState {
  players: Record<PlayerId, PlayerInfo>;
  whos_turn: PlayerId;
  start_timer: number;
  particle: string | null;
  desc: GameStateDesc;
  last_player_to_answer: PlayerId | null;
}

enum WordsGameStep {
  Initial = 0,
  Joining = 1,
  Playing = 2,
}

interface ClientMessage extends Record<string, any> {
  type: CWMSG;
}

interface ServerMessage extends Record<string, any> {
  type: SWMSG;
}

const emptyGameState = (): GameState | null => {
  return null;
};

const InitialScreen = (props: {
  nickname: string;
  onChange: (v: any) => void;
  join: () => void;
}) => {
  const { nickname, onChange, join } = props;
  const canJoin = nickname.length !== 0;
  return (
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
        Join
      </Button>
    </div>
  );
};

const GameScreen = (props: {
  socket: WSocket<CWMSG>;
  myId: PlayerId;
  gameState: GameState | null;
}) => {
  const { socket, myId, gameState } = props;
  const isThisMyTurn = gameState?.whos_turn === myId;
  const [userInput, setUserInput] = useState<string>("");
  const updateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };
  const submitGuess = () => {
    socket.send(CWMSG.SubmitGuess, { guess: userInput });
  };
  console.log(myId, isThisMyTurn);
  useEffect(() => {
    if (isThisMyTurn) {
      socket.send(CWMSG.UpdateInput, { input: userInput });
    }
  }, [userInput]);
  if (gameState === null) return <div>Loading...</div>;
  const gameScreen = (
    <div>
      <h1>Game</h1>
      <div>{gameState.particle}</div>
      <div>
        <div>Players:</div>
        {Object.keys(gameState?.players || {}).map((pidS) => {
          const playerId = Number(pidS);
          const player = (gameState.players as any)[playerId];
          const dead = player.lives_left === 0;
          let hearts = [];
          for (let i = 0; i < player.lives_left; ++i) hearts.push(<FavoriteIcon key={i} />);
          const turn = gameState.whos_turn === playerId;
          const isThisMe = playerId === myId;
          const input = (() => {
            if (isThisMe && isThisMyTurn) {
              return (
                <Input
                  value={userInput}
                  onChange={updateInput}
                  onKeyDown={(e) => {
                    if (e.keyCode === 13) {
                      submitGuess();
                    }
                  }}
                />
              );
            }
            return <div>{turn && <span>{player.input}</span>}</div>;
          })();
          return (
            <div
              key={playerId}
              className={cn({
                player: true,
                player_dead: dead,
              })}
            >
              {turn && <ArrowRightAltIcon />}
              {hearts}
              <span>{player.nickname}</span>
              {input}
            </div>
          );
        })}
      </div>
    </div>
  );
  switch (gameState.desc) {
    case GameStateDesc.Playing:
      {
        return <div>{gameScreen}</div>;
      }
      break;
    case GameStateDesc.WaitingForPlayers:
      {
        return (
          <div>
            <div className="waiting-for-players-msg">
              Waiting for players... (need 2 to start the game)
            </div>
            {gameScreen}
          </div>
        );
      }
      break;
    case GameStateDesc.Starting:
      {
        return (
          <div>
            <div className="starting-msg">
              Starting: <span>{gameState.start_timer}</span>
            </div>
            {gameScreen}
          </div>
        );
      }
      break;
    case GameStateDesc.Ended:
      {
        const winnerId = gameState["last_player_to_answer"]!;
        const winner = gameState["players"][winnerId];
        return (
          <div>
            <div className="game-ended">Game Ended. Winner is {winner.nickname}</div>
            {gameScreen}
          </div>
        );
      }
      break;
    default:
      {
        console.warn(`Invalid game state description: ${gameState.desc}.`);
        return <div></div>;
      }
      break;
  }
};

enum WSocketState {
  Initial = 0,
  Closed = 1,
  Opened = 2,
}

interface WSocket<CT> {
  send: (type: CT, msgPayload: any) => void;
  state: WSocketState;
}

function useWSocket<CT, C, S>(msgHistoryListener: (msgHistory: S[]) => void): WSocket<CT> {
  const socket = useRef<WebSocket | null>(null);
  const [state, setState] = useState(WSocketState.Initial);
  const onOpen = (event: any) => {
    setState(WSocketState.Opened);
  };
  const onClose = (event: any) => {
    setState(WSocketState.Closed);
  };
  const initSocket = () => {
    socket.current = new WebSocket(WS_WORDS_API_URL);
    socket.current.addEventListener("open", onOpen);
    socket.current.addEventListener("close", onClose);
  };
  useEffect(() => {
    initSocket();
  }, []);
  const send = (type: CT, m: any) => socket.current!.send(JSON.stringify({ type, ...m }));
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
  return {
    send,
    state,
  };
}

const WordsGame = () => {
  const [nickname, setNickname] = useState<string>("");
  const [step, setStep] = useState<WordsGameStep>(WordsGameStep.Initial);
  const [gameState, setGameState] = useState<GameState | null>(emptyGameState());
  const [userGuess, setState] = useState<string>("");
  const [myId, setMyId] = useState<PlayerId>(-1);
  const resetState = () => setGameState(emptyGameState());
  const socket = useWSocket<CWMSG, ClientMessage, ServerMessage>(
    (messageHistory: ServerMessage[]) => {
      for (let i = 0; i < messageHistory.length; ++i) {
        const parsed = messageHistory[i];
        console.log(parsed);
        switch (parsed.type) {
          case SWMSG.InitGame:
            {
              setStep(WordsGameStep.Initial);
              setGameState(parsed.state);
              setMyId(parsed.player.id);
            }
            break;
          case SWMSG.UpdateGameState:
            {
              setGameState({ ...gameState, ...parsed.state });
            }
            break;
          default:
            {
              console.warn("Unhandled message");
              console.warn(parsed);
            }
            break;
        }
      }
    },
  );

  useEffect(() => {
    console.log(`Socket state: ${socket.state}`);
    switch (socket.state) {
      case WSocketState.Closed:
        {
          resetState();
        }
        break;
    }
  }, [socket.state]);

  const join = () => {
    setStep(WordsGameStep.Joining);
    socket.send(CWMSG.Joining, { nickname });
  };

  // Change current local step depending on the game state
  useEffect(() => {
    if (gameState === null) {
      setStep(WordsGameStep.Initial);
    } else {
      setStep(WordsGameStep.Playing);
    }
  }, [gameState]);

  // Render
  const game = useMemo(() => {
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
      case WordsGameStep.Joining:
        {
          return <div>Joining...</div>;
        }
        break;
      case WordsGameStep.Playing:
        {
          return <GameScreen myId={myId} socket={socket} gameState={gameState} />;
        }
        break;
      default: {
        return <div>Invaild state</div>;
      }
    }
  }, [step, gameState, nickname]);

  return (
    <Screen title="Words">
      <div className="words-game">{game}</div>
    </Screen>
  );
};

export default WordsGame;
