import React, { useReducer, useMemo, useRef, useState, useEffect } from "react";
import Input from "@material-ui/core/Input";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import ArrowRightAltIcon from "@material-ui/icons/ArrowRightAlt";
import Grid from "@material-ui/core/Grid";
import {
  generateInitialNickname,
  cn,
  WSocketState,
  WSocket,
  useWSocket,
} from "~/util";
import {
  Screen,
  ScreenContent,
  ScreenContentHeader,
} from "~/components/Screen";
import { MIN_PLAYERS_FOR_GAME, WS_WORDS_API_URL } from "~/constants";
import { t, tfmt } from "~/ln";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import Immutable, { Map, List } from "immutable";
import {
  CWMSG,
  SWMSG,
  PlayerId,
  GameStateDesc,
  ImmutableMap,
  PlayerInfo,
  ClientState,
  GameState,
} from "./types";

interface GameEndedScreenProps {
  join: () => void;
  C: ClientState;
}

const GameEndedScreen = ({ join, C }: GameEndedScreenProps) => {
  const winner = C.get("winner");
  const myId = C.get("myId");
  return (
    <Screen title="Game Ended">
      <ScreenContent className="flex flex-col game-ended-message flex flex-c">
        <div className="mb-4">
          <Typography component="h1" variant="h5">
            {winner
              ? winner.get("id") === myId
                ? t("game-ended-me")
                : tfmt("game-ended", winner.get("nickname"))
              : "N/A"}
          </Typography>
        </div>
        <Button
          onClick={join}
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
