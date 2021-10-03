import React, { useState } from "react";
import Input from "@material-ui/core/Input";
import Button from "@material-ui/core/Button";
import { Screen, ScreenContentMax } from "~/components/Screen";
import { t } from "~/ln";
import { generateInitialNickname } from "~/util";
import gs from "~/stores/wordsGameStore";
import { observer } from "mobx-react-lite";

const InitialScreen = observer((props: {}) => {
  const [nickname, setNickname] = useState<string>(generateInitialNickname());
  const canJoin = nickname.length !== 0;
  const join = () => gs.join(nickname);
  return (
    <Screen title={t("ent-nick")}>
      <ScreenContentMax className="flex flex-c">
        <div>
          <Input
            onChange={(e) => setNickname(e.target.value)}
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
      </ScreenContentMax>
    </Screen>
  );
});

export default InitialScreen;
