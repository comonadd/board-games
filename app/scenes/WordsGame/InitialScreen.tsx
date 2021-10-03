import React from "react";
import Input from "@material-ui/core/Input";
import Button from "@material-ui/core/Button";
import { Screen, ScreenContent } from "~/components/Screen";
import { t } from "~/ln";

const InitialScreen = (props: {
  nickname: string;
  onChange: (v: any) => void;
  join: () => void;
}) => {
  const { nickname, onChange, join } = props;
  const canJoin = nickname.length !== 0;
  return (
    <Screen title={t("ent-nick")}>
      <ScreenContent className="flex flex-c">
        <div>
          <Input
            onChange={onChange}
            value={nickname}
            placeholder="Nickname"
            className="mr-2"
            onKeyDown={(e) => {
              if (e.keyCode === 13 && canJoin) join();
            }}
          />
          <Button
            disabled={!canJoin}
            onClick={join}
            variant="contained"
            color="primary"
          >
            {t("join")}
          </Button>
        </div>
      </ScreenContent>
    </Screen>
  );
};

export default InitialScreen;
