import React from "react";
import { HeartOutlined } from "@ant-design/icons";
import { Size } from "~/types";

const sizeToPixEq: Record<Size, number> = {
  [Size.Small]: 12,
  [Size.Medium]: 16,
  [Size.Large]: 20,
};

const PlayerHearts = React.memo((props: { size: Size; n: number }) => {
  const { n, size } = props;
  let hearts = [];
  const hsize = sizeToPixEq[size];
  for (let i = 0; i < n; ++i) {
    hearts.push(<HeartOutlined style={{ fontSize: hsize }} key={i} />);
  }
  return <div className="player-hearts">{hearts}</div>;
});

export default PlayerHearts;
