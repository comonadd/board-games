import React from "react";
import qs from "~/stores/quizGameStore";
import { Step } from "~/quizGameTypes";
import Play from "./PlayScreen";
import ConfigurationScreen from "./ConfigurationScreen";
import FinishedScreen from "./FinishedScreen";
import { observer } from "mobx-react-lite";

const QuizGame = observer(() => {
  const game = (() => {
    switch (qs.step) {
      case Step.Playing:
        {
          return <Play />;
        }
        break;
      case Step.Finished:
        {
          return <FinishedScreen />;
        }
        break;
      case Step.ConfiguringGame:
        {
          return <ConfigurationScreen />;
        }
        break;
      default:
        {
          return null;
        }
        break;
    }
  })();
  return game;
});

export default QuizGame;
