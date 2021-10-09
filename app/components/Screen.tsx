import React, { useEffect } from "react";
import { Card, Typography } from "antd";
import { cn } from "~/util";

export const Screen = (props: { title: string; children: any }) => {
  useEffect(() => {
    document.title = props.title;
  }, [props.title]);
  return <div className="screen">{props.children}</div>;
};

export const ScreenContent = (props: {
  children: any;
  style?: Record<string, any>;
  className?: string;
}) => {
  return (
    <Card
      bordered
      style={props.style ?? {}}
      className={cn(["screen-content", props.className])}
    >
      {props.children}
    </Card>
  );
};

export const ScreenContentMsg = (props: {
  children: any;
  className?: string;
}) => {
  return (
    <Card size="small" bordered className={cn(["screen-msg", props.className])}>
      {props.children}
    </Card>
  );
};

export const ScreenContentPrompt = ScreenContentMsg;

export const ScreenContentMax = (props: {
  children: any;
  className?: string;
}) => {
  return (
    <ScreenContent
      {...props}
      className={cn([props.className, "screen-content-max"])}
    />
  );
};

export const ScreenContentHeader = (props: {
  title: string;
  children?: any;
  className?: string;
}) => {
  return (
    <div
      className={cn([
        "screen-content-header flex flex-100 flex-c",
        props.className,
      ])}
    >
      <Typography.Title>{props.title}</Typography.Title>
      {props.children}
    </div>
  );
};
