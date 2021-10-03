import {
  extendObservable,
  makeAutoObservable,
  autorun,
  runInAction,
  reaction,
  toJS,
  makeObservable,
  observable,
  action,
} from "mobx";
import { QUESTIONS_URL, THEMES_URL } from "~/constants";
import { shuffleArray } from "~/util";
import { Theme, Question, Step } from "~/quizGameTypes";
import gameSettingsStore, { GameSettings } from "./gameSettingsStore";
import Timer from "~/Timer";
import themeStore, { ThemeStore } from "./themeStore";
import questionStore, { QuestionStore } from "./questionStore";
import { Seconds, Milliseconds } from "~/util";

const TIME_TO_ANSWER_QUESTION: Milliseconds = 5000;
const ARTICLES = new Set(["the", "an", "a"]);
const TIME_TO_ANSWER: Seconds = 60;
const POINTS_PER_ANSWER = 100;

// TODO: Maybe use the edit distance to determine correctness?
const doesAnswerMatchQuestion = (
  question: Question,
  answer: string
): boolean => {
  let userAnswer = answer.toLowerCase();
  const userAnswerWords = userAnswer.split(" ");
  for (const answer of question.answers) {
    let rightAnswer = answer.toLowerCase();
    const rightAnswerWords = rightAnswer.split(" ");
    // Remove all articles if the answer is longer than 1 word
    if (rightAnswerWords.length > 1) {
      rightAnswer = rightAnswerWords.filter((w) => !ARTICLES.has(w)).join(" ");
    }
    if (userAnswerWords.length > 1) {
      userAnswer = userAnswerWords.filter((w) => !ARTICLES.has(w)).join(" ");
    }
    if (rightAnswer === userAnswer) return true;
  }
  return false;
};

interface QuestionStatus {
  userAnswer: string;
  question: Question;
  correct: boolean;
}

type QuizProgress = Map<number, QuestionStatus>;

interface SavedGameState {
  step: Step;
  timer: Timer;
  remainingAttempts: number;
  currentQuestionIdx: number;
  totalPoints: number;
  quizProgress: QuizProgress;
  shuffleSeed: number;
}

interface IQuizGameStore extends SavedGameState {
  themeStore: ThemeStore;
  questionStore: QuestionStore;
  gameSettings: GameSettings;
  questionsSource: Question[];
  isLoadingQuestions: boolean;
}

// TODO: Maybe load previous game state if user refreshes on accident
class QuizGameStore implements IQuizGameStore {
  themeStore;
  questionStore;
  gameSettings;
  step = Step.ConfiguringGame;
  timer;
  questionsSource = [];
  isLoadingQuestions = false;
  remainingAttempts = 0;
  currentQuestionIdx = 0;
  totalPoints = 0;
  quizProgress = new Map<number, QuestionStatus>();
  shuffleSeed = 0;

  get isLoading() {
    return this.questionStore.isLoading || this.themeStore.isLoading;
  }

  get questions() {
    return this.questionStore.selectForTheme(
      this.gameSettings.themes,
      this.gameSettings.shuffleQuestions,
      this.shuffleSeed
    );
  }

  get themes() {
    return this.themeStore.all;
  }

  get finished() {
    return this.step === Step.Finished;
  }

  get currentQuestion() {
    return this.questions[this.currentQuestionIdx];
  }

  get currentQuestionParsed() {
    return this.currentQuestion;
  }

  get isImageQuestion() {
    return this.currentQuestionParsed.qimages.length !== 0;
  }

  get properAnsweredQuestions() {
    let k = 0;
    for (const q of this.quizProgress.values()) {
      if (q.correct) ++k;
    }
    return k;
  }

  constructor(
    gameSettingsStore: GameSettings,
    themeStore: ThemeStore,
    questionStore: QuestionStore
  ) {
    makeAutoObservable(this);
    this.gameSettings = gameSettingsStore;
    this.themeStore = themeStore;
    this.questionStore = questionStore;
    this.timer = new Timer(1000, this.gameSettings.timeToAnswer * 1000);

    autorun(() => {
      if (this.step === Step.Playing && this.timer.finished) {
        this.skipQuestion();
      }
    });

    autorun(() => {
      if (
        this.step === Step.Playing &&
        (this.remainingAttempts <= 0 ||
          this.currentQuestionIdx >= this.questions.length)
      ) {
        this.finishGame();
      }
    });

    // try to restore game state from local storage
    const maybeSavedState = localStorage.getItem("saved-game");
    if (maybeSavedState !== null) {
      const savedState: SavedGameState = JSON.parse(maybeSavedState) as any;
      this.restoreGame(savedState);
    }

    // save game state to Local storage
    autorun(() => {
      const gameState = {
        step: this.step,
        timer: this.timer,
        remainingAttempts: this.remainingAttempts,
        currentQuestionIdx: this.currentQuestionIdx,
        totalPoints: this.totalPoints,
        quizProgress: this.quizProgress,
        shuffleSeed: this.shuffleSeed,
      };
      localStorage.setItem("saved-game", JSON.stringify(gameState));
    });
  }

  async loadQuestions() {
    await this.questionStore.load();
  }

  reshuffleQuestions() {
    console.log("reshuffling");
    this.shuffleSeed = Math.round(Math.random() * (1 << 30));
  }

  resetGame() {
    runInAction(() => {
      this.remainingAttempts = this.gameSettings!.attempts;
      this.timer.reset();
      this.currentQuestionIdx = 0;
      this.quizProgress = new Map();
      this.reshuffleQuestions();
    });
  }

  answer = (userAnswer: string) => {
    if (this.currentQuestion === null) return;
    if (userAnswer === "") return;
    const correct = doesAnswerMatchQuestion(this.currentQuestion, userAnswer);
    this.quizProgress.set(this.currentQuestionIdx, {
      userAnswer,
      question: this.currentQuestion,
      correct,
    });
    if (correct) {
      const timeTookToAnswer = TIME_TO_ANSWER_QUESTION - qs.timer!.current;
      const timeK = timeTookToAnswer / TIME_TO_ANSWER;
      const questionDifficulty = 1.0;
      this.totalPoints += timeK * questionDifficulty * POINTS_PER_ANSWER;
    } else {
      runInAction(() => {
        if (this.remainingAttempts === 0) return;
        --this.remainingAttempts;
      });
    }
    qs.nextQuestion();
  };

  skipQuestion = () => {
    --this.remainingAttempts;
    this.quizProgress.set(this.currentQuestionIdx, {
      userAnswer: "",
      question: this.currentQuestion,
      correct: false,
    });
    this.nextQuestion();
  };

  gotoSettings = () => {
    runInAction(() => {
      this.step = Step.ConfiguringGame;
    });
  };

  nextQuestion = () => {
    runInAction(() => {
      if (this.finished) {
        console.warn(
          "Tried to call nextQuestion() when the game is already finished"
        );
      } else {
        this.currentQuestionIdx += 1;
        qs.timer.reset();
        qs.timer.start();
      }
    });
  };

  finishGame() {
    this.step = Step.Finished;
  }

  async restoreGame(savedState: SavedGameState) {
    await this.loadQuestions();
    runInAction(() => {
      this.resetGame();
    });
    runInAction(() => {
      const TIMER_INTERVAL = 1000;
      for (let [key, value] of Object.entries(savedState)) {
        (this as any)[key] = (savedState as any)[key];
      }
      this.timer = new Timer(
        TIMER_INTERVAL,
        this.gameSettings.timeToAnswer * 1000
      );
      this.quizProgress = new Map(savedState.quizProgress);
      this.timer.current = savedState.timer.current;
      this.step = Step.Playing;
      this.timer.start();
    });
  }

  startGame = async () => {
    console.log("start game");
    runInAction(() => {
      this.resetGame();
    });
    await this.loadQuestions();
    runInAction(() => {
      this.step = Step.Playing;
      this.timer.start();
    });
  };
}

const qs = new QuizGameStore(gameSettingsStore, themeStore, questionStore);

export default qs;
