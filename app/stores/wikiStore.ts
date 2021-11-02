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
import WSocket, { WSocketState } from "~/WSocket";
import { PlayerId } from "~/types";

interface Article {
  path: string;
  content: string;
  title: string;
}

export interface IWikiGameStore {
  isLoading: boolean;
  currArticle: Article | null;
  targetArticle: string | null;
}

interface Player {
  nickname: string;
  id: PlayerId;
  points: null | number;
  time_started: Date;
  time_ended: Date;
  place: number | null;
}

export enum CWMSG {
  Joining = 0,
  NavigateTo = 1,
}

export enum SWMSG {
  InitGame = 0,
  NavigateTo = 1,
  Finished = 2,
}

export interface ClientMessage extends Record<string, any> {
  type: CWMSG;
}

export interface ServerMessage extends Record<string, any> {
  type: SWMSG;
}

export enum WGameStep {
  Initial = 0,
  EndGame = 1,
  Playing = 2,
}

export class WikiGameStore implements IWikiGameStore {
  loading = false;
  currArticle = null;
  socket: WSocket<ClientMessage, ServerMessage>;
  player: Player | null = null;
  step: WGameStep = WGameStep.Initial;
  targetArticle = null;

  get isLoading() {
    return this.loading;
  }

  constructor() {
    makeAutoObservable(this);
    this.socket = new WSocket(
      "ws://localhost:8080/wiki/",
      (a: any) => {
        this.onServerMessage(a);
      },
      { retryOnFail: true },
    );
    autorun(() => {
      if (this.socket.state === WSocketState.Opened) {
        this.socket.send({ type: CWMSG.Joining, nickname: "John" });
        this.loading = true;
      }
    });
  }

  @action
  onServerMessage = (msg: any) => {
    switch (msg.type) {
      case SWMSG.InitGame:
        {
          runInAction(() => {
            this.targetArticle = msg.target;
          });
        }
        break;
      case SWMSG.NavigateTo:
        {
          runInAction(() => {
            this.currArticle = msg.article;
            this.loading = false;
          });
        }
        break;
      case SWMSG.Finished:
        {
          runInAction(() => {
            this.step = WGameStep.EndGame;
            this.player = msg.player;
          });
        }
        break;
      default:
        {
          console.warn("Unhandled server message");
          console.warn(msg);
        }
        break;
    }
  };

  @action
  navigateTo(path: string) {
    this.socket.send({ type: CWMSG.NavigateTo, path });
  }
}

const qs = new WikiGameStore();

export default qs;
