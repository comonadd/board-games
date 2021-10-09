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
import { observer } from "mobx-react-lite";

const WaitingForPlayersScreen = observer((props: {}) => {
  return (
    <Screen title={t("waiting-players")}>
      <ScreenContent style={{ backgroundColor: "transparent" }}>
        <ScreenContentHeader
          title={tfmt(
            "waiting-players",
            gs.playersInLobby,
            MIN_PLAYERS_FOR_GAME
          )}
        />
        <GameTable />
      </ScreenContent>
    </Screen>
  );
});

export default WaitingForPlayersScreen;
