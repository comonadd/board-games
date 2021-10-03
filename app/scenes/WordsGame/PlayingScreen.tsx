import React, { useRef, useState, useEffect } from "react";
import Input from "@material-ui/core/Input";
import Paper from "@material-ui/core/Paper";
import { cn } from "~/util";
import {
  Screen,
  ScreenContent,
  ScreenContentHeader,
} from "~/components/Screen";
import { t } from "~/ln";
import GameTable from "./GameTable";
import gs from "~/stores/wordsGameStore";

const UsedLettersTable = () => {
  const lettersLeftList = gs.myPlayer !== null ? gs.myPlayer.letters_left : [];
  let allLetters = gs.gameState.all_letters;
  const lettersLeft = new Set(lettersLeftList);
  return (
    <div className="wletter-table">
      {allLetters.map((letter: number) => {
        const ch = String.fromCharCode(letter);
        return (
          <Paper
            key={letter}
            elevation={1}
            className={cn({
              wletter: true,
              wletter_used: !lettersLeft.has(letter),
            })}
          >
            {ch}
          </Paper>
        );
      })}
    </div>
  );
};

const PlayingScreen = (props: {}) => {
  const gameState = gs.gameState;
  const myId = gs.myId;

  // Input
  const [userInput, setUserInput] = useState<string>("");
  const updateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };
  const submitGuess = () => {
    gs.submitGuess(userInput);
    setUserInput("");
  };

  useEffect(() => {
    if (gs.myTurn) {
      gs.updateUserInput(userInput);
    }
  }, [userInput]);

  // Auto-focus on current player's turn
  const myInputRef = useRef<any>(null);
  useEffect(() => {
    if (!gs.myTurn) {
      gs.resetWrongGuess();
      return;
    }
    // Reset user input before each turn, then focus on it
    setUserInput("");
    if (myInputRef.current === null) {
      console.warn("Input reference is null, can't focus");
      return;
    }
    myInputRef.current.focus();
  }, [gs.myTurn]);

  return (
    <Screen title="Playing">
      <ScreenContent>
        <ScreenContentHeader title={t("in-game")} />
        <GameTable {...props} />
        <Input
          disabled={!gs.myTurn}
          className={cn({
            "user-input": true,
            "user-input_wrong": gs.myTurn && gs.wrongGuess,
          })}
          value={userInput}
          placeholder={t("user-input-answer")}
          inputRef={myInputRef}
          onChange={updateInput}
          onKeyDown={(e) => {
            if (e.keyCode === 13) {
              submitGuess();
            }
          }}
        />
      </ScreenContent>
      <UsedLettersTable />
    </Screen>
  );
};

export default PlayingScreen;
