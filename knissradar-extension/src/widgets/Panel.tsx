import React from "react";

interface PanelProps {
  onClose: () => void;
}

export function Panel({ onClose }: PanelProps): React.ReactElement {
  return (
    <div className="w-[380px] h-full bg-kniss-navy rounded-l-lg shadow-2xl flex flex-col overflow-hidden animate-slide-in">
      <header className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-kniss-orange flex items-center justify-center">
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
          <h1 className="text-white font-semibold text-sm">KnissRadar</h1>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer border-0 bg-transparent"
          aria-label="Close panel"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="text-center text-gray-500 text-sm py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-kniss-navy-light flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-gray-600"
            >
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 4-10" />
            </svg>
          </div>
          <p className="mb-1 text-gray-400">No price data yet</p>
          <p className="text-xs text-gray-600">
            Browse ouedkniss.com listings to see price history
          </p>
        </div>
      </main>

      <footer className="p-3 border-t border-white/10">
        <button className="w-full py-2 px-4 bg-kniss-orange text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity cursor-pointer border-0">
          Track this listing
        </button>
      </footer>
    </div>
  );
}
