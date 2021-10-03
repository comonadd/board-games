import React, { useState, useEffect } from "react";
import { Seconds, Milliseconds } from "~/util";
import {
  Screen,
  ScreenContent,
  ScreenContentHeader,
} from "~/components/Screen";
import { List, Col, Space, Tag, Typography, Input, Button, Row } from "antd";
import {
  ReloadOutlined,
  SettingOutlined as SettingsIcon,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useStore } from "~/stores";
import { Question } from "~/quizGameTypes";
import { observer } from "mobx-react-lite";
import qs from "~/stores/quizGameStore";

const FinishedScreen = observer(() => {
  const allAnswered = qs.properAnsweredQuestions === qs.questions.length;
  const title = allAnswered
    ? "You answered all questions correctly!"
    : `You answered ${qs.properAnsweredQuestions}/${qs.questions.length} questions correctly`;
  return (
    <Screen title={title}>
      <ScreenContent>
        <ScreenContentHeader title={title}></ScreenContentHeader>
        <div>
          <List header={<div>Your answers</div>} footer={<div></div>}>
            {Array.from(qs.quizProgress.entries()).map(([idx, qs]) => {
              return (
                <List.Item
                  key={idx}
                  style={{ color: qs.correct ? "green" : "red" }}
                  className="question-status"
                >
                  <Space>
                    <div className="question-status__icon">
                      {qs.correct ? <CheckOutlined /> : <CloseOutlined />}
                    </div>
                    <div className="df fc">
                      <div style={{ color: "green" }}>
                        Correct answer: {qs.question.answers[0]}
                      </div>
                      <div>
                        {qs.userAnswer
                          ? `You answered: ${qs.userAnswer}`
                          : "You gave no answer"}
                      </div>
                    </div>
                  </Space>
                </List.Item>
              );
            })}
          </List>
        </div>
        <Space>
          <Button type="primary" onClick={qs.startGame} size="large">
            Play again
          </Button>
          <Button size="large" onClick={qs.gotoSettings}>
            Change settings
          </Button>
        </Space>
      </ScreenContent>
    </Screen>
  );
});

export default FinishedScreen;
