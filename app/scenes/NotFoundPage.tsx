import React from "react";
import { Typography, Button, Space } from "antd";
import {
  Screen,
  ScreenContent,
  ScreenContentHeader,
} from "~/components/Screen";
import history from "~/history";

const NotFoundPage = () => {
  return (
    <Screen title="Page not found">
      <ScreenContent>
        <Space className="w-100" direction="vertical">
          <Typography.Text className="df fch" strong style={{ fontSize: 24 }}>
            Page not found
          </Typography.Text>
          <Space className="df fch w-100">
            <Button onClick={() => history.push("/")}>
              Go to the home page
            </Button>
          </Space>
        </Space>
      </ScreenContent>
    </Screen>
  );
};

export default NotFoundPage;
