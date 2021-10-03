import React from "react";
import cn from "classnames";
import { PlayerInfo, ClientState } from "~/wordsGameTypes";
import PlayerHearts from "~/components/Hearts";
import { t } from "~/ln";

interface OtherTablePlayerProps {
  player: PlayerInfo;
  playerTurn: boolean;
}

const TablePlayer = (props: OtherTablePlayerProps) => {
  const { player, playerTurn } = props;
  const dead = player.lives_left === 0;
  const input = player.input;
  const nick = `${player.nickname} (${t("you")})`;
  return (
    <div
      className={cn({
        player: true,
        player_dead: dead,
        player_turn: playerTurn,
      })}
    >
      <div className="player-nickname">{nick}</div>
      <PlayerHearts n={player.lives_left} />
      {input && <div className="player-input mt-2">{input}</div>}
    </div>
  );
};

export default TablePlayer;
