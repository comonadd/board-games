import React from "react";
import cn from "classnames";
import { PlayerInfo, ClientState } from "./types";
import PlayerHearts from "~/components/Hearts";
import { t } from "~/ln";

interface OtherTablePlayerProps {
  player: PlayerInfo;
  playerTurn: boolean;
  C: ClientState;
}

const TablePlayer = (props: OtherTablePlayerProps) => {
  const { C, player, playerTurn } = props;
  const myId = C.get("myId");
  const dead = player.get("lives_left") === 0;
  const input = player.get("input");
  const nick = `${player.get("nickname")} (${t("you")})`;
  return (
    <div
      className={cn({
        player: true,
        player_dead: dead,
        player_turn: playerTurn,
      })}
    >
      <div className="player-nickname">{nick}</div>
      <PlayerHearts n={player.get("lives_left")} />
      {input && <div className="player-input mt-2">{input}</div>}
    </div>
  );
};

export default TablePlayer;
