import React from "react";
import { createRoot } from "react-dom/client";
import "./tailwind.css";

function Popup(): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white p-4">
      <header className="flex items-center gap-3 mb-6">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "#FF4D00" }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2 A10 10 0 0 1 22 12" />
            <circle cx="12" cy="12" r="3" fill="white" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold">KnissRadar</h1>
      </header>

      <section className="mb-6">
        <h2 className="text-sm font-medium text-gray-400 mb-3">
          Watchlist
        </h2>
        <div className="bg-[#16213E] rounded-lg p-4 text-center text-gray-500 text-sm">
          No listings tracked yet.
          <br />
          Browse ouedkniss.com to start tracking prices.
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-400 mb-3">
          Settings
        </h2>
        <div className="bg-[#16213E] rounded-lg p-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">Price drop notifications</span>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 accent-[#FF4D00]"
            />
          </label>
        </div>
      </section>
    </div>
  );
}

const root = document.getElementById("popup-root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
}
