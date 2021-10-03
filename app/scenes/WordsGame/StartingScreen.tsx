import React from "react";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import {
  Screen,
  ScreenContent,
  ScreenContentHeader,
} from "~/components/Screen";
import { t, tfmt } from "~/ln";
import gs from "~/stores/wordsGameStore";
import GameTable from "./GameTable";

const StartingScreen = (props: {}) => {
  const ts = tfmt("starting", gs.gameState.start_timer);
  return (
    <Screen title={ts}>
      <ScreenContent>
        <ScreenContentHeader title={ts} />
        <GameTable />
      </ScreenContent>
    </Screen>
  );
};

export default StartingScreen;
