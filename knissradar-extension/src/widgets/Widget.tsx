import React from "react";
import { FAB } from "./FAB";
import { Panel } from "./Panel";

export function Widget(): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div
      className="fixed z-[2147483647]"
      style={{
        right: 0,
        top: expanded ? 0 : "auto",
        bottom: expanded ? "auto" : 0,
        height: expanded ? "100vh" : "auto",
      }}
    >
      {expanded ? (
        <Panel onClose={() => setExpanded(false)} />
      ) : (
        <div className="fixed bottom-3 right-3">
          <FAB onClick={() => setExpanded(true)} />
        </div>
      )}
    </div>
  );
}
