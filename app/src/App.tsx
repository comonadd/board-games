import logo from "./logo.svg";
import React, { useCallback, useRef, useState, useEffect } from "react";
import ReactDOM from "react-dom";
import Input from "@material-ui/core/Input";
import "./App.css";
import Card from "@material-ui/core/Card";
import Paper from "@material-ui/core/Paper";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import ReplayIcon from "@material-ui/icons/Replay";
import SettingsIcon from "@material-ui/icons/Settings";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import { version } from "../package.json";
import { Link, BrowserRouter as Router, Route, Switch } from "react-router-dom";
import FavoriteIcon from "@material-ui/icons/Favorite";
import ArrowRightAltIcon from "@material-ui/icons/ArrowRightAlt";
import IndexPage from "./IndexPage";
import NotFoundPage from "./NotFoundPage";
import QuizGame from "./QuizGame";
import WordsGame from "./WordsGame";

const Header = () => {
  return (
    <header className="header">
      <div className="logo flex flex-c">Quiz Game v{version}</div>
      <div>
        <div>
          <Link to="/quiz">Quiz</Link>
        </div>
        <div>
          <Link to="/words">Bomb Party Words</Link>
        </div>
      </div>
    </header>
  );
};

const App = () => {
  return (
    <Router>
      <div className="app">
        <Header />
        <Switch>
          <Route path="/" exact component={IndexPage} />
          <Route path="/quiz" exact component={QuizGame} />
          <Route path="/words" exact component={WordsGame} />
          <Route path="*" component={NotFoundPage} />
        </Switch>
      </div>
    </Router>
  );
};

export default App;