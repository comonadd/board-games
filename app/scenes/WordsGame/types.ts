import { Map, List } from "immutable";

export enum CWMSG {
  Joining = 0,
  UpdateInput = 1,
  SubmitGuess = 2,
}

export enum SWMSG {
  InitGame = 0,
  UpdateGameState = 1,
  EndGame = 2,
  GameInProgress = 3,
  UserInput = 4,
  PlayerJoined = 5,
  RemovePlayer = 6,
  WrongGuess = 7,
}

export type PlayerId = string;

export enum GameStateDesc {
  WaitingForPlayers = 0,
  Playing = 1,
  Starting = 2,
}

export interface ImmutableMap<T> extends Map<string, any> {
  get<K extends keyof T>(name: K): T[K];
}

export type PlayerInfo = ImmutableMap<{
  nickname: string;
  lives_left: number;
  input: string;
  id: PlayerId;
  letters_left: number[];
}>;

export type PlayerInfoById = Map<PlayerId, PlayerInfo>;

export type GameState = ImmutableMap<{
  players: PlayerInfoById;
  whos_turn: PlayerId;
  start_timer: number;
  particle: string | null;
  desc: GameStateDesc;
  last_player_to_answer: PlayerId | null;
  all_letters: number[];
}>;

export enum WordsGameStep {
  Initial = 0,
  Joining = 1,
  Playing = 2,
  Ended = 3,
  ErrorGameInProgress = 4,
}

export interface ClientMessage extends Record<string, any> {
  type: CWMSG;
}

export interface ServerMessage extends Record<string, any> {
  type: SWMSG;
}

export enum ActionType {
  ServerMessage = 0,
  ResetState = 1,
  SetStep = 2,
  ResetWrongGuess = 3,
}

export interface ClientAction {
  type: ActionType;
  payload?: any;
}

export type ClientState = ImmutableMap<{
  step: WordsGameStep;
  gameState: GameState;
  myId: PlayerId | null;
  winner: PlayerInfo | null;
  wrongGuess: boolean;
}>;
