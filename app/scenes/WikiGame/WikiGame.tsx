import React from "react";
import wikiStore, { WGameStep } from "~/stores/wikiStore";
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
  if (wikiStore.step === WGameStep.EndGame) {
    return <div>You finished at {wikiStore.player!.place}th place</div>;
  }
  const game = (() => {
    return (
      <Screen title="Wiki Game">
        <Typography.Title className="screen-title">Playing</Typography.Title>
        <ScreenContentMax>
          {wikiStore.loading ? (
            <div>Loading...</div>
          ) : (
            <>
              <div>Target is: {wikiStore.targetArticle}</div>
              <Typography.Title>{wikiStore.currArticle!.title}</Typography.Title>
              {articleContent !== null && (
                <div
                  className="article-content"
                  dangerouslySetInnerHTML={{ __html: articleContent.content }}
                  onClick={interceptNavigation}
                />
              )}
            </>
          )}
        </ScreenContentMax>
      </Screen>
    );
  })();
  return game;
});

export default WikiGame;
