/// <reference types="chrome" />

const API_BASE = "https://knissradar-api.up.railway.app";
const STORAGE_KEY = "knissradar_telemetry_buffer";

chrome.runtime.onInstalled.addListener(() => {
  console.log("KnissRadar extension installed");
});

// Create notification channel for price drops
chrome.alarms.create("price-check", {
  periodInMinutes: 15,
});

chrome.alarms.create("telemetry-flush", {
  periodInMinutes: 0.5,
});

chrome.runtime.onMessage.addListener(
  (
    message: { type: string; data?: unknown },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    if (message.type === "TELEMETRY_LISTING") {
      bufferListing(message.data)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }

    if (message.type === "FLUSH_TELEMETRY") {
      flushTelemetry()
        .then((result) => sendResponse(result))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }

    if (message.type === "SHOW_NOTIFICATION") {
      const data = message.data as {
        title: string;
        message: string;
        url?: string;
      };
      showNotification(data.title, data.message, data.url);
      sendResponse({ ok: true });
      return false;
    }
  }
);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "telemetry-flush") {
    flushTelemetry().catch((err) =>
      console.error("Telemetry flush failed:", err)
    );
  }

  if (alarm.name === "price-check") {
    checkPriceDrops().catch((err) =>
      console.error("Price check failed:", err)
    );
  }
});

function showNotification(
  title: string,
  message: string,
  url?: string
): void {
  chrome.notifications.create(
    `knissradar-${Date.now()}`,
    {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title,
      message,
      priority: 2,
    },
    (notificationId) => {
      if (url) {
        // Store URL for click handler
        chrome.storage.local.set({ [`notification_${notificationId}`]: url });

        // Save to alert history
        saveAlertToHistory(title, message, url);
      }
    }
  );
}

async function saveAlertToHistory(
  title: string,
  message: string,
  url: string
): Promise<void> {
  try {
    const result = await chrome.storage.local.get("alert_history");
    const history = (result.alert_history as Array<{
      id: string;
      title: string;
      price: number;
      timestamp: number;
    }>) ?? [];

    // Extract price from message if present
    const priceMatch = message.match(/(\d[\d\s]*)\s*DA/);
    const price = priceMatch?.[1]
      ? parseInt(priceMatch[1].replace(/\s/g, ""), 10)
      : 0;

    // Extract listing ID from URL
    const listingId = url.split("/").pop() ?? "";

    // Add new alert to beginning
    history.unshift({
      id: listingId,
      title: title.replace("🔔 ", ""),
      price,
      timestamp: Date.now(),
    });

    // Keep only last 50 alerts
    const trimmedHistory = history.slice(0, 50);
    await chrome.storage.local.set({ alert_history: trimmedHistory });
  } catch (err) {
    console.error("Failed to save alert history:", err);
  }
}

chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.storage.local.get(`notification_${notificationId}`, (result) => {
    const url = result[`notification_${notificationId}`];
    if (url) {
      chrome.tabs.create({ url });
      chrome.storage.local.remove(`notification_${notificationId}`);
    }
  });
  chrome.notifications.clear(notificationId);
});

async function getBuffer(): Promise<unknown[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as unknown[]) ?? [];
}

async function setBuffer(items: unknown[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: items });
}

async function bufferListing(listing: unknown): Promise<void> {
  const buffer = await getBuffer();
  buffer.push(listing);

  if (buffer.length >= 50) {
    await flushTelemetry();
  } else {
    await setBuffer(buffer);
  }
}

async function flushTelemetry(): Promise<{ ok: boolean; upserted?: number }> {
  const buffer = await getBuffer();
  if (buffer.length === 0) return { ok: true, upserted: 0 };

  try {
    const response = await fetch(`${API_BASE}/api/v1/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "extension",
        listings: buffer,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = (await response.json()) as { upserted: number };
    await setBuffer([]);
    console.log(`Telemetry flushed: ${result.upserted} listings`);
    return { ok: true, upserted: result.upserted };
  } catch (err) {
    console.error("Telemetry API error:", err);
    return { ok: false };
  }
}

async function checkPriceDrops(): Promise<void> {
  try {
    // Get all watchlist items from local storage
    const result = await chrome.storage.local.get("knissradar_watchlist");
    const watchlist = (result.knissradar_watchlist as Array<{
      listingId: string;
      title: string;
      targetPrice: number;
      currentPrice: number;
    }>) ?? [];

    if (watchlist.length === 0) return;

    // Check each item for price drops
    for (const item of watchlist) {
      if (item.currentPrice <= item.targetPrice) {
        showNotification(
          "🔔 Prix baisé!",
          `${item.title}\nPrix actuel: ${item.currentPrice.toLocaleString("fr-DZ")} DA`,
          `https://ouedkniss.com/annonce/${item.listingId}`
        );
      }
    }
  } catch (err) {
    console.error("Price drop check error:", err);
  }
}
