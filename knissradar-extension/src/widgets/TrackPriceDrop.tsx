import React from "react";
import { addToWatchlist } from "../shared/storage";
import type { ExtractedListing } from "../shared/types";

interface TrackPriceDropProps {
  listing: ExtractedListing;
}

type Status = "idle" | "success" | "error";

export function TrackPriceDrop({
  listing,
}: TrackPriceDropProps): React.ReactElement {
  const [targetPrice, setTargetPrice] = React.useState<string>(
    listing.price.toString()
  );
  const [status, setStatus] = React.useState<Status>("idle");
  const [isTracked, setIsTracked] = React.useState(false);

  React.useEffect(() => {
    setTargetPrice(listing.price.toString());
    setIsTracked(false);
    setStatus("idle");
  }, [listing.id, listing.price]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      setTargetPrice(value);
      setStatus("idle");
    }
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    e.preventDefault();

    const price = parseInt(targetPrice, 10);
    if (isNaN(price) || price <= 0) {
      setStatus("error");
      return;
    }

    try {
      await addToWatchlist({
        listingId: listing.id,
        title: listing.title,
        currentPrice: listing.price,
        targetPrice: price,
        lastChecked: new Date().toISOString(),
        history: [{ price: listing.price, timestamp: new Date().toISOString() }],
      });
      setIsTracked(true);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (isTracked) {
    return (
      <div className="bg-kniss-navy-light rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22C55E"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="text-green-400 text-sm font-medium">
            Tracking active
          </span>
        </div>
        <p className="text-gray-400 text-xs mb-2">
          Alert when price drops below:
        </p>
        <div className="flex items-center justify-between">
          <span className="text-white font-medium">
            {new Intl.NumberFormat("fr-DZ").format(parseInt(targetPrice, 10))} DA
          </span>
          <button
            onClick={() => setIsTracked(false)}
            className="text-gray-500 text-xs hover:text-gray-300 transition-colors cursor-pointer border-0 bg-transparent"
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-kniss-navy-light rounded-lg p-3">
      <h3 className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">
        Track Price Drop
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <label className="text-gray-400 text-xs block mb-1">
            Target price (DA)
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={targetPrice}
              onChange={handleChange}
              className="w-full bg-[#0F3460] text-white text-sm px-3 py-2 rounded-lg border border-white/10 focus:border-kniss-orange focus:outline-none transition-colors"
              placeholder="Enter target price"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
              DA
            </span>
          </div>
        </div>

        {status === "error" && (
          <p className="text-red-400 text-xs mb-2">
            Please enter a valid price (positive integer)
          </p>
        )}

        {status === "success" && (
          <p className="text-green-400 text-xs mb-2">
            Added to watchlist!
          </p>
        )}

        <button
          type="submit"
          className="w-full py-2 px-4 bg-kniss-orange text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity cursor-pointer border-0"
        >
          Track this listing
        </button>
      </form>
    </div>
  );
}
