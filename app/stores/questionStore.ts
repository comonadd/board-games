import { toJS, runInAction, makeAutoObservable } from "mobx";
import { QUESTIONS_URL } from "~/constants";
import { QuestionWithTheme, Theme, Question } from "~/quizGameTypes";
import { shuffleArray } from "~/util";

type QMap = Record<Theme, Question[]>;

export class QuestionStore {
  isLoading = true;
  questions: QMap = {};
  loaded = false;

  constructor() {
    makeAutoObservable(this);
  }

  async load() {
    if (!this.loaded) {
      runInAction(() => {
        this.isLoading = true;
      });
      const resp = await fetch(QUESTIONS_URL);
      const json: QMap = await resp.json();
      runInAction(() => {
        this.questions = json;
        this.isLoading = false;
        this.loaded = true;
      });
    }
  }

  selectForTheme(
    themes: Set<Theme>,
    shuffleQuestions = false,
    shuffleSeed = 0,
  ): QuestionWithTheme[] {
    let qst: QuestionWithTheme[] = [];
    themes.forEach((t: Theme) => {
      const qq = this.questions[t] ?? [];
      for (let q of qq) qst.push({ ...q, theme: t });
    });
    const shuffled = shuffleArray(qst, shuffleSeed);
    return shuffled;
  }
}

const questionStore = new QuestionStore();

export default questionStore;
