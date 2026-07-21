import React from "react";
import type { ExtractedListing } from "../shared/types";
import { PriceGraph } from "./PriceGraph";
import { TrackPriceDrop } from "./TrackPriceDrop";

interface PanelProps {
  listing: ExtractedListing | null;
  onClose: () => void;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-DZ").format(price) + " DA";
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className="text-white text-xs font-medium">{value}</span>
    </div>
  );
}

export function Panel({ listing, onClose }: PanelProps): React.ReactElement {
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
        {listing ? (
          <div className="animate-fade-in">
            <div className="mb-4">
              <h2 className="text-white font-medium text-sm leading-tight mb-2">
                {listing.title}
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="text-kniss-orange font-bold text-xl">
                  {formatPrice(listing.price)}
                </span>
                {listing.storeName && (
                  <span className="text-gray-500 text-xs">
                    via {listing.storeName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-gray-500 text-xs px-2 py-0.5 bg-kniss-navy-light rounded">
                  {listing.city}
                </span>
                <span className="text-gray-500 text-xs px-2 py-0.5 bg-kniss-navy-light rounded">
                  {listing.categorySlug}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <PriceGraph listingId={listing.id} prices={[]} currentPrice={listing.price} />
            </div>

            {Object.keys(listing.specs).length > 0 && (
              <div className="bg-kniss-navy-light rounded-lg p-3">
                <h3 className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">
                  Specifications
                </h3>
                <div>
                  {Object.entries(listing.specs).slice(0, 8).map(([key, value]) => (
                    <SpecRow key={key} label={key} value={value} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
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
        )}
      </main>

      <footer className="p-3 border-t border-white/10">
        {listing ? (
          <TrackPriceDrop listing={listing} />
        ) : (
          <button className="w-full py-2 px-4 bg-kniss-orange text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity cursor-pointer border-0">
            Waiting for listing data...
          </button>
        )}
      </footer>
    </div>
  );
}
