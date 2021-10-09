import React from "react";
import cn from "classnames";
import { PlayerInfo, ClientState } from "~/wordsGameTypes";
import PlayerHearts from "~/components/Hearts";
import { t } from "~/ln";
import { Size } from "~/types";
import { Avatar } from "antd";
import UserOutlined from "@ant-design/icons/UserOutlined";
import wg from "~/stores/wordsGameStore";

const PlayerAvatar = (props: { player: PlayerInfo }) => {
  return <Avatar size={48} icon={<UserOutlined />} />;
};

interface OtherTablePlayerProps {
  player: PlayerInfo;
  playerTurn: boolean;
}

// {me && (
//   <span style={{ fontSize: 12, position: "absolute", top: 6, right: 6 }}>
//     (You)
//   </span>
// )}
//
const TablePlayer = (props: OtherTablePlayerProps) => {
  const { player, playerTurn } = props;
  const dead = player.lives_left === 0;
  const input = player.input;
  const nick = `${player.nickname}`;
  const me = player.id === wg.myId;
  return (
    <div
      className={cn({
        player: true,
        player_dead: dead,
        player_turn: playerTurn,
        player_me: me,
      })}
    >
      <PlayerAvatar player={player} />
      <div className="player-nickname">{nick}</div>
      <PlayerHearts size={Size.Medium} n={player.lives_left} />
      {input && <div className="player-input mt-2">{input}</div>}
    </div>
  );
};

export default TablePlayer;
