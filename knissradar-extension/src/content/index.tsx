import React from "react";
import { createRoot } from "react-dom/client";

const WIDGET_ID = "kniss-radar-root";

function injectWidget(): void {
  if (document.getElementById(WIDGET_ID)) return;

  const container = document.createElement("div");
  container.id = WIDGET_ID;
  container.style.cssText = `
    position: fixed;
    right: 0;
    top: 80px;
    z-index: 2147483647;
  `;
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      font-family: Inter, system-ui, sans-serif;
    }
  `;
  shadow.appendChild(style);

  const root = document.createElement("div");
  root.id = "kniss-widget";
  shadow.appendChild(root);

  createRoot(root).render(
    <React.StrictMode>
      <Widget />
    </React.StrictMode>
  );
}

function Widget(): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div
      style={{
        position: "fixed",
        right: expanded ? "0" : "12px",
        bottom: expanded ? "auto" : "12px",
        top: expanded ? "80px" : "auto",
        width: expanded ? "380px" : "48px",
        height: expanded ? "calc(100vh - 100px)" : "48px",
        background: expanded ? "#1A1A2E" : "#FF4D00",
        borderRadius: expanded ? "8px 0 0 8px" : "50%",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        transition: "all 0.3s ease",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: expanded ? "stretch" : "center",
        justifyContent: expanded ? "flex-start" : "center",
        color: "white",
        cursor: "pointer",
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {expanded ? (
        <div style={{ padding: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
            KnissRadar
          </h2>
          <p style={{ margin: "8px 0 0", fontSize: "12px", opacity: 0.7 }}>
            Price history widget
          </p>
        </div>
      ) : (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2 A10 10 0 0 1 22 12" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      )}
    </div>
  );
}

if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  injectWidget();
} else {
  document.addEventListener("DOMContentLoaded", injectWidget);
}
