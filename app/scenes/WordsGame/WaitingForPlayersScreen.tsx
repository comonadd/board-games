import React from "react";
import {
  Screen,
  ScreenContent,
  ScreenContentHeader,
} from "~/components/Screen";
import { MIN_PLAYERS_FOR_GAME } from "~/constants";
import { t, tfmt } from "~/ln";
import GameTable from "./GameTable";
import gs from "~/stores/wordsGameStore";

const WaitingForPlayersScreen = (props: {}) => {
  return (
    <Screen title={t("waiting-players")}>
      <ScreenContent>
        <ScreenContentHeader
          title={tfmt(
            "waiting-players",
            gs.gameState.players.size,
            MIN_PLAYERS_FOR_GAME
          )}
        />
        <GameTable />
      </ScreenContent>
    </Screen>
  );
};

export default WaitingForPlayersScreen;
