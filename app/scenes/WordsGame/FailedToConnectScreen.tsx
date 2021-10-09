import React from "react";
import { Space, Col, Row, Card, Typography, Button } from "antd";
import {
  ScreenContentHeader,
  Screen,
  ScreenContentMsg,
} from "~/components/Screen";
import { t } from "~/ln";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import WarningOutlined from "@ant-design/icons/WarningOutlined";
import ws from "~/stores/wordsGameStore";

const FailedToConnectScreen = (props: {}) => {
  const title = t("failed-to-connect");
  return (
    <Screen title={title}>
      <Card
        title={<Typography.Text strong>Something went wrong</Typography.Text>}
        className="screen-msg"
      >
        <Space>
          <WarningOutlined style={{ fontSize: 36 }} />
          <Row>
            <Col xs={24}>{title}</Col>
            <Col xs={24}>
              <a onClick={ws.retryConnect}>{t("try-again")}</a>
            </Col>
          </Row>
        </Space>
      </Card>
    </Screen>
  );
};

export default FailedToConnectScreen;
