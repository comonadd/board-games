import React from "react";
import { Link } from "react-router-dom";
import { Layout, Menu } from "antd";
import history from "~/history";
import Logo from "~/components/Logo";
import paths from "~/paths";


  const Header = () => {
  return (
    <Layout.Header className="header">
      <Logo />
      <div className="fd" />
      <Menu
        theme="dark"
        mode="horizontal"
        className="navigation"
        disabledOverflow
      >
        <Menu.Item key="1">
          <Link to={paths.QUIZ_GAME} className="nav-item">
            Quiz
          </Link>
        </Menu.Item>
        <Menu.Item key="2">
          <Link to={paths.WORDS_GAME} className="nav-item">
            Bomb Party Words
          </Link>
        </Menu.Item>
      </Menu>
    </Layout.Header>
  );
};

export default Header;
