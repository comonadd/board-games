import logo from "./logo.svg";
import React, { useRef, useState, useEffect } from "react";
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

type CNArg = string[] | Record<string, boolean>;
const cn = (...cns: CNArg[]): string => {
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

function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  sTransformer: (v: T) => any,
  dTransformer: (v: any) => T,
): [T, (v: T) => void] {
  const localStorageItem = localStorage.getItem(key);
  const [data, setData] = useState<T>(
    localStorageItem ? dTransformer(JSON.parse(localStorageItem)) : initialValue,
  );
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(sTransformer(data)));
  }, [data]);
  return [data, setData];
}

interface Question {
  text: string;
  answer: string;
}

type Theme = string;

enum GameMode {
  Normal = 0,
}

interface GameSettings {
  themes: Set<Theme>;
  mode: GameMode;
}

const range = (start: number, stop: number, step: number) =>
  Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);

function shuffleArray<T>(arr: T[]): T[] {
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

const useQuestions = (themes: Set<Theme>, shuffled: boolean) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const reshuffleQuestions = () => {
    setQuestions(shuffleArray(questions));
  };
  useEffect(() => {
    (async () => {
      const module = await import("../public/questions/questions.json");
      const json = module.default;
      let qst: Question[] = [];
      themes.forEach((t: Theme) => {
        const qq = (json as any)[t] ?? [];
        for (let q of qq) qst.push(q);
      });
      if (shuffled) {
        qst = shuffleArray(qst);
      }
      setQuestions(qst);
    })();
  }, [themes]);
  return { questions, reshuffleQuestions };
};

const useThemes = () => {
  const [themes, setThemes] = useState<Theme[]>([]);
  useEffect(() => {
    (async () => {
      const module = await import("../public/questions/themes.json");
      const json = module.default;
      setThemes(json);
    })();
  }, []);
  return themes;
};

const articles = new Set(["the", "an", "a"]);

const doesAnswerMatchQuestion = (question: Question, answer: string): boolean => {
  let rightAnswer = question.answer.toLowerCase();
  let userAnswer = answer.toLowerCase();
  const rightAnswerWords = rightAnswer.split(" ");
  const userAnswerWords = userAnswer.split(" ");
  // Remove all articles if the answer is longer than 1 word
  if (rightAnswerWords.length > 1) {
    rightAnswer = rightAnswerWords.filter((w) => !articles.has(w)).join(" ");
  }
  if (userAnswerWords.length > 1) {
    userAnswer = userAnswerWords.filter((w) => !articles.has(w)).join(" ");
  }
  // TODO: Maybe use the edit distance to determine correctness?
  return rightAnswer === userAnswer;
};

const randomColor = () => {
  return [
    Math.round(Math.random() * 255),
    Math.round(Math.random() * 255),
    Math.round(Math.random() * 255),
  ];
};

const randomCSSColor = () => {
  return `rgb(${randomColor().join(",")})`;
};

const ConfigurationScreen = (props: {
  gameSettings: GameSettings;
  onUpdate: (gs: GameSettings) => void;
  onPlay: () => void;
}) => {
  const { onUpdate } = props;
  const themes = useThemes();
  const { gameSettings } = props;
  return (
    <Screen title="Configure the game">
      <Typography className="screen-title" variant="h4" component="h2">
        Select themes
      </Typography>
      <Grid container spacing={2} className="theme-grid">
        {themes.map((theme) => {
          //const background = randomCSSColor();
          const isSelected = gameSettings.themes.has(theme);
          return (
            <Grid item xs={3} key={theme}>
              <Paper
                elevation={2}
                className={cn({ "theme-card": true, "theme-card_selected": isSelected })}
                onClick={() => {
                  if (!isSelected) {
                    onUpdate({
                      ...props.gameSettings,
                      themes: new Set([...props.gameSettings.themes, theme]),
                    });
                  } else {
                    props.gameSettings.themes.delete(theme);
                    onUpdate({
                      ...props.gameSettings,
                      themes: new Set([...props.gameSettings.themes]),
                    });
                  }
                }}
              >
                {theme}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
      <Button onClick={props.onPlay} variant="contained" size="large" color="primary">
        Play the game
      </Button>
    </Screen>
  );
};

const Screen = (props: { title: string; children: any }) => {
  useEffect(() => {
    document.title = props.title;
  }, [props.title]);
  return <div className="screen">{props.children}</div>;
};

const ScreenContent = (props: { children: any }) => {
  return <div className="screen-content">{props.children}</div>;
};

const ScreenContentHeader = (props: { title: string; children?: any }) => {
  return (
    <div className="screen-content-header">
      <div className="flex flex-c flex-100">
        <Typography variant="h5" component="h2">
          {props.title}
        </Typography>
      </div>
      {props.children}
    </div>
  );
};

interface PlayScreenProps {
  gameSettings: GameSettings;
  gotoSettings: () => void;
}

type Milliseconds = number;
type Seconds = number;

interface Timer {
  reset: () => void;
  stop: () => void;
  start: () => void;
  current: Milliseconds;
}
const timerSeconds = (t: Timer) => Math.round(t.current / 1000);
const useMSTimer = (
  tickDuration: Milliseconds,
  countTo: Milliseconds,
  countDown: boolean = true,
): Timer => {
  const initialTime = countDown ? countTo : 0;
  const [current, setCurrent] = useState<Milliseconds>(initialTime);
  const [stopped, setStopped] = useState<boolean>(false);
  const finished = (countDown && current <= 0) || (!countDown && current >= countTo);
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
    }, [tickDuration]);
  }, [stopped, current]);
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

const POINTS_PER_ANSWER = 100;
const timeToAnswer: Seconds = 60;
const TIME_TO_ANSWER_QUESTION: Milliseconds = 5000;

const Play = (props: PlayScreenProps) => {
  const { gameSettings } = props;
  const { questions, reshuffleQuestions } = useQuestions(gameSettings.themes, true);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(-1);
  const currentQuestion: Question | null =
    currentQuestionIdx !== -1 ? questions[currentQuestionIdx] : null;
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [remainingAttempts, setRemainingAttempts] = useState<number>(3);
  const [properAnsweredQuestions, setProperAnsweredQuestions] = useState<number>(0);
  const [totalPonts, setTotalPoints] = useState<number>(0);
  const timer = useMSTimer(1000, TIME_TO_ANSWER_QUESTION, true);

  const nextQuestion = () => {
    const finished = currentQuestionIdx === questions.length - 1;
    if (finished) {
      console.log("finished");
    } else {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    }
  };

  const onAnswer = () => {
    if (currentQuestion === null) return;
    if (userAnswer === "") return;
    const correct = doesAnswerMatchQuestion(currentQuestion, userAnswer);
    if (correct) {
      setProperAnsweredQuestions(properAnsweredQuestions + 1);
      const timeTookToAnswer = timeSpent;
      const timeK = timeTookToAnswer / timeToAnswer;
      const questionDifficulty = 1.0;
      setTotalPoints(timeK * questionDifficulty * POINTS_PER_ANSWER);
      nextQuestion();
    } else {
      if (remainingAttempts === 0) return;
      setRemainingAttempts(remainingAttempts - 1);
    }
  };

  useEffect(() => {
    if (questions.length !== 0) {
      setCurrentQuestionIdx(0);
    }
  }, [questions]);

  useEffect(() => {
    timer.start();
  }, []);

  useEffect(() => {
    if (timer.finished) {
      nextQuestion();
    }
  }, [timer.current]);

  useEffect(() => {
    timer.reset();
    timer.start();
  }, [currentQuestionIdx]);

  if (currentQuestion === null) return <div>"Loading..."</div>;
  const lost = remainingAttempts === 0;
  const reset = () => {
    setCurrentQuestionIdx(0);
    setRemainingAttempts(3);
    setUserAnswer("");
    reshuffleQuestions();
    timer.reset();
    timer.start();
  };

  if (lost) {
    return (
      <Screen title="You lost!">
        <ScreenContent>
          <ScreenContentHeader title="You Lost!"></ScreenContentHeader>
          <div>
            <span>Proper answered questions: </span>
            <span>
              {properAnsweredQuestions}/{questions.length}
            </span>
          </div>
          <Grid container spacing={1}>
            <Grid item xs={12} md={6} className="flex flex-ch">
              <Button onClick={reset} color="primary" variant="outlined">
                Play again
              </Button>
            </Grid>
            <Grid item xs={12} md={6} className="flex flex-ch">
              <Button onClick={props.gotoSettings} color="secondary" variant="outlined">
                Change settings
              </Button>
            </Grid>
          </Grid>
        </ScreenContent>
      </Screen>
    );
  }

  const isImageQuestion = currentQuestion !== null && currentQuestion.text[0] === "@";

  return (
    <Screen title="Playing">
      <ScreenContent>
        <ScreenContentHeader title="Answer">
          <IconButton
            color="secondary"
            aria-label="Restart the game"
            title="Restart the game"
            onClick={reset}
          >
            <ReplayIcon />
          </IconButton>
          <IconButton
            color="secondary"
            aria-label="Reconfigure"
            title="Reconfigure"
            onClick={props.gotoSettings}
          >
            <SettingsIcon />
          </IconButton>
        </ScreenContentHeader>
        <div className="answer-screen-content">
          {timerSeconds(timer)}
          <div className="question">
            <div className="mb-2">
              <b>Question:</b>
            </div>
            {isImageQuestion ? (
              <div className="q-image-container flex flex-c">
                <img
                  src={`/questions/Images/${currentQuestion.text.substr(
                    1,
                    currentQuestion.text.length,
                  )}`}
                  className="mb-2"
                />
              </div>
            ) : (
              <Typography variant="h6" component="h2">
                {currentQuestion.text}
              </Typography>
            )}
          </div>
          <div>
            <div className="mb-4">
              <b>Answer:</b>
              <br />
              <div>{remainingAttempts} attempts remaining</div>
              <Input
                onKeyDown={(e) => {
                  if (e.which === 13) onAnswer();
                }}
                className="w-100"
                onChange={(e) => setUserAnswer(e.target.value)}
              />
            </div>
            <div>
              <b>Themes:</b> {Array.from(gameSettings.themes).join(", ")}
            </div>
          </div>
        </div>
      </ScreenContent>
    </Screen>
  );
};

enum Step {
  ConfiguringGame = 0,
  Playing = 1,
}

const Header = () => {
  return (
    <header className="header">
      <div className="logo flex flex-c">Quiz Game v{version}</div>
      <div>
        <div>
          <Link to="/quiz">Quiz</Link>
        </div>
        <div>
          <Link to="/words">Bomb Party Words</Link>
        </div>
      </div>
    </header>
  );
};

const QuizGame = () => {
  // TODO: Maybe load previous game state if user refreshes on accident
  const [step, setStep] = useState<Step>(Step.ConfiguringGame);
  const [gameSettings, setGameSettings] = useLocalStorageState<GameSettings>(
    "gameSettings",
    {
      themes: new Set(),
      mode: GameMode.Normal,
    },
    (v: GameSettings) => ({
      themes: Array.from(v.themes),
      mode: v.mode,
    }),
    (v) => ({
      themes: new Set(v.themes),
      mode: v.mode,
    }),
  );
  const game = (() => {
    switch (step) {
      case Step.Playing:
        {
          return (
            <Play gameSettings={gameSettings} gotoSettings={() => setStep(Step.ConfiguringGame)} />
          );
        }
        break;
      case Step.ConfiguringGame:
        {
          return (
            <ConfigurationScreen
              gameSettings={gameSettings}
              onUpdate={setGameSettings}
              onPlay={() => setStep(Step.Playing)}
            />
          );
        }
        break;
      default:
        {
          return null;
        }
        break;
    }
  })();
  const canPlay = gameSettings.themes.size !== 0;
  return game;
};

const IndexPage = () => {
  return <div>Index</div>;
};

const NotFoundPage = () => {
  return <div>404. Not found</div>;
};

enum WordsGameStep {
  Initial,
  Joining,
}

const WS_WORDS_API_URL = `ws://localhost:8080/words/`;

enum CWMSG {
  Joining = 0,
}

enum SWMSG {
  Joining = 0,
}

type PlayerId = number;
interface PlayerInfo {
  nickname: string;
  lives_left: number;
  dead: boolean;
}

interface WordsGameState {
  players: Record<PlayerId, PlayerInfo>;
  whos_turn: PlayerId;
  particle: string;
  user_input: string;
}

const WordsGame = () => {
  const [nickname, setNickname] = useState<string>("");
  const canJoin = nickname.length !== 0;
  const [step, setStep] = useState<WordsGameStep>(WordsGameStep.Initial);
  const [gameState, setGameState] = useState<WordsGameState>({});
  const [userGuess, setState] = useState<string>("");

  const [socket, setSocket] = useState<Websocket | null>(null);
  useEffect(() => {
    const socket = new WebSocket(WS_WORDS_API_URL);
    // Connection opened
    socket.addEventListener("open", function (event) {
      socket.send("Hello Server!");
    });
    // Listen for messages
    socket.addEventListener("message", function (event) {
      console.log("Message from server ", event.data);
      const parsed = JSON.parse(event.data);
      switch (parsed.type) {
        case SWMSG.InitGame:
          {
            setGameState(parsed.state);
          }
          break;
        default:
          {
            console.warn("Unhandled message");
            console.warn(parsed);
          }
          break;
      }
    });
    setSocket(socket);
  }, []);

  const join = () => {
    setStep(WordsGameStep.Joining);
    socket.send({ type: CWMSG.Joining });
  };

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

const App = () => {
  return (
    <Router>
      <div className="app">
        <Header />
        <Switch>
          <Route path="/" exact component={IndexPage} />
          <Route path="/quiz" exact component={QuizGame} />
          <Route path="/words" exact component={WordsGame} />
          <Route path="*" component={NotFoundPage} />
        </Switch>
      </div>
    </Router>
  );
};

export default App;
