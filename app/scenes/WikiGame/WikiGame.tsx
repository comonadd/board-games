import React from "react";
import wikiStore from "~/stores/wikiStore";
import { observer } from "mobx-react-lite";
import { Screen, ScreenContentMax } from "~/components/Screen";
import { Button, Space, Col, Card, Typography, Row } from "antd";

const WikiGame = observer(() => {
  const articleContent = wikiStore.currArticle;
  // intercept link click if it points to another wiki article
  const interceptNavigation = (event: React.SyntheticEvent<any>) => {
    const isLink = event.target.tagName === "A";
    if (isLink && event.target.pathname.startsWith("/wiki/")) {
      event.preventDefault();
      wikiStore.navigateTo(event.target.pathname);
    }
  };
  const game = (() => {
    return (
      <Screen title="Wiki Game">
        <Typography.Title className="screen-title">Playing</Typography.Title>
        <ScreenContentMax>
          {articleContent !== null && (
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: articleContent }}
              onClick={interceptNavigation}
            />
          )}
        </ScreenContentMax>
      </Screen>
    );
  })();
  return game;
});

export default WikiGame;
