import React from "react";
import { Button, Typography } from "antd";
import { Screen, ScreenContentMsg } from "~/components/Screen";
import { t, tfmt } from "~/ln";
import gs from "~/stores/wordsGameStore";

interface GameEndedScreenProps {}

const GameEndedScreen = (props: GameEndedScreenProps) => {
  const winner = gs.winner;
  const myId = gs.myId;
  return (
    <Screen title="Game Ended">
      <ScreenContentMsg className="p-4">
        <div className="mb-4">
          <Typography.Text>
            {winner
              ? winner.id === myId
                ? t("game-ended-me")
                : tfmt("game-ended", winner.nickname)
              : "N/A"}
          </Typography.Text>
        </div>
        <Button
          onClick={gs.rejoin}
          color="primary"
          type="primary"
          className="ph-16 w-auto"
        >
          {t("rejoin")}
        </Button>
      </ScreenContentMsg>
    </Screen>
  );
};

export default GameEndedScreen;
