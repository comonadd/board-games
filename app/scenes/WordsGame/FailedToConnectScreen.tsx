import React from "react";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";

import { Screen } from "~/components/Screen";
import { t } from "~/ln";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import ws from "~/stores/wordsGameStore";

const FailedToConnectScreen = (props: {}) => {
  const title = t("failed-to-connect");
  return (
    <Screen title={title}>
      <Paper elevation={1} className="screen-msg">
        <div className="screen-msg-title">
          <ErrorOutlineIcon
            style={{ fontSize: 30, color: "grey" }}
            className="mr-2"
          />
          <div>Something went wrong</div>
        </div>
        <div className="fcg fs-18">{t("failed-to-connect")}</div>
        <Button
          onClick={ws.retryConnect}
          variant="contained"
          color="primary"
          size="large"
          className="w-100 mt-4"
        >
          {t("try-again")}
        </Button>
      </Paper>
    </Screen>
  );
};

export default FailedToConnectScreen;
