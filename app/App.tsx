import React, { useState } from "react";
import "./App.css";
import { Link, Router, Route, Switch } from "react-router-dom";
import IndexPage from "~/scenes/IndexPage";
import NotFoundPage from "~/scenes/NotFoundPage";
import QuizGame from "~/scenes/QuizGame";
//import WordsGame from "~/scenes/WordsGame";
import Header from "~/components/Header";
import paths from "./paths";
import { Localizator } from "./ln";
import "antd/dist/antd.css";
import { QuizGameStore, StoreContext } from "~/stores";
import history from "~/history";

const App = () => {
  return (
    <Localizator>
      <Router history={history}>
        <div className="app">
          <Header />
          <Switch>
            <Route path={paths.INDEX} exact component={IndexPage} />
            <Route path={paths.QUIZ_GAME} exact component={QuizGame} />
            {/*<Route path={paths.WORDS_GAME} exact component={WordsGame} />*/}
            <Route path="*" component={NotFoundPage} />
          </Switch>
        </div>
      </Router>
    </Localizator>
  );
};

export default App;
