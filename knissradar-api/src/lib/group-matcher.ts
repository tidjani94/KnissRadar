import { pool } from "../db/pool.js";
import { createHash } from "crypto";

const BRAND_PATTERNS: Record<string, string[]> = {
  apple: ["apple", "apple inc", "pomme"],
  samsung: ["samsung", "سامسونج"],
  xiaomi: ["xiaomi", "شاومي", "redmi", "poco"],
  huawei: ["huawei", "هواوي"],
  oppo: ["oppo"],
  vivo: ["vivo"],
  oneplus: ["oneplus", "one plus"],
  realme: ["realme"],
  nokia: ["nokia", "نوكيا"],
  sony: ["sony", "سوني"],
  lg: ["lg"],
  hp: ["hp", "hewlett packard"],
  dell: ["dell"],
  lenovo: ["lenovo", "لينوفو"],
  acer: ["acer"],
  asus: ["asus", "ايسر"],
  msi: ["msi"],
  toshiba: ["toshiba", "توشيبا"],
};

const MODEL_KEYWORDS = [
  "iphone", "galaxy", "redmi", "note", "pixel", "macbook", "thinkpad",
  "ideapod", "inspiron", "surface", "airpods", "watch", "pad",
  "pro", "max", "plus", "mini", "ultra", "lite",
];

interface ListingRow {
  id: string;
  title: string;
  price: number;
  category_slug: string;
  specs: Record<string, string>;
}

interface NormalizedProduct {
  brand: string;
  model: string;
  storage: string | null;
}

export function normalizeBrand(raw: string): string {
  const lower = raw.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(BRAND_PATTERNS)) {
    if (aliases.some((alias) => lower.includes(alias))) {
      return canonical;
    }
  }
  return lower;
}

export function normalizeModel(title: string, specs: Record<string, string>): string {
  const titleLower = title.toLowerCase();

  const modelFromSpec =
    specs["Modèle"] ?? specs["Modele"] ?? specs["Model"] ?? specs["طراز"] ?? "";

  const combined = `${titleLower} ${modelFromSpec.toLowerCase()}`;

  const tokens = MODEL_KEYWORDS.filter((kw) => combined.includes(kw));
  if (tokens.length > 0) {
    return tokens.join(" ");
  }

  const words = titleLower.split(/\s+/).filter((w) => w.length > 2);
  return words.slice(0, 3).join(" ");
}

export function normalizeStorage(specs: Record<string, string>): string | null {
  const raw =
    specs["Stockage"] ?? specs["Storage"] ?? specs["Capacité"] ?? specs["ذاكرة"] ?? null;
  if (!raw) return null;

  const match = raw.match(/(\d+)\s*(go|gb|to|tb)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit === "tb" || unit === "to") return `${num * 1024}gb`;
    return `${num}gb`;
  }
  return raw.toLowerCase().trim();
}

export function extractProduct(listing: ListingRow): NormalizedProduct {
  return {
    brand: normalizeBrand(
      listing.specs["Marque"] ?? listing.specs["Brand"] ?? listing.specs["العلامة التجارية"] ?? ""
    ),
    model: normalizeModel(listing.title, listing.specs),
    storage: normalizeStorage(listing.specs),
  };
}

export function specsHash(product: NormalizedProduct): string {
  const payload = `${product.brand}|${product.model}|${product.storage ?? ""}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export async function upsertProductGroups(): Promise<number> {
  const { rows: listings } = await pool.query<ListingRow>(
    `SELECT id, title, price, category_slug, specs FROM listings
     WHERE updated_at > NOW() - INTERVAL '24 hours'`
  );

  let groupsCreated = 0;

  for (const listing of listings) {
    const specs = typeof listing.specs === "string"
      ? JSON.parse(listing.specs) as Record<string, string>
      : listing.specs;

    const product = extractProduct({ ...listing, specs });
    const hash = specsHash(product);

    const { rows: existing } = await pool.query(
      `SELECT id FROM product_groups
       WHERE brand = $1 AND model = $2 AND COALESCE(storage, '') = COALESCE($3, '') AND category_slug = $4`,
      [product.brand, product.model, product.storage, listing.category_slug]
    );

    if (existing.length === 0) {
      const displayName = [product.brand, product.model, product.storage]
        .filter((s): s is string => s !== null)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");

      await pool.query(
        `INSERT INTO product_groups (brand, model, storage, category_slug, display_name, sample_size, last_aggregated_at)
         VALUES ($1, $2, $3, $4, $5, 1, NOW())
         ON CONFLICT (brand, model, storage, category_slug) DO UPDATE SET
           sample_size = product_groups.sample_size + 1,
           last_aggregated_at = NOW()`,
        [product.brand, product.model, product.storage, listing.category_slug, displayName]
      );
      groupsCreated++;
    } else {
      await pool.query(
        `UPDATE product_groups SET sample_size = sample_size + 1, last_aggregated_at = NOW()
         WHERE id = $1`,
        [existing[0].id]
      );
    }
  }

  return groupsCreated;
}

export async function aggregateGroupPrices(): Promise<void> {
  await pool.query(
    `INSERT INTO group_prices (group_id, date, min_price, max_price, median_price, avg_price, sample_count)
     SELECT
       pg.id,
       CURRENT_DATE,
       MIN(ph.price)::int,
       MAX(ph.price)::int,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ph.price)::int,
       AVG(ph.price)::int,
       COUNT(ph.id)
     FROM product_groups pg
     JOIN listings l ON l.category_slug = pg.category_slug
     JOIN price_history ph ON ph.listing_id = l.id
     WHERE ph.observed_at > NOW() - INTERVAL '24 hours'
       AND pg.last_aggregated_at < NOW() - INTERVAL '23 hours'
     GROUP BY pg.id
     ON CONFLICT (group_id, date) DO UPDATE SET
       min_price = EXCLUDED.min_price,
       max_price = EXCLUDED.max_price,
       median_price = EXCLUDED.median_price,
       avg_price = EXCLUDED.avg_price,
       sample_count = EXCLUDED.sample_count`
  );
}
