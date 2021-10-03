import { createContext } from "react";
import { GameSettings } from "./types";

interface IQuizGameCtx {
  gameSettings: GameSettings;
  updateSettings: (gs: GameSettings) => void;
}

const QuizGameCtx = createContext<IQuizGameCtx>({} as any);

export default QuizGameCtx;
