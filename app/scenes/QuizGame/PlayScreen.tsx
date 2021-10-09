import React, { useState, useEffect } from "react";
import { Seconds, Milliseconds } from "~/util";
import {
  Screen,
  ScreenContent,
  ScreenContentHeader,
} from "~/components/Screen";
import { Col, Space, Tag, Typography, Input, Button, Row } from "antd";
import {
  ReloadOutlined,
  SettingOutlined as SettingsIcon,
} from "@ant-design/icons";
import { Question } from "~/quizGameTypes";
import { observer } from "mobx-react-lite";
import qs from "~/stores/quizGameStore";
import { t, tfmt } from "~/ln";

interface PlayScreenProps {}

const Play = observer((props: PlayScreenProps) => {
  const questions = qs.questions;
  const reshuffleQuestions = qs.reshuffleQuestions;
  const [userAnswer, setUserAnswer] = useState<string>("");

  useEffect(() => {
    qs.timer.start();
  }, []);

  const onAnswer = () => {
    qs.answer(userAnswer);
  };

  // useEffect(() => {
  //   qs.startGame();
  // }, []);

  useEffect(() => {
    setUserAnswer("");
  }, [qs.currentQuestionIdx]);

  if (qs.isLoading) return <div>Loading...</div>;

  return (
    <Screen title="Playing">
      <ScreenContent>
        <ScreenContentHeader title="Answer">
          <Space>
            <Button
              type="dashed"
              aria-label={t("restart-game")}
              title={t("restart-game")}
              onClick={qs.startGame}
              shape="circle"
              icon={<ReloadOutlined />}
            />
            <Button
              type="dashed"
              aria-label={t("change-settings")}
              title={t("change-settings")}
              shape="circle"
              onClick={qs.gotoSettings}
              icon={<SettingsIcon />}
            />
          </Space>
        </ScreenContentHeader>
        <div className="answer-screen-content">
          <Space direction="vertical" className="question">
            <div>
              <b>{`Question (${qs.currentQuestionIdx}/${qs.questions.length}):`}</b>
            </div>
            <Tag>{qs.currentQuestionParsed.theme}</Tag>
            <Typography.Text>{qs.currentQuestionParsed.text}</Typography.Text>
            {qs.isImageQuestion && (
              <div className="q-image-container flex flex-c">
                <img
                  src={`/questions/Images/${qs.currentQuestionParsed.qimages[0].substr(
                    1
                  )}`}
                  className="mb-2"
                />
              </div>
            )}
          </Space>
          <div>
            <div className="mb-4">
              <div className="df w-100 frr mb-2">
                <Input.TextArea
                  value={userAnswer}
                  placeholder={t("user-input-answer")}
                  onKeyDown={(e) => {
                    if (e.which === 13) {
                      e.preventDefault();
                      onAnswer();
                    }
                  }}
                  className="w-100"
                  onChange={(e) => setUserAnswer(e.target.value)}
                />
              </div>
              <div className="df w-100 jcsp">
                <Typography.Text strong style={{ fontSize: 18 }}>
                  {qs.timer.currentSeconds}
                </Typography.Text>
                <Space>
                  <Button onClick={qs.skipQuestion}>
                    {t("skip-question")}
                  </Button>
                  <Button type="primary" onClick={onAnswer}>
                    {t("answer")}
                  </Button>
                </Space>
              </div>
            </div>
            <div className="df jcsp">
              <div>
                {Array.from(qs.gameSettings.themes).map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
              <div>{tfmt("attempts-remaining", qs.remainingAttempts)}</div>
            </div>
          </div>
        </div>
      </ScreenContent>
    </Screen>
  );
});

export default Play;
