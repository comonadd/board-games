import React, { useState } from "react";
import { Space, Row, Col, Button, Input } from "antd";
import {
  ScreenContentHeader,
  Screen,
  ScreenContentPrompt,
} from "~/components/Screen";
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
      <ScreenContentPrompt className="flex flex-c p-4">
        <ScreenContentHeader title="Enter game" className="flex-s pv-2" />
        <Row>
          <Space>
            <Col xs={24}>
              <Input
                onChange={(e) => setNickname(e.target.value)}
                value={nickname}
                placeholder="Nickname"
                className="mr-2"
                onKeyDown={(e) => {
                  if (e.keyCode === 13 && canJoin) join();
                }}
              />
            </Col>
            <Col xs={24}>
              <Button
                disabled={!canJoin}
                onClick={join}
                type="primary"
                color="primary"
              >
                {t("join")}
              </Button>
            </Col>
          </Space>
        </Row>
      </ScreenContentPrompt>
    </Screen>
  );
});

export default InitialScreen;
