export type Theme = string;

export enum GameMode {
  Normal = 0,
}

export interface Question {
  text: string;
  answers: string[];
  qimages: string[];
  aimages: string[];
  wrong_options: string[];
}

export interface QuestionWithTheme extends Question {
  theme: Theme;
}

export enum Step {
  ConfiguringGame = 0,
  Playing = 1,
  Finished = 2,
}
