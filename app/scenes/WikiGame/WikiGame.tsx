import React from "react";
import wikiStore from "~/stores/wikiStore";
import { observer } from "mobx-react-lite";
import { Screen, ScreenContentMax } from "~/components/Screen";
import { Button, Space, Col, Card, Typography, Row } from "antd";

const WikiGame = observer(() => {
  const articleContent = wikiStore.article;
  const game = (() => {
    return (
      <Screen title="Wiki Game">
        <Typography.Title className="screen-title">Playing</Typography.Title>
        <ScreenContentMax>{articleContent}</ScreenContentMax>
      </Screen>
    );
  })();
  return game;
});

export default WikiGame;
