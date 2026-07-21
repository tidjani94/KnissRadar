import type { ExtractedListing } from "./types";
import selectorsConfig from "./selectors-version.json";

const selectors = selectorsConfig.selectors;

function querySelector(parent: Element, selectorArray: string[]): string | null {
  for (const selector of selectorArray) {
    try {
      const el = parent.querySelector(selector);
      if (el?.textContent?.trim()) {
        return el.textContent.trim();
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractId(): string | null {
  const url = window.location.pathname;
  const match = url.match(/\/annonce\/([^/]+)/);
  return match?.[1] ?? null;
}

function extractTitle(root: Element): string | null {
  return querySelector(root, selectors.title);
}

function extractPrice(root: Element): number | null {
  const text = querySelector(root, selectors.price);
  if (!text) return null;

  const cleaned = text.replace(/[^\d]/g, "");
  const price = parseInt(cleaned, 10);
  return isNaN(price) ? null : price;
}

function extractCity(root: Element): string {
  return querySelector(root, selectors.city) ?? "Unknown";
}

function extractStore(root: Element): string | undefined {
  return querySelector(root, selectors.store) ?? undefined;
}

function extractCategory(root: Element): string {
  const text = querySelector(root, selectors.category);
  if (!text) return "unknown";

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractSpecs(root: Element): Record<string, string> {
  const specs: Record<string, string> = {};

  for (const selector of selectors.specs) {
    try {
      const rows = root.querySelectorAll(selector);
      if (rows.length === 0) continue;

      for (const row of Array.from(rows)) {
        const text = row.textContent?.trim();
        if (!text) continue;

        const separatorMatch = text.match(/^(.+?)\s*[:|]\s*(.+)$/);
        if (separatorMatch) {
          const [, key, value] = separatorMatch;
          if (key && value) {
            specs[key.trim()] = value.trim();
          }
        }
      }

      if (Object.keys(specs).length > 0) break;
    } catch {
      continue;
    }
  }

  return specs;
}

function extractListingFromDOM(): ExtractedListing | null {
  const id = extractId();
  if (!id) return null;

  const root = document.querySelector("main") ?? document.body;

  const title = extractTitle(root);
  const price = extractPrice(root);

  if (!title || price === null) return null;

  return {
    id,
    title,
    price,
    pricePreview: new Intl.NumberFormat("fr-DZ").format(price) + " DA",
    categorySlug: extractCategory(root),
    specs: extractSpecs(root),
    city: extractCity(root),
    storeName: extractStore(root),
  };
}

function waitForDOM(
  callback: (listing: ExtractedListing | null) => void,
  maxAttempts = 10,
  intervalMs = 500
): void {
  let attempts = 0;

  const check = (): void => {
    attempts++;

    const listing = extractListingFromDOM();
    if (listing) {
      callback(listing);
      return;
    }

    if (attempts < maxAttempts) {
      setTimeout(check, intervalMs);
    } else {
      callback(null);
    }
  };

  check();
}

export {
  extractListingFromDOM,
  waitForDOM,
  selectorsConfig,
};
