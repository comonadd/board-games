import React from "react";
import { version } from "~/../package.json";
import { Link } from "react-router-dom";
import { Layout, Menu } from "antd";

const Header = () => {
  return (
    <Layout.Header className="header">
      <div className="logo flex flex-c">Quiz Game v{version}</div>
      <div className="fd" />
      <Menu theme="dark" mode="horizontal" className="navigation" disabledOverflow>
        <Menu.Item key="1">
          <Link to="/quiz" className="nav-item">
            Quiz
          </Link>
        </Menu.Item>
        <Menu.Item key="2">
          <Link to="/words" className="nav-item">
            Bomb Party Words
          </Link>
        </Menu.Item>
      </Menu>
    </Layout.Header>
  );
};

export default Header;
