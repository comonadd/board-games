import React from "react";
import { Screen } from "~/components/Screen";
import { cn } from "~/util";
import { Button, Space, Col, Card, Typography, Row } from "antd";
import { useStore } from "~/stores";
import { observer } from "mobx-react-lite";
import quizGameStore from "~/stores/quizGameStore";
import gameSettingsStore from "~/stores/gameSettingsStore";
import { t } from "~/ln";

const ConfigurationScreen = observer((props: {}) => {
  const qs = quizGameStore;
  const canStart = gameSettingsStore.themes.size !== 0;
  return (
    <Screen title={t("configure-game")}>
      <Typography.Title className="screen-title">
        {t("select-themes")}
      </Typography.Title>
      <Space className="theme-grid">
        <Row gutter={[4, 4]}>
          {qs.themes.map((theme) => {
            //const background = randomCSSColor();
            const isSelected = gameSettingsStore.themes.has(theme);
            return (
              <Col
                key={theme}
                xs={{ span: 12 }}
                md={{ span: 6 }}
                xl={{ span: 4 }}
              >
                <Card
                  className={cn({
                    "theme-card": true,
                    "theme-card_selected": isSelected,
                  })}
                  onClick={() => {
                    if (!isSelected) {
                      gameSettingsStore.selectTheme(theme);
                    } else {
                      gameSettingsStore.deselectTheme(theme);
                    }
                  }}
                >
                  {theme}
                </Card>
              </Col>
            );
          })}
        </Row>
      </Space>
      <Button
        disabled={!canStart}
        onClick={qs.startGame}
        size="large"
        color="primary"
      >
        {t("start-quiz")}
      </Button>
    </Screen>
  );
});

export default ConfigurationScreen;
