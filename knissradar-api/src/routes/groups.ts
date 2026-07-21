import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";

export async function groupsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request) => {
    const { brand, model, category, page } = request.query as {
      brand?: string;
      model?: string;
      category?: string;
      page?: string;
    };
    const pageNum = Math.max(1, parseInt(page ?? "1", 10));
    const limit = 30;
    const offset = (pageNum - 1) * limit;

    let sql = "SELECT * FROM product_groups";
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (brand) {
      params.push(brand);
      conditions.push(`brand ILIKE $${params.length}`);
    }
    if (model) {
      params.push(`%${model}%`);
      conditions.push(`model ILIKE $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`category_slug = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += ` ORDER BY sample_size DESC LIMIT ${limit} OFFSET ${offset}`;

    const { rows } = await pool.query(sql, params);
    return { groups: rows, page: pageNum, limit };
  });

  // Get sponsored banners for a category (for Smart Compare)
  app.get("/sponsors", async (request) => {
    const { category } = request.query as { category?: string };

    let sql = `SELECT id, partner_name, image_url, target_url, category_slug
               FROM sponsor_banners
               WHERE is_active = TRUE
                 AND (starts_at IS NULL OR starts_at <= NOW())
                 AND (ends_at IS NULL OR ends_at >= NOW())`;
    const params: unknown[] = [];

    if (category) {
      params.push(category);
      sql += ` AND (category_slug = $1 OR category_slug IS NULL)`;
    }

    sql += ` ORDER BY RANDOM() LIMIT 3`;

    const { rows } = await pool.query(sql, params);

    // Increment impression count
    for (const banner of rows) {
      await pool.query(
        `UPDATE sponsor_banners SET impressions = impressions + 1 WHERE id = $1`,
        [banner.id]
      );
    }

    return { sponsors: rows };
  });

  // Track banner click
  app.post("/sponsors/:id/click", async (request) => {
    const { id } = request.params as { id: string };

    await pool.query(
      `UPDATE sponsor_banners SET clicks = clicks + 1 WHERE id = $1`,
      [id]
    );

    return { ok: true };
  });

  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { rows } = await pool.query("SELECT * FROM product_groups WHERE id = $1", [id]);
    if (rows.length === 0) return reply.status(404).send({ error: "Group not found" });
    return rows[0];
  });

  app.get("/:id/prices", async (request) => {
    const { id } = request.params as { id: string };
    const { days } = request.query as { days?: string };
    const numDays = Math.min(365, Math.max(1, parseInt(days ?? "30", 10)));

    const { rows } = await pool.query(
      `SELECT date, min_price, max_price, median_price, avg_price, sample_count
       FROM group_prices
       WHERE group_id = $1 AND date > CURRENT_DATE - INTERVAL '1 day' * $2
       ORDER BY date ASC`,
      [id, numDays]
    );

    return { groupId: id, days: numDays, prices: rows };
  });
}
