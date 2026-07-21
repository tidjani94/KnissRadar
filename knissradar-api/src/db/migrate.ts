import { pool } from "./pool.js";

const MIGRATIONS = [
  // 001: listings table — raw listings scraped by extension telemetry
  `CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    price INTEGER NOT NULL,
    old_price INTEGER,
    category_slug TEXT NOT NULL,
    city TEXT,
    store_id TEXT,
    store_name TEXT,
    specs JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,

  // 002: price_history — every price observation per listing
  `CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    price INTEGER NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_price_history_listing ON price_history(listing_id, observed_at DESC);`,

  // 003: product_groups — fuzzy-matched product clusters
  `CREATE TABLE IF NOT EXISTS product_groups (
    id SERIAL PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    storage TEXT,
    category_slug TEXT NOT NULL,
    display_name TEXT NOT NULL,
    sample_size INTEGER DEFAULT 0,
    last_aggregated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (brand, model, storage, category_slug)
  );
  CREATE INDEX IF NOT EXISTS idx_product_groups_lookup ON product_groups(brand, model, category_slug);`,

  // 004: group_prices — aggregated price stats per group per day
  `CREATE TABLE IF NOT EXISTS group_prices (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES product_groups(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    min_price INTEGER NOT NULL,
    max_price INTEGER NOT NULL,
    median_price INTEGER NOT NULL,
    avg_price INTEGER NOT NULL,
    sample_count INTEGER NOT NULL,
    UNIQUE (group_id, date)
  );
  CREATE INDEX IF NOT EXISTS idx_group_prices_group ON group_prices(group_id, date DESC);`,

  // 005: watchlist — user price-drop watches (server-side mirror)
  `CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    user_fingerprint TEXT NOT NULL,
    listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    target_price INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_fingerprint, listing_id)
  );
  CREATE INDEX IF NOT EXISTS idx_watchlist_active ON watchlist(is_active) WHERE is_active = TRUE;`,

  // 006: sponsor_banners — B2B partner ads
  `CREATE TABLE IF NOT EXISTS sponsor_banners (
    id SERIAL PRIMARY KEY,
    partner_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    target_url TEXT NOT NULL,
    category_slug TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,

  // 007: telemetry_log — raw telemetry batches for audit
  `CREATE TABLE IF NOT EXISTS telemetry_log (
    id SERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    payload JSONB NOT NULL,
    listings_upserted INTEGER DEFAULT 0,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,

  // 008: telegram_users — Telegram bot chat IDs linked to user fingerprints
  `CREATE TABLE IF NOT EXISTS telegram_users (
    id SERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL UNIQUE,
    user_fingerprint TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_telegram_users_fingerprint ON telegram_users(user_fingerprint);`,

  // 009: partners — B2B partner accounts
  `CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    api_key TEXT NOT NULL UNIQUE,
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    is_active BOOLEAN DEFAULT TRUE,
    billing_email TEXT,
    chargily_customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_partners_api_key ON partners(api_key);`,

  // 010: partner_campaigns — ad campaigns per partner
  `CREATE TABLE IF NOT EXISTS partner_campaigns (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    banner_id INTEGER REFERENCES sponsor_banners(id) ON DELETE SET NULL,
    daily_budget INTEGER NOT NULL DEFAULT 0,
    spent INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_partner_campaigns_partner ON partner_campaigns(partner_id);`,

  // 011: partner_payments — payment history
  `CREATE TABLE IF NOT EXISTS partner_payments (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'DZD',
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cib', 'edahabia', 'ccp')),
    chargily_payment_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_partner_payments_partner ON partner_payments(partner_id);`,
];

async function migrate(): Promise<void> {
  console.log("Running migrations...");

  for (let i = 0; i < MIGRATIONS.length; i++) {
    const sql = MIGRATIONS[i];
    const label = `Migration ${String(i + 1).padStart(3, "0")}`;
    try {
      await pool.query(sql);
      console.log(`  ✓ ${label}`);
    } catch (err) {
      console.error(`  ✗ ${label} failed:`, (err as Error).message);
      throw err;
    }
  }

  console.log("All migrations complete.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
