import React from "react";
import { List } from "antd";
import {
  SearchOutlined,
  FileTextOutlined,
  QuestionOutlined,
} from "@ant-design/icons";
import paths from "~/paths";
import { Link } from "react-router-dom";
import {
  Screen,
  ScreenContent,
  ScreenContentHeader,
} from "~/components/Screen";

const IndexPage = () => {
  return (
    <Screen title="Choose a Game">
      <ScreenContent>
        <ScreenContentHeader title="Choose a game" />
        <List className="index-page-list" itemLayout="vertical">
          <List.Item className="index-page-list__item">
            <List.Item.Meta
              avatar={<QuestionOutlined style={{ fontSize: 24 }} />}
              title={<Link to={paths.QUIZ_GAME}>Quiz Game</Link>}
              description={`Try to answer as many thematic questions as possible!`}
            />
          </List.Item>
          <List.Item className="index-page-list__item">
            <List.Item.Meta
              avatar={<FileTextOutlined style={{ fontSize: 24 }} />}
              title={
                <Link to={paths.WORDS_GAME} className="mb-2">
                  Words Game
                </Link>
              }
              description={`At least two players required. You start with some lives and take turns and the game asks you to find a word that contains the given part. If you answer, you lose one life. If you win, it's the next player's turn. If you use all letters in the alphabet, one life is restore in the alphabet, one life is restored.`}
            />
          </List.Item>
          <List.Item className="index-page-list__item">
            <List.Item.Meta
              avatar={<SearchOutlined style={{ fontSize: 24 }} />}
              title={
                <Link to={paths.WIKI_GAME} className="mb-2">
                  Wiki Game
                </Link>
              }
              description={`Currently only Single player. Try to find a path from one Wiki article to another as fast as possible.`}
            />
          </List.Item>
        </List>
      </ScreenContent>
    </Screen>
  );
};

export default IndexPage;
