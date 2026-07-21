import React from "react";
import { createRoot } from "react-dom/client";
import { getWatchlist, removeFromWatchlist } from "../shared/storage";
import type { WatchlistItem } from "../shared/types";
import "./tailwind.css";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-DZ").format(price) + " DA";
}

function WatchlistItemRow({
  item,
  onRemove,
}: {
  item: WatchlistItem;
  onRemove: (id: string) => void;
}): React.ReactElement {
  const diff = item.currentPrice - item.targetPrice;
  const isBelow = diff <= 0;

  return (
    <div className="bg-[#0F3460] rounded-lg p-3 mb-2">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-white text-sm font-medium leading-tight flex-1 mr-2 line-clamp-2">
          {item.title}
        </h3>
        <button
          onClick={() => onRemove(item.listingId)}
          className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer border-0 bg-transparent p-1"
          aria-label="Remove from watchlist"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-[#FF4D00] font-bold text-sm">
            {formatPrice(item.currentPrice)}
          </span>
          <span className="text-gray-500 text-xs ml-2">
            → {formatPrice(item.targetPrice)}
          </span>
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded ${
            isBelow
              ? "bg-green-500/20 text-green-400"
              : "bg-yellow-500/20 text-yellow-400"
          }`}
        >
          {isBelow ? "Drop!" : `${formatPrice(diff)} left`}
        </span>
      </div>

      <div className="text-gray-500 text-xs mt-2">
        Last checked: {new Date(item.lastChecked).toLocaleDateString("fr-DZ")}
      </div>
    </div>
  );
}

function Popup(): React.ReactElement {
  const [watchlist, setWatchlist] = React.useState<WatchlistItem[]>([]);
  const [notifications, setNotifications] = React.useState(true);
  const [language, setLanguage] = React.useState<"fr" | "ar">("fr");

  React.useEffect(() => {
    getWatchlist().then(setWatchlist);
  }, []);

  async function handleRemove(id: string): Promise<void> {
    await removeFromWatchlist(id);
    setWatchlist((prev) => prev.filter((item) => item.listingId !== id));
  }

  function handleOpenWebsite(): void {
    chrome.tabs.create({ url: "https://knissradar.com" });
  }

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white p-4" style={{ width: 360 }}>
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#FF4D00] flex items-center justify-center">
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
        </div>
        <button
          onClick={handleOpenWebsite}
          className="text-gray-400 hover:text-white text-xs transition-colors cursor-pointer border-0 bg-transparent"
        >
          knissradar.com →
        </button>
      </header>

      <section className="mb-6">
        <h2 className="text-sm font-medium text-gray-400 mb-3">
          {language === "fr" ? "Ma liste" : "قائمتي"}
        </h2>

        {watchlist.length === 0 ? (
          <div className="bg-[#16213E] rounded-lg p-4 text-center text-gray-500 text-sm">
            {language === "fr"
              ? "Aucun article suivi pour le moment."
              : "لم يتم متابعة أي منتج بعد."}
            <br />
            <span className="text-xs text-gray-600 mt-1 block">
              {language === "fr"
                ? "Parcourez ouedkniss.com pour commencer."
                : "تصفح ouedkniss.com للبدء."}
            </span>
          </div>
        ) : (
          <div>
            {watchlist.map((item) => (
              <WatchlistItemRow
                key={item.listingId}
                item={item}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-400 mb-3">
          {language === "fr" ? "Paramètres" : "الإعدادات"}
        </h2>
        <div className="bg-[#16213E] rounded-lg p-3 space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">
              {language === "fr" ? "Notifications" : "الإشعارات"}
            </span>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="w-4 h-4 accent-[#FF4D00]"
            />
          </label>

          <div className="border-t border-white/10 pt-3">
            <span className="text-sm block mb-2">
              {language === "fr" ? "Langue" : "اللغة"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage("fr")}
                className={`px-3 py-1 text-xs rounded cursor-pointer border-0 ${
                  language === "fr"
                    ? "bg-[#FF4D00] text-white"
                    : "bg-[#0F3460] text-gray-400"
                }`}
              >
                Français
              </button>
              <button
                onClick={() => setLanguage("ar")}
                className={`px-3 py-1 text-xs rounded cursor-pointer border-0 ${
                  language === "ar"
                    ? "bg-[#FF4D00] text-white"
                    : "bg-[#0F3460] text-gray-400"
                }`}
              >
                العربية
              </button>
            </div>
          </div>
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
