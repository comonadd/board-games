import React, { useMemo } from "react";
import { Card } from "antd";
import ArrowRightAltIcon from "@material-ui/icons/ArrowRightAlt";
import { WSocket } from "~/util";
import { List } from "immutable";
import { CWMSG, PlayerId, PlayerInfo, ClientState } from "~/wordsGameTypes";
import TablePlayer from "./TablePlayer";
import gs from "~/stores/wordsGameStore";
import { observer } from "mobx-react-lite";

interface GameTableProps {}

const GameTable = observer((props: GameTableProps) => {
  const gameState = gs.gameState;
  const myId = gs.myId;
  const playersById = gameState.players;
  const players: PlayerInfo[] = Object.values(playersById);
  const angle = 360 / players.length;
  const circleSize = 300;
  const playerIdxById = players.reduce(
    (acc: Record<PlayerId, number>, p, idx) => {
      acc[p.id] = idx;
      return acc;
    },
    {}
  );
  const renderedPlayers = useMemo(() => {
    if (players.length === 0) return <div>No players joined yet</div>;
    if (players.length === 1) {
      const firstPlayer = players[0];
      const pid = firstPlayer!.id;
      return (
        <div key={pid} className="player-slot">
          <TablePlayer
            player={firstPlayer!}
            playerTurn={gameState["whos_turn"] === pid}
          />
        </div>
      );
    }
    return players.map((player: PlayerInfo, idx) => {
      const pid = player["id"];
      const p = {
        gameState,
        player,
        playerTurn: gameState["whos_turn"] === pid,
      };
      // Calculate table position
      const rot = idx * angle;
      const style = {
        transform: `rotate(${rot}deg) translate(${
          circleSize / 2
        }px) rotate(${-rot}deg)`,
      };
      return (
        <div elevation={1} key={pid} className="player-slot" style={style}>
          <TablePlayer {...p} />
        </div>
      );
    });
  }, [gameState, myId]);

  const renderedArrow = useMemo(() => {
    const t = gameState["whos_turn"];
    if (t === undefined || t === null) {
      return null;
    }
    const rot =
      gameState.whos_turn !== null
        ? playerIdxById[gameState.whos_turn] * angle
        : 0;
    const style = {
      transform: `rotate(${rot}deg)`,
    };
    return (
      <div className="wg-turn-arrow" style={style}>
        <ArrowRightAltIcon
          style={{
            fontSize: 80,
          }}
        />
      </div>
    );
  }, [gameState.whos_turn]);

  const particle = gameState.particle;

  return (
    <div className="player-table">
      <div className="player-table-center">
        {particle && (
          <div className="particle-to-guess">{particle!.toUpperCase()}</div>
        )}
        {renderedArrow}
        {renderedPlayers}
      </div>
    </div>
  );
});

export default GameTable;
