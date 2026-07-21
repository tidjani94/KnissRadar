import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { Widget } from "../widgets/Widget";
import "../widgets/tailwind.css";
import "../shared/interceptor";

const WIDGET_ID = "kniss-radar-root";
let root: Root | null = null;

function injectWidget(): void {
  const existing = document.getElementById(WIDGET_ID);
  if (existing) return;

  const container = document.createElement("div");
  container.id = WIDGET_ID;
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :host {
      all: initial;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @keyframes slide-in {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    @keyframes fade-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .animate-slide-in {
      animation: slide-in 0.3s ease-out;
    }

    .animate-fade-in {
      animation: fade-in 0.2s ease-out;
    }
  `;
  shadow.appendChild(style);

  const rootDiv = document.createElement("div");
  rootDiv.id = "kniss-widget";
  rootDiv.style.cssText = "all: initial;";
  shadow.appendChild(rootDiv);

  root = createRoot(rootDiv);
  root.render(
    <React.StrictMode>
      <Widget />
    </React.StrictMode>
  );
}

function removeWidget(): void {
  const existing = document.getElementById(WIDGET_ID);
  if (existing) {
    existing.remove();
    root = null;
  }
}

let currentPath = window.location.pathname;

function onUrlChange(): void {
  const newPath = window.location.pathname;
  if (newPath === currentPath) return;
  currentPath = newPath;

  removeWidget();

  if (newPath.includes("/annonce/")) {
    injectWidget();
  }
}

const originalPushState = history.pushState;
history.pushState = function (...args) {
  originalPushState.apply(this, args);
  onUrlChange();
};

const originalReplaceState = history.replaceState;
history.replaceState = function (...args) {
  originalReplaceState.apply(this, args);
  onUrlChange();
};

window.addEventListener("popstate", onUrlChange);

if (window.location.pathname.includes("/annonce/")) {
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    injectWidget();
  } else {
    document.addEventListener("DOMContentLoaded", injectWidget);
  }
}
