import React from "react";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import { Screen, ScreenContent } from "~/components/Screen";
import { t, tfmt } from "~/ln";
import gs from "~/stores/wordsGameStore";

interface GameEndedScreenProps {}

const GameEndedScreen = (props: GameEndedScreenProps) => {
  const winner = gs.winner;
  const myId = gs.myId;
  return (
    <Screen title="Game Ended">
      <ScreenContent className="flex flex-col game-ended-message flex flex-c">
        <div className="mb-4">
          <Typography component="h1" variant="h5">
            {winner
              ? winner.id === myId
                ? t("game-ended-me")
                : tfmt("game-ended", winner.nickname)
              : "N/A"}
          </Typography>
        </div>
        <Button
          onClick={gs.rejoin}
          color="primary"
          variant="contained"
          size="large"
          className="ph-16"
        >
          <Typography component="p" variant="body1" className="fs-16">
            {t("join")}
          </Typography>
        </Button>
      </ScreenContent>
    </Screen>
  );
};

export default GameEndedScreen;
