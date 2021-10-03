import React from "react";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import { Screen } from "~/components/Screen";
import { t } from "~/ln";
import gs from "~/stores/wordsGameStore";

const ErrorGameInProgressScreen = (props: {}) => {
  return (
    <Screen title={t("in-game")}>
      <Paper elevation={1} className="screen-msg">
        <div className="mb-4">{t("in-game")}</div>
        <Button onClick={gs.retryConnect} variant="contained" color="primary">
          {t("try-again")}
        </Button>
      </Paper>
    </Screen>
  );
};

export default ErrorGameInProgressScreen;
