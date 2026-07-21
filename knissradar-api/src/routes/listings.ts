import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";

export async function listingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/search", async (request, reply) => {
    const { category, q, page } = request.query as {
      category?: string;
      q?: string;
      page?: string;
    };
    const pageNum = Math.max(1, parseInt(page ?? "1", 10));
    const limit = 30;
    const offset = (pageNum - 1) * limit;

    let sql = "SELECT * FROM listings";
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (category) {
      params.push(category);
      conditions.push(`category_slug = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      conditions.push(`title ILIKE $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += ` ORDER BY updated_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const { rows } = await pool.query(sql, params);
    return { listings: rows, page: pageNum, limit };
  });

  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { rows } = await pool.query("SELECT * FROM listings WHERE id = $1", [id]);
    if (rows.length === 0) return reply.status(404).send({ error: "Not found" });
    return rows[0];
  });

  app.get("/:id/history", async (request) => {
    const { id } = request.params as { id: string };
    const { days } = request.query as { days?: string };
    const numDays = Math.min(365, Math.max(1, parseInt(days ?? "30", 10)));

    const { rows } = await pool.query(
      `SELECT price, observed_at FROM price_history
       WHERE listing_id = $1 AND observed_at > NOW() - INTERVAL '1 day' * $2
       ORDER BY observed_at ASC`,
      [id, numDays]
    );

    const prices = rows.map((r) => ({
      price: r.price as number,
      timestamp: r.observed_at as string,
    }));

    const stats =
      prices.length > 0
        ? {
            min: Math.min(...prices.map((p) => p.price)),
            max: Math.max(...prices.map((p) => p.price)),
            median: prices[Math.floor(prices.length / 2)].price,
            trend:
              prices.length > 1
                ? prices[prices.length - 1].price < prices[0].price
                  ? "down"
                  : prices[prices.length - 1].price > prices[0].price
                    ? "up"
                    : ("stable" as const)
                : ("stable" as const),
          }
        : null;

    return { listingId: id, days: numDays, prices, stats };
  });
}
