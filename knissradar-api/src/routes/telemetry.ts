import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";

interface TelemetryListing {
  id: string;
  title: string;
  price: number;
  pricePreview?: string;
  oldPrice?: number;
  category: { slug: string; name: string };
  specs?: Array<{
    specification: { label: string; codename: string };
    value?: number;
    valueText: string;
  }>;
  cities?: Array<{
    name: string;
    region: { name: string; slug: string };
  }>;
  store?: { id: string; name: string };
  createdAt: string;
}

export async function telemetryRoutes(app: FastifyInstance): Promise<void> {
  app.post("/", async (request, reply) => {
    const { source, listings } = request.body as {
      source?: string;
      listings: TelemetryListing[];
    };

    if (!listings || listings.length === 0) {
      return reply.status(400).send({ error: "No listings provided" });
    }

    const telemetrySource = source ?? "extension";
    let upserted = 0;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const listing of listings) {
        const city = listing.cities?.[0]?.name ?? null;
        const storeId = listing.store?.id ?? null;
        const storeName = listing.store?.name ?? null;
        const specsJson = listing.specs
          ? Object.fromEntries(
              listing.specs.map((s) => [s.specification.label, s.valueText])
            )
          : {};

        await client.query(
          `INSERT INTO listings (id, title, price, old_price, category_slug, city, store_id, store_name, specs, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
           ON CONFLICT (id) DO UPDATE SET
             price = EXCLUDED.price,
             old_price = EXCLUDED.old_price,
             city = EXCLUDED.city,
             store_id = EXCLUDED.store_id,
             store_name = EXCLUDED.store_name,
             specs = EXCLUDED.specs,
             updated_at = NOW()`,
          [
            listing.id,
            listing.title,
            listing.price,
            listing.oldPrice ?? null,
            listing.category.slug,
            city,
            storeId,
            storeName,
            JSON.stringify(specsJson),
            listing.createdAt,
          ]
        );

        await client.query(
          `INSERT INTO price_history (listing_id, price, observed_at)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [listing.id, listing.price, listing.createdAt]
        );

        upserted++;
      }

      await client.query(
        `INSERT INTO telemetry_log (source, payload, listings_upserted)
         VALUES ($1, $2, $3)`,
        [telemetrySource, JSON.stringify({ count: listings.length }), upserted]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      app.log.error(err, "Telemetry batch failed");
      return reply.status(500).send({ error: "Batch processing failed" });
    } finally {
      client.release();
    }

    return { upserted, total: listings.length };
  });
}
