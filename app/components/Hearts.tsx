import React from "react";
import { HeartOutlined } from "@ant-design/icons";

const PlayerHearts = React.memo(({ n }: { n: number }) => {
  let hearts = [];
  for (let i = 0; i < n; ++i) {
    hearts.push(<HeartOutlined key={i} />);
  }
  return <div className="player-hearts">{hearts}</div>;
});

export default PlayerHearts;
