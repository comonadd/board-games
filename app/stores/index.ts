import { createContext, useContext } from "react";
import QuizGameStore from "./quizGameStore";
export { default as QuizGameStore } from "./quizGameStore";

interface IStoreContext {
  quizGameStore: QuizGameStore;
}

export const StoreContext = createContext<IStoreContext>({} as any);

export const useStore = () => useContext(StoreContext);
