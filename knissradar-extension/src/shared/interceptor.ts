import type { ListingData, ExtractedListing } from "./types";
import { waitForDOM } from "./dom-extractor";

const GRAPHQL_ENDPOINT = "https://api.ouedkniss.com/graphql";
const EVENT_NAME = "knissradar:listings-data";

let graphqlDataReceived = false;

function extractListingData(data: ListingData): ExtractedListing {
  const specs: Record<string, string> = {};
  for (const spec of data.specs) {
    const key = spec.specification.label;
    specs[key] = spec.valueText;
  }

  return {
    id: data.id,
    title: data.title,
    price: data.price,
    pricePreview: data.pricePreview,
    categorySlug: data.category.slug,
    specs,
    city: data.cities[0]?.name ?? "Unknown",
    storeName: data.store?.name,
  };
}

function isAnnouncementGetResponse(body: unknown): body is {
  data: { announcement: ListingData };
} {
  if (typeof body !== "object" || body === null) return false;
  const obj = body as Record<string, unknown>;
  if (!obj.data || typeof obj.data !== "object") return false;
  const data = obj.data as Record<string, unknown>;
  return "announcement" in data;
}

function emitListingData(listing: ExtractedListing): void {
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: listing,
    })
  );
}

function isGraphQLRequest(url: string, init?: RequestInit): boolean {
  if (url !== GRAPHQL_ENDPOINT) return false;
  if (!init?.body) return false;

  try {
    const body = JSON.parse(init.body as string);
    return body.operationName === "AnnouncementGet";
  } catch {
    return false;
  }
}

const originalFetch = window.fetch;

window.fetch = async function (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  if (isGraphQLRequest(url, init)) {
    try {
      const response = await originalFetch.call(this, input, init);
      const clone = response.clone();

      clone
        .json()
        .then((body) => {
          if (isAnnouncementGetResponse(body)) {
            graphqlDataReceived = true;
            const listing = extractListingData(body.data.announcement);
            emitListingData(listing);
          }
        })
        .catch(() => {});

      return response;
    } catch (error) {
      throw error;
    }
  }

  return originalFetch.call(this, input, init);
};

function initDOMFallback(): void {
  if (graphqlDataReceived) return;

  waitForDOM((listing) => {
    if (listing && !graphqlDataReceived) {
      emitListingData(listing);
    }
  }, 20, 500);
}

const observer = new MutationObserver(() => {
  if (!graphqlDataReceived) {
    initDOMFallback();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

setTimeout(() => {
  observer.disconnect();
  if (!graphqlDataReceived) {
    initDOMFallback();
  }
}, 5000);

export { EVENT_NAME, extractListingData, initDOMFallback };
