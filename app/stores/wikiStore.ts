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

export interface IWikiGameStore {
  isLoading: boolean;
  currArticle: string | null;
}

export class WikiGameStore implements IWikiGameStore {
  loading = false;
  currArticle = null;

  get isLoading() {
    return this.loading;
  }

  constructor() {
    makeAutoObservable(this);
  }
}

const qs = new WikiGameStore();

export default qs;
