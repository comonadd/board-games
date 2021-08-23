import React, { useMemo, useRef, useState, useEffect } from "react";
import Input from "@material-ui/core/Input";
import "./App.css";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import FavoriteIcon from "@material-ui/icons/Favorite";
import ArrowRightAltIcon from "@material-ui/icons/ArrowRightAlt";
import {
  generateInitialNickname,
  cn,
  capitalize,
  randomChoice,
  WSocketState,
  WSocket,
  useWSocket,
} from "./util";
import { Screen, ScreenContent, ScreenContentHeader } from "./Screen";
import { MIN_PLAYERS_FOR_GAME, WS_WORDS_API_URL } from "./constants";
import { t, tfmt } from "./ln";
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
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
}

type PlayerId = number;

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
}>;

type PlayerInfoById = Map<PlayerId, PlayerInfo>;

type GameState = ImmutableMap<{
  players: PlayerInfoById;
  whos_turn: PlayerId;
  start_timer: number;
  particle: string | null;
  desc: GameStateDesc;
  last_player_to_answer: PlayerId | null;
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
  gameState: GameState;
  playerTurn: boolean;
  myId: PlayerId;
}
const TablePlayer = (props: OtherTablePlayerProps) => {
  const { myId, player, playerTurn, gameState } = props;
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
        {player.get("nickname")} {player.get("id") === myId && <span className="ml-1">({t("you")})</span>}
      </div>
      <PlayerHearts n={player.get("lives_left")} />
      <div className="player-input">{player.get("input")}</div>
    </div>
  );
};

interface GameEndedScreenProps {
  myId: PlayerId;
  winner: PlayerInfo;
  join: () => void;
  gameState: GameState;
}

const GameEndedScreen = ({ myId, join, gameState, winner }: GameEndedScreenProps) => {
  return (
    <Screen title="Game Ended">
      <ScreenContent className="flex flex-col game-ended-message flex flex-c">
        <div className="mb-4">
          <Typography component="h1" variant="h5">
            {winner.id === myId ? t("game-ended-me") : tfmt("game-ended", winner.get("nickname"))}
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
  gameState: GameState;
  myId: PlayerId;
  socket: WSocket<CWMSG>;
}

const GameTable = ({ gameState, socket, myId }: GameTableProps) => {
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
            gameState={gameState}
            player={players.get(0)!}
            playerTurn={gameState.get("whos_turn") === pid}
            myId={myId}
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
          <TablePlayer myId={myId} {...p} />
        </Paper>
      );
    });
  }, [gameState, myId]);

  const renderedArrow = useMemo(() => {
    const t = gameState.get("whos_turn");
    if (
      t === undefined ||
      t === null ||
      t === -1
    ) {
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
  const ts = tfmt("starting", props.gameState.get("start_timer"));
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
  const gs = props.gameState;
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

const PlayingScreen = (props: GameTableProps & { socket: WSocket<CWMSG>; myId: PlayerId }) => {
  const { gameState, socket, myId } = props;
  // Input
  const myTurn = gameState.get("whos_turn") === myId;
  const [userInput, setUserInput] = useState<string>("");
  const updateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };
  const submitGuess = () => {
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

  return (
    <Screen title="Playing">
      <ScreenContent>
        <ScreenContentHeader title={t("in-game")} />
        <GameTable {...props} gameState={gameState!} />
        {myTurn && (
          <Input
            value={userInput}
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

const FailedToConnectScreen = (props: { retry: () => void; }) => {
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
        <Button onClick={retry} variant="contained" color="primary" size="large" className="w-100 mt-4">
          {t("try-again")}
        </Button>
      </Paper>
    </Screen>
  );
};

const GameScreen = (props: {
  socket: WSocket<CWMSG>;
  myId: PlayerId;
  gameState: GameState | null;
  join: () => void;
}) => {
  const { join, socket, myId, gameState } = props;
  if (gameState === null) return <div>Loading...</div>;
  return (
    <>
      {gameState.get("desc") === GameStateDesc.WaitingForPlayers && (
        <WaitingForPlayersScreen {...props} gameState={gameState!} />
      )}
      {gameState.get("desc") === GameStateDesc.Starting && (
        <StartingScreen {...props} gameState={gameState} />
      )}
      {gameState.get("desc") === GameStateDesc.Playing && (
        <PlayingScreen {...props} gameState={gameState!} />
      )}
    </>
  );
};

const WordsGame = () => {
  const [nickname, setNickname] = useState<string>(generateInitialNickname());
  const [step, setStep] = useState<WordsGameStep>(WordsGameStep.Initial);
  const [gameState, setGameState] = useState<GameState | null>(emptyGameState());
  const [userGuess, setState] = useState<string>("");
  const [myId, setMyId] = useState<PlayerId>(-1);
  const resetState = () => setGameState(emptyGameState());
  const [winner, setWinner] = useState<PlayerInfo | null>(null);
  const socket = useWSocket<CWMSG, ClientMessage, ServerMessage>(
    WS_WORDS_API_URL,
    (messageHistory: ServerMessage[]) => {
      for (let i = 0; i < messageHistory.length; ++i) {
        const parsed = messageHistory[i];
        switch (parsed.type) {
          // We get this after joining with a nickname
          case SWMSG.InitGame:
            {
              setStep(WordsGameStep.Playing);
              const initial = Map(Immutable.fromJS(parsed.state) as any);
              setGameState(initial);
              setMyId(parsed.player.id);
            }
            break;
          case SWMSG.UpdateGameState:
            {
              const newState = gameState!.merge(Map(Immutable.fromJS(parsed.state) as any) as any);
              setGameState(newState);
            }
            break;
          case SWMSG.PlayerJoined:
            {
              const nextState = gameState!.updateIn(["players"], (players: PlayerInfoById) =>
                players.set(parsed.player.id, Map(parsed.player)));
              setGameState(nextState);
            }
            break;
          case SWMSG.RemovePlayer:
            {
              const nextState = gameState!.updateIn(["players"], (players: PlayerInfoById) => players.remove(parsed.id));
              setGameState(nextState);
            }
            break;
          case SWMSG.UserInput:
            {
              setGameState(gameState!.setIn(["players", parsed.id.toString(), "input"], parsed.input));
            }
            break;
          case SWMSG.EndGame:
            {
              setStep(WordsGameStep.Ended);
              setWinner(Map(parsed.winner));
            }
            break;
          case SWMSG.GameInProgress:
            {
              setStep(WordsGameStep.ErrorGameInProgress);
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

  // Render
  const game = useMemo(() => {
    const retry = () => setStep(WordsGameStep.Initial);
    switch (socket.state) {
      case WSocketState.Connecting: {
        return <ConnectingScreen />;
      } break;
      case WSocketState.Closed: {
        return <FailedToConnectScreen retry={retry} />;
      } break;
    }
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
          return <GameScreen myId={myId} socket={socket} gameState={gameState} join={join} />;
        }
        break;
      case WordsGameStep.Ended:
        {
          return <GameEndedScreen gameState={gameState!} myId={myId} join={join} winner={winner} />;
        }
        break;
      default: {
        return <div>Invalid state: {step === undefined ? "empty" : step}</div>;
      }
    }
  }, [step, gameState, nickname, winner, socket.state]);

  return game;
};

export default WordsGame;
