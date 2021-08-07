import { useEffect } from "react";

const Screen = (props: { title: string; children: any }) => {
  useEffect(() => {
    document.title = props.title;
  }, [props.title]);
  return <div className="screen">{props.children}</div>;
};

const ScreenContent = (props: { children: any }) => {
  return <div className="screen-content">{props.children}</div>;
};

const ScreenContentHeader = (props: { title: string; children?: any }) => {
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
