import React, { useEffect } from "react";
import { Card, Typography } from "antd";
import { cn } from "~/util";

export const Screen = (props: { title: string; children: any }) => {
  useEffect(() => {
    document.title = props.title;
  }, [props.title]);
  return <div className="screen">{props.children}</div>;
};

export const ScreenContent = (props: { children: any; className?: string }) => {
  return (
    <Card bordered className={cn(["screen-content", props.className])}>
      {props.children}
    </Card>
  );
};

export const ScreenContentHeader = (props: {
  title: string;
  children?: any;
}) => {
  return (
    <div className="screen-content-header">
      <div className="flex flex-c flex-100">
        <Typography.Title>{props.title}</Typography.Title>
      </div>
      {props.children}
    </div>
  );
};
