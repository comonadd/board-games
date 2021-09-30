import React from "react";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import paths from "./paths";
import { Link } from "react-router-dom";
import { Screen, ScreenContent, ScreenContentHeader } from "./Screen";

const IndexPage = () => {
  return (
    <Screen title="Choose a Game">
      <ScreenContent>
        <ScreenContentHeader title="Choose a game" />
        <List className="index-page-list">
          <ListItem
            className="index-page-list__item"
            component={Paper}
            elevation={1}
          >
            <Link to={paths.QUIZ_GAME} className="mb-2">
              Quiz Game
            </Link>
            <Typography component="p">
              Tortor, id aliquet lectus proin nibh nisl, condimentum id
              venenatis a, condimentum vitae sapien pellentesque habitant morbi
              tristique senectus et netus et malesuada. Interdum velit euismod
              in pellentesque massa placerat.
            </Typography>
          </ListItem>
          <ListItem
            className="index-page-list__item"
            component={Paper}
            elevation={1}
          >
            <Link to={paths.WORDS_GAME} className="mb-2">
              Words Game
            </Link>
            <Typography component="p">
              Fermentum, odio eu feugiat pretium, nibh ipsum consequat nisl, vel
              pretium lectus quam id leo in vitae turpis massa sed elementum
              tempus! Viverra aliquet eget sit amet tellus cras adipiscing?
            </Typography>
          </ListItem>
        </List>
      </ScreenContent>
    </Screen>
  );
};

export default IndexPage;
