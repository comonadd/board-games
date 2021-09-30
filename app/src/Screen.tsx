import React, { useEffect } from "react";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import { cn } from "./util";

export const Screen = (props: { title: string; children: any }) => {
  useEffect(() => {
    document.title = props.title;
  }, [props.title]);
  return <div className="screen">{props.children}</div>;
};

export const ScreenContent = (props: { children: any; className?: string }) => {
  return (
    <Paper elevation={2} className={cn(["screen-content", props.className])}>
      {props.children}
    </Paper>
  );
};

export const ScreenContentHeader = (props: {
  title: string;
  children?: any;
}) => {
  return (
    <div className="screen-content-header">
      <div className="flex flex-c flex-100">
        <Typography variant="h5" component="h2">
          {props.title}
        </Typography>
      </div>
      {props.children}
    </div>
  );
};
