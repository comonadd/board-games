import { runInAction, makeAutoObservable } from "mobx";
import { THEMES_URL } from "~/constants";
import { Theme } from "~/quizGameTypes";

export class ThemeStore {
  isLoading = true;
  themes: Theme[] = [];

  get all() {
    return this.themes;
  }

  constructor() {
    makeAutoObservable(this);
  }

  async loadThemes() {
    await runInAction(async () => {
      this.isLoading = true;
      const resp = await fetch(THEMES_URL);
      const json = await resp.json();
      this.themes = json;
      this.isLoading = false;
    });
  }
}

const themesStore = new ThemeStore();

export default themesStore;
