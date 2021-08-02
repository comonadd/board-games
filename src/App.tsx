import logo from "./logo.svg";
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import Input from "@material-ui/core/Input";
import "./App.css";
import Card from "@material-ui/core/Card";
import Paper from "@material-ui/core/Paper";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import { version } from "../package.json";

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

const useQuestions = (themes: Set<Theme>) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  useEffect(() => {
    (async () => {
      const module = await import("./questions.json");
      const json = module.default;
      let qst: Question[] = [];
      console.log(json);
      themes.forEach((t: Theme) => {
        const qq = (json as any)[t] ?? [];
        console.log(qq);
        for (let q of qq) qst.push(q);
      });
      console.log(qst);
      setQuestions(qst);
    })();
  }, [themes]);
  return questions;
};

const useThemes = () => {
  const [themes, setThemes] = useState<Theme[]>([]);
  useEffect(() => {
    (async () => {
      const module = await import("./themes.json");
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
    rightAnswer = rightAnswerWords.filter(w => !articles.has(w)).join(" ");
  }
  if (userAnswerWords.length > 1) {
    userAnswer = userAnswerWords.filter(w => !articles.has(w)).join(" ");
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
            <Grid item xs={3}>
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

const ScreenContentHeader = (props: { children: any }) => {
  return <div className="screen-content-header">{props.children}</div>;
};

interface PlayScreenProps {
  gameSettings: GameSettings;
  gotoSettings: () => void;
}

const Play = (props: PlayScreenProps) => {
  const { gameSettings } = props;
  const questions = useQuestions(gameSettings.themes);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(-1);
  const currentQuestion: Question | null =
    currentQuestionIdx !== -1 ? questions[currentQuestionIdx] : null;
  /* console.log(questions); */
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [remainingAttempts, setRemainingAttempts] = useState<number>(3);
  const [properAnsweredQuestions, setProperAnsweredQuestions] = useState<number>(0);

  const onAnswer = () => {
    if (currentQuestion === null) return;
    if (userAnswer === "") return;
    const correct = doesAnswerMatchQuestion(currentQuestion, userAnswer);
    console.log(correct);
    if (correct) {
      console.log('correct');
      return;
      setProperAnsweredQuestions(properAnsweredQuestions + 1);
      const finished = currentQuestionIdx === questions.length - 1;
      if (finished) {
        console.log("finished");
      } else {
        setCurrentQuestionIdx(currentQuestionIdx + 1);
      }
    } else {
      console.log('wrong');
      return;
      if (remainingAttempts === 0) return;
      setRemainingAttempts(remainingAttempts - 1);
    }
  };

  useEffect(() => {
    if (questions.length !== 0) {
      setCurrentQuestionIdx(0);
    }
  }, [questions]);

  if (currentQuestion === null) return <div>"Loading..."</div>;
  const lost = remainingAttempts === 0;
  const reset = () => {
    setCurrentQuestionIdx(0);
    setRemainingAttempts(3);
    setUserAnswer("");
  };
  if (lost) {
    return (
      <Screen title="You lost!">
        <ScreenContent>
          <ScreenContentHeader>
            <Typography variant="h5" component="h2">
              You Lost!
            </Typography>
          </ScreenContentHeader>
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

  return (
    <Screen title="Playing">
      <ScreenContent>
        <ScreenContentHeader>
          <Typography variant="h5" component="h2">
            Answer
          </Typography>
        </ScreenContentHeader>
        <div className="answer-screen-content">
          <div>
            <b>Question:</b>
            <Typography variant="h6" component="h2">
              {currentQuestion.text}
            </Typography>
          </div>
          <div>
            <div className="mb-4">
              <b>Answer:</b><br/>
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
              <b>Themes:</b>{" "}
              {Array.from(gameSettings.themes)
                .map((a) => a)
                .join(", ")}
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
    </header>
  );
};

const App = () => {
  // TODO: Maybe load previous game state if user refreshes on accident
  const [step, setStep] = useState<Step>(Step.ConfiguringGame);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    themes: new Set(),
    mode: GameMode.Normal,
  });
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
  return (
    <div className="app">
      <Header />
      {game}
    </div>
  );
};

export default App;
