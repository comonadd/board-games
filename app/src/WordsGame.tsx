import logo from "./logo.svg";
import React, { useCallback, useRef, useState, useEffect } from "react";
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
}

enum SWMSG {
  InitGame = 0,
  UpdateGameState = 1,
}

type PlayerId = number;
interface PlayerInfo {
  nickname: string;
  lives_left: number;
}

enum GameStateDesc {
  WaitingForPlayers = 0,
  Playing = 1,
  Starting = 2,
  Ended = 3,
}

interface WordsGameState {
  players: Record<PlayerId, PlayerInfo>;
  whos_turn: PlayerId;
  start_timer: number;
  particle: string | null;
  user_input: string;
  desc: GameStateDesc;
  last_player_to_answer: PlayerId | null;
}

enum WordsGameStep {
  Initial = 0,
  Joining = 1,
  Playing = 2,
}

interface Message extends Record<string, any> {
  type: CWMSG;
}

const emptyGameState = (): WordsGameState | null => {
  return null;
};

const WordsGame = () => {
  const [nickname, setNickname] = useState<string>("");
  const canJoin = nickname.length !== 0;
  const [step, setStep] = useState<WordsGameStep>(WordsGameStep.Initial);
  const [gameState, setGameState] = useState<WordsGameState | null>(emptyGameState());
  const [userGuess, setState] = useState<string>("");
  const resetState = () => setGameState(emptyGameState());

  // Socket interaction
  const socket = useRef<WebSocket | null>(null);
  const onOpen = (event: any) => {};
  const onClose = (event: any) => {
    resetState();
    setStep(WordsGameStep.Initial);
    initSocket();
  };
  const initSocket = () => {
    socket.current = new WebSocket(WS_WORDS_API_URL);
    socket.current.addEventListener("open", onOpen);
    socket.current.addEventListener("close", onClose);
  };
  const socketSend = (m: Message) => socket.current!.send(JSON.stringify(m));

  const join = () => {
    setStep(WordsGameStep.Joining);
    socketSend({ type: CWMSG.Joining, nickname });
  };

  useEffect(() => {
    initSocket();
  }, []);

  const [messageHistory, setMessageHistory] = useState<Message[]>([]);

  useEffect(() => {
    const onMessage = (event) => {
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
    for (let i = 0; i < messageHistory.length; ++i) {
      const parsed = messageHistory[i];
      console.log(parsed);
      switch (parsed.type) {
        case SWMSG.InitGame:
          {
            setGameState(parsed.state);
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
    setMessageHistory([]);
  }, [messageHistory]);

  useEffect(() => {
    if (gameState === null) {
      setStep(WordsGameStep.Initial);
      return;
    }
    /* console.log(gameState); */
    switch (gameState.desc) {
      case GameStateDesc.WaitingForPlayers:
        {
          setStep(WordsGameStep.Playing);
        }
        break;
      case GameStateDesc.Starting:
        {
          setStep(WordsGameStep.Playing);
        }
        break;
      case GameStateDesc.Playing:
        {
          setStep(WordsGameStep.Playing);
        }
        break;
    }
  }, [gameState]);

  const game = (() => {
    switch (step) {
      case WordsGameStep.Initial:
        {
          return (
            <div>
              <Input
                onChange={(e) => setNickname(e.target.value)}
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
        }
        break;
      case WordsGameStep.Joining:
        {
          return <div>Joining...</div>;
        }
        break;
      case WordsGameStep.Playing:
        {
          if (gameState === null) return;
          const gameScreen = (
            <div>
              <h1>Game</h1>
              <div>
                <div>Players:</div>
                {Object.keys(gameState?.players || {}).map((pidS) => {
                  const playerId = Number(pidS);
                  const player = (gameState.players as any)[playerId];
                  const dead = player.lives_left === 0;
                  let hearts = [];
                  for (let i = 0; i < player.lives_left; ++i) hearts.push(<FavoriteIcon key={i} />);
                  const turn = gameState.whos_turn === playerId;
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
                      {turn && <span>{gameState.user_input}</span>}
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
                const winnerId = gameState["last_player_to_answer"];
                const winner = gameState["players"][winnerId];
                return (
                  <div>
                    <div className="game-ended">
                      Game Ended. Winner is {winner.nickname}
                    </div>
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
        }
        break;
      default: {
        return <div>Invaild state</div>;
      }
    }
  })();
  return (
    <Screen title="Words">
      <div className="words-game">{game}</div>
    </Screen>
  );
};

export default WordsGame;
