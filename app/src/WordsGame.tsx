
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
}

interface WordsGameState {
  players: Record<PlayerId, PlayerInfo>;
  whos_turn: PlayerId;
  particle: string;
  user_input: string;
  desc: GameStateDesc;
}

enum WordsGameStep {
  Initial = 0,
  Joining = 1,
  Playing = 2,
}

interface Message extends any {
  type: CWMSG;
}

const WordsGame = () => {
  const [nickname, setNickname] = useState<string>("");
  const canJoin = nickname.length !== 0;
  const [step, setStep] = useState<WordsGameStep>(WordsGameStep.Initial);
  const [gameState, setGameState] = useState<WordsGameState>({});
  const [userGuess, setState] = useState<string>("");

  // Socket interaction
  const [socket, setSocket] = useState<Websocket | null>(null);
  const initSocket = () => {
    setSocket(new WebSocket(WS_WORDS_API_URL));
  }
  useEffect(() => {
    initSocket();
  }, []);
  const onOpen = useCallback((event) => {}, []);
  const onClose = useCallback((event) => {
    setGameState({});
    setStep(WordsGameStep.Initial);
    console.log('on-close');
    initSocket();
  }, []);
  const onMessage = useCallback(
    (event) => {
      console.log("Message from server ", event.data);
      console.log(gameState);
      const parsed = JSON.parse(event.data);
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
    },
    [gameState],
  );
  useEffect(() => {
    if (socket === null) return;
    console.log("re-binding");
    socket.addEventListener("open", onOpen);
    socket.addEventListener("message", onMessage);
    socket.addEventListener("close", onClose);
    return () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("close", onClose);
    };
  }, [socket, onOpen, onMessage]);

  const socketSend = (m: Message) => socket.send(JSON.stringify(m));

  const join = () => {
    setStep(WordsGameStep.Joining);
    socketSend({ type: CWMSG.Joining, nickname });
  };

  useEffect(() => {
    console.log(gameState);
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
          const gameScreen = (
            <div>
              <h1>Game</h1>
              <div>
                <div>Players:</div>
                {Object.keys(gameState?.players).map((playerId) => {
                  const player = gameState.players[playerId];
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
                console.log("starting.....");
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
