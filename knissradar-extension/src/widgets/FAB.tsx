import React from "react";

interface FABProps {
  onClick: () => void;
}

export function FAB({ onClick }: FABProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className="w-12 h-12 rounded-full bg-kniss-orange flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer border-0"
      aria-label="Open KnissRadar"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2 A10 10 0 0 1 22 12" />
        <circle cx="12" cy="12" r="3" fill="white" />
      </svg>
    </button>
  );
}
