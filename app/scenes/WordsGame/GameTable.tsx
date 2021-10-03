import React, { useMemo } from "react";
import Paper from "@material-ui/core/Paper";
import ArrowRightAltIcon from "@material-ui/icons/ArrowRightAlt";
import { WSocket } from "~/util";
import { List } from "immutable";
import { CWMSG, PlayerId, PlayerInfo, ClientState } from "./types";
import TablePlayer from "./TablePlayer";

interface GameTableProps {
  C: ClientState;
  socket: WSocket<CWMSG>;
}

const GameTable = ({ C, socket }: GameTableProps) => {
  const gameState = C.get("gameState");
  const myId = C.get("myId");
  const angle = 360 / gameState.get("players").size;
  const circleSize = 300;
  const playersById = gameState.get("players");
  const players: List<PlayerInfo> = playersById
    ? List(playersById.values())
    : List();
  const playerIdxById = players.reduce(
    (acc: Record<PlayerId, number>, p, idx) => {
      acc[p.get("id")] = idx;
      return acc;
    },
    {}
  );
  const renderedPlayers = useMemo(() => {
    if (players.size === 0) return <div>No players joined yet</div>;
    if (players.size === 1) {
      const pid = players.get(0)!.get("id");
      return (
        <Paper elevation={1} key={pid} className="player-slot">
          <TablePlayer
            player={players.get(0)!}
            playerTurn={gameState.get("whos_turn") === pid}
            C={C}
          />
        </Paper>
      );
    }
    return players.map((player: PlayerInfo, idx) => {
      const pid = player.get("id");
      const p = {
        gameState,
        player,
        playerTurn: gameState.get("whos_turn") === pid,
      };
      // Calculate table position
      const rot = idx * angle;
      const style = {
        transform: `rotate(${rot}deg) translate(${
          circleSize / 2
        }px) rotate(${-rot}deg)`,
      };
      return (
        <Paper elevation={1} key={pid} className="player-slot" style={style}>
          <TablePlayer C={C} {...p} />
        </Paper>
      );
    });
  }, [gameState, myId]);

  const renderedArrow = useMemo(() => {
    const t = gameState.get("whos_turn");
    if (t === undefined || t === null) {
      return null;
    }
    const rot = playerIdxById[gameState.get("whos_turn") as any] * angle;
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
  }, [gameState.get("whos_turn")]);

  return (
    <div className="player-table">
      <div className="player-table-center">
        {gameState.get("particle") && (
          <div className="particle-to-guess">
            {gameState.get("particle")!.toUpperCase()}
          </div>
        )}
        {renderedArrow}
        {renderedPlayers}
      </div>
    </div>
  );
};

export default GameTable;
