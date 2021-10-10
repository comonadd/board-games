import React from "react";
import { version } from "~/../package.json";
import history from "~/history";

const Logo = () => (
  <div className="logo flex flex-c" onClick={() => history.push("/")}>
    Quiz Game v{version}
  </div>
);

export default Logo;
