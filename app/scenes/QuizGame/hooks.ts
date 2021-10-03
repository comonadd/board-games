import { useState, useEffect } from "react";
import { Theme, Question } from "./types";
import { shuffleArray } from "~/util";
import { QUESTIONS_URL, THEMES_URL } from "~/constants";

export const useQuestions = (themes: Set<Theme>, shuffled: boolean) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const reshuffleQuestions = () => {
    setQuestions(shuffleArray(questions));
  };
  useEffect(() => {
    (async () => {})();
  }, [themes]);
  return { questions, reshuffleQuestions };
};
