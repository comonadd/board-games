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
  getDependencyTree,
} from "mobx";
import { QUESTIONS_URL, THEMES_URL } from "~/constants";
import { shuffleArray } from "~/util";
import { Theme, GameMode } from "~/quizGameTypes";

const LS_KEY = "game-settings";

const jsToJSONString = (js: any): any => {
  let obj: any = {};
  for (let prop of Object.keys(js)) {
    const val = js[prop];
    if (typeof val === "object" && val instanceof Set) {
      obj[prop] = [...val];
    } else {
      obj[prop] = val;
    }
  }
  console.log(obj);
  return JSON.stringify(obj);
};

function syncWithLS<T extends { lsState: string }>(_this: T, key: string) {
  let firstRun = true;
  autorun(() => {
    console.log("updated");
    if (firstRun) {
      firstRun = false;
      console.log("first run");
      const existingStore = localStorage.getItem(key);
      if (existingStore) {
        const json = JSON.parse(existingStore);
        for (const [k, v] of Object.entries(json)) {
          (_this as any)[k].set(v);
        }
        //extendObservable(_this, p);
      } else {
        console.log("nothing in storage, skipping");
      }
    } else {
      const toSave = _this.lsState;
      console.log("saving", toSave);
      localStorage.setItem(key, toSave);
    }
  });
}

interface IGameSettings {
  themes: Set<Theme>;
  mode: GameMode;
  shuffleQuestions: boolean;
  attempts: number;
  timeToAnswer: number;
}

export class GameSettings implements IGameSettings {
  themes: IGameSettings["themes"] = new Set([]);
  mode = GameMode.Normal;
  shuffleQuestions = true;
  attempts = 10;
  timeToAnswer = 20;

  constructor() {
    makeAutoObservable(this);
    let firstRun = true;
    const disposer = autorun(() => {
      this.lsState;
      if (firstRun) {
        const initialState = localStorage.getItem(LS_KEY);
        if (initialState !== null) {
          this.initFromJson(JSON.parse(initialState));
        }
        firstRun = false;
      } else {
        localStorage.setItem(LS_KEY, this.lsState);
      }
    });
  }

  get themesSelected() {
    return this.themes;
  }

  get lsState() {
    return JSON.stringify({
      themes: Array.from(this.themes),
      mode: this.mode,
      attempts: this.attempts,
      shuffleQuestions: this.shuffleQuestions,
    });
  }

  initFromJson(json: IGameSettings) {
    runInAction(() => {
      this.themes = new Set(json["themes"]) as any;
      this.attempts = json["attempts"];
      this.shuffleQuestions = json["shuffleQuestions"];
      this.mode = json["mode"];
    });
  }

  selectTheme(theme: Theme) {
    this.themes = new Set([...this.themes, theme]);
  }

  deselectTheme(theme: Theme) {
    this.themes.delete(theme);
    this.themes = new Set([...this.themes]);
  }
}

const gameSettingsStore = new GameSettings();

export default gameSettingsStore;
