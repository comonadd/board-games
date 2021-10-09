import React, { useEffect, useMemo, useState } from "react";
import { WSocketState, WSocket } from "~/util";
import {
  ScreenContentMax,
  ScreenContentMsg,
  Screen,
  ScreenContent,
} from "~/components/Screen";
import { t } from "~/ln";
import {
  CWMSG,
  GameStateDesc,
  ClientState,
  WordsGameStep,
} from "~/wordsGameTypes";
import GameEndedScreen from "./GameEndedScreen";
import InitialScreen from "./InitialScreen";
import gs from "~/stores/wordsGameStore";
import FailedToConnectScreen from "./FailedToConnectScreen";
import WaitingForPlayersScreen from "./WaitingForPlayersScreen";
import PlayingScreen from "./PlayingScreen";
import StartingScreen from "./StartingScreen";
import ErrorGameInProgressScreen from "./ErrorGameInProgressScreen";
import { observer } from "mobx-react-lite";

const displayActionLog = false;

const JoiningScreen = () => {
  return (
    <Screen title={t("ent-nick")}>
      <ScreenContent className="flex flex-c">{t("joining")}</ScreenContent>
    </Screen>
  );
};

const ConnectingScreen = () => {
  return (
    <Screen title={t("ent-nick")}>
      <ScreenContentMax className="flex flex-c">
        {t("connecting")}
      </ScreenContentMax>
    </Screen>
  );
};

const GameScreen = observer((props: {}) => {
  if (gs.gameState === null) {
    return <div>Loading...</div>;
  }
  return (
    <>
      {gs.gameState.desc === GameStateDesc.WaitingForPlayers && (
        <WaitingForPlayersScreen />
      )}
      {gs.gameState.desc === GameStateDesc.Starting && <StartingScreen />}
      {gs.gameState.desc === GameStateDesc.Playing && <PlayingScreen />}
    </>
  );
});

const WordsGame = observer(() => {
  useEffect(() => {
    gs.resetState();
  }, []);
  if (gs.socket === null || gs.socket.state === WSocketState.Connecting) {
    return <ConnectingScreen />;
  }
  switch (gs.socket.state) {
    case WSocketState.Closed:
      {
        return <FailedToConnectScreen />;
      }
      break;
  }
  switch (gs.step) {
    case WordsGameStep.Initial:
      {
        return <InitialScreen />;
      }
      break;
    case WordsGameStep.ErrorGameInProgress:
      {
        return <ErrorGameInProgressScreen />;
      }
      break;
    case WordsGameStep.Joining:
      {
        return <JoiningScreen />;
      }
      break;
    case WordsGameStep.Playing:
      {
        return <GameScreen />;
      }
      break;
    case WordsGameStep.Ended:
      {
        return <GameEndedScreen />;
      }
      break;
    default: {
      return (
        <div>Invalid state: {gs.step === undefined ? "empty" : gs.step}</div>
      );
    }
  }
});

export default WordsGame;
