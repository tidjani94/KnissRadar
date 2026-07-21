/// <reference types="chrome" />

const API_BASE = "https://knissradar-api.up.railway.app";
const STORAGE_KEY = "knissradar_telemetry_buffer";

chrome.runtime.onInstalled.addListener(() => {
  console.log("KnissRadar extension installed");
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
  }
);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "telemetry-flush") {
    flushTelemetry().catch((err) =>
      console.error("Telemetry flush failed:", err)
    );
  }
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
