import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";

export async function watchlistRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request) => {
    const { fingerprint } = request.query as { fingerprint?: string };
    if (!fingerprint) return { watchlist: [] };

    const { rows } = await pool.query(
      `SELECT w.id, w.listing_id, w.target_price, w.is_active, w.created_at,
              l.title, l.price as current_price, l.category_slug, l.city
       FROM watchlist w
       JOIN listings l ON l.id = w.listing_id
       WHERE w.user_fingerprint = $1 AND w.is_active = TRUE
       ORDER BY w.created_at DESC`,
      [fingerprint]
    );

    return { watchlist: rows };
  });

  app.post("/", async (request, reply) => {
    const { fingerprint, listingId, targetPrice } = request.body as {
      fingerprint: string;
      listingId: string;
      targetPrice: number;
    };

    if (!fingerprint || !listingId || !targetPrice) {
      return reply.status(400).send({ error: "Missing required fields" });
    }

    const { rows } = await pool.query(
      `INSERT INTO watchlist (user_fingerprint, listing_id, target_price)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_fingerprint, listing_id) DO UPDATE SET
         target_price = EXCLUDED.target_price,
         is_active = TRUE
       RETURNING id`,
      [fingerprint, listingId, targetPrice]
    );

    return { id: rows[0].id, ok: true };
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { fingerprint } = request.body as { fingerprint: string };

    if (!fingerprint) {
      return reply.status(400).send({ error: "Missing fingerprint" });
    }

    const { rowCount } = await pool.query(
      `UPDATE watchlist SET is_active = FALSE
       WHERE id = $1 AND user_fingerprint = $2`,
      [id, fingerprint]
    );

    if (rowCount === 0) {
      return reply.status(404).send({ error: "Watchlist item not found" });
    }

    return { ok: true };
  });

  app.post("/check-drops", async (request, reply) => {
    const { rows } = await pool.query(
      `SELECT w.id, w.user_fingerprint, w.target_price,
              l.id as listing_id, l.title, l.price as current_price
       FROM watchlist w
       JOIN listings l ON l.id = w.listing_id
       WHERE w.is_active = TRUE
         AND l.price <= w.target_price
         AND (w.last_notified_at IS NULL OR w.last_notified_at < NOW() - INTERVAL '24 hours')`
    );

    return { drops: rows, count: rows.length };
  });

  app.post("/:id/notified", async (request) => {
    const { id } = request.params as { id: string };
    await pool.query(
      `UPDATE watchlist SET last_notified_at = NOW() WHERE id = $1`,
      [id]
    );
    return { ok: true };
  });
}
