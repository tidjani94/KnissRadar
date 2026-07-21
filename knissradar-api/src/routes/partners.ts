import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import crypto from "crypto";
import { createChargilyCheckout, verifyChargilyPayment } from "../lib/chargily.js";

async function authenticatePartner(
  apiKey: string
): Promise<{ id: number; name: string; tier: string } | null> {
  const { rows } = await pool.query(
    `SELECT id, name, tier FROM partners WHERE api_key = $1 AND is_active = TRUE`,
    [apiKey]
  );
  return rows.length > 0 ? rows[0] : null;
}

const TIER_LIMITS = {
  free: { banners: 1, campaigns: 0, analytics: false },
  pro: { banners: 10, campaigns: 5, analytics: true },
  enterprise: { banners: 100, campaigns: 50, analytics: true },
};

export async function partnerRoutes(app: FastifyInstance): Promise<void> {
  // Partner registration
  app.post("/register", async (request, reply) => {
    const { name, email } = request.body as { name?: string; email?: string };

    if (!name || !email) {
      return reply.status(400).send({ error: "Missing required fields" });
    }

    const apiKey = `kr_${crypto.randomBytes(32).toString("hex")}`;

    try {
      const { rows } = await pool.query(
        `INSERT INTO partners (name, email, api_key)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           updated_at = NOW()
         RETURNING id, api_key`,
        [name, email, apiKey]
      );

      return {
        id: rows[0].id,
        apiKey: rows[0].api_key,
        message: "Partner registered. Save your API key securely.",
      };
    } catch (err) {
      console.error("[Partner] Registration error:", err);
      return reply.status(500).send({ error: "Registration failed" });
    }
  });

  // Get partner profile
  app.get("/profile", async (request, reply) => {
    const apiKey = (request.headers["x-api-key"] as string) ?? "";
    const partner = await authenticatePartner(apiKey);

    if (!partner) {
      return reply.status(401).send({ error: "Invalid API key" });
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, tier, created_at FROM partners WHERE id = $1`,
      [partner.id]
    );

    return rows[0];
  });

  // Get partner banners
  app.get("/banners", async (request, reply) => {
    const apiKey = (request.headers["x-api-key"] as string) ?? "";
    const partner = await authenticatePartner(apiKey);

    if (!partner) {
      return reply.status(401).send({ error: "Invalid API key" });
    }

    const { rows } = await pool.query(
      `SELECT id, partner_name, image_url, target_url, category_slug,
              is_active, impressions, clicks, starts_at, ends_at, created_at
       FROM sponsor_banners
       WHERE partner_name = $1
       ORDER BY created_at DESC`,
      [partner.name]
    );

    return { banners: rows };
  });

  // Create banner
  app.post("/banners", async (request, reply) => {
    const apiKey = (request.headers["x-api-key"] as string) ?? "";
    const partner = await authenticatePartner(apiKey);

    if (!partner) {
      return reply.status(401).send({ error: "Invalid API key" });
    }

    // Check tier limits
    const limits = TIER_LIMITS[partner.tier as keyof typeof TIER_LIMITS] ?? TIER_LIMITS.free;
    const { rows: bannerCount } = await pool.query(
      `SELECT COUNT(*) as count FROM sponsor_banners WHERE partner_name = $1`,
      [partner.name]
    );

    if (parseInt(bannerCount[0].count) >= limits.banners) {
      return reply.status(403).send({
        error: `Banner limit reached for ${partner.tier} tier`,
        limit: limits.banners,
        upgrade: partner.tier !== "enterprise",
      });
    }

    const { imageUrl, targetUrl, categorySlug, startsAt, endsAt } = request.body as {
      imageUrl?: string;
      targetUrl?: string;
      categorySlug?: string;
      startsAt?: string;
      endsAt?: string;
    };

    if (!imageUrl || !targetUrl) {
      return reply.status(400).send({ error: "Missing required fields" });
    }

    const { rows } = await pool.query(
      `INSERT INTO sponsor_banners (partner_name, image_url, target_url, category_slug, starts_at, ends_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [partner.name, imageUrl, targetUrl, categorySlug ?? null, startsAt ?? null, endsAt ?? null]
    );

    return { id: rows[0].id, ok: true };
  });

  // Get partner campaigns
  app.get("/campaigns", async (request, reply) => {
    const apiKey = (request.headers["x-api-key"] as string) ?? "";
    const partner = await authenticatePartner(apiKey);

    if (!partner) {
      return reply.status(401).send({ error: "Invalid API key" });
    }

    const { rows } = await pool.query(
      `SELECT pc.id, pc.name, pc.daily_budget, pc.spent, pc.is_active,
              pc.starts_at, pc.ends_at, pc.created_at,
              sb.image_url, sb.target_url
       FROM partner_campaigns pc
       LEFT JOIN sponsor_banners sb ON sb.id = pc.banner_id
       WHERE pc.partner_id = $1
       ORDER BY pc.created_at DESC`,
      [partner.id]
    );

    return { campaigns: rows };
  });

  // Get partner analytics
  app.get("/analytics", async (request, reply) => {
    const apiKey = (request.headers["x-api-key"] as string) ?? "";
    const partner = await authenticatePartner(apiKey);

    if (!partner) {
      return reply.status(401).send({ error: "Invalid API key" });
    }

    // Check tier access
    const limits = TIER_LIMITS[partner.tier as keyof typeof TIER_LIMITS] ?? TIER_LIMITS.free;
    if (!limits.analytics) {
      return reply.status(403).send({
        error: "Analytics requires Pro or Enterprise tier",
        upgrade: true,
      });
    }

    const { days } = request.query as { days?: string };
    const numDays = Math.min(90, Math.max(1, parseInt(days ?? "30", 10)));

    // Get total impressions and clicks
    const { rows: stats } = await pool.query(
      `SELECT
         SUM(impressions) as total_impressions,
         SUM(clicks) as total_clicks
       FROM sponsor_banners
       WHERE partner_name = $1
         AND created_at > NOW() - INTERVAL '1 day' * $2`,
      [partner.name, numDays]
    );

    // Get daily breakdown
    const { rows: daily } = await pool.query(
      `SELECT
         DATE(created_at) as date,
         SUM(impressions) as impressions,
         SUM(clicks) as clicks
       FROM sponsor_banners
       WHERE partner_name = $1
         AND created_at > NOW() - INTERVAL '1 day' * $2
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [partner.name, numDays]
    );

    return {
      summary: stats[0] ?? { total_impressions: 0, total_clicks: 0 },
      daily,
    };
  });

  // Get payment history
  app.get("/payments", async (request, reply) => {
    const apiKey = (request.headers["x-api-key"] as string) ?? "";
    const partner = await authenticatePartner(apiKey);

    if (!partner) {
      return reply.status(401).send({ error: "Invalid API key" });
    }

    const { rows } = await pool.query(
      `SELECT id, amount, currency, payment_method, status, created_at
       FROM partner_payments
       WHERE partner_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [partner.id]
    );

    return { payments: rows };
  });

  // Create payment with Chargily
  app.post("/payments/create", async (request, reply) => {
    const apiKey = (request.headers["x-api-key"] as string) ?? "";
    const partner = await authenticatePartner(apiKey);

    if (!partner) {
      return reply.status(401).send({ error: "Invalid API key" });
    }

    const { amount, paymentMethod, description } = request.body as {
      amount?: number;
      paymentMethod?: "cib" | "edahabia";
      description?: string;
    };

    if (!amount || !paymentMethod) {
      return reply.status(400).send({ error: "Missing required fields" });
    }

    if (amount < 500) {
      return reply.status(400).send({ error: "Minimum payment is 500 DA" });
    }

    const checkout = await createChargilyCheckout({
      amount,
      description: description ?? `KnissRadar Pro - ${partner.name}`,
      partnerId: partner.id,
      paymentMethod,
    });

    if (!checkout) {
      return reply.status(500).send({ error: "Payment creation failed" });
    }

    return {
      checkoutId: checkout.id,
      checkoutUrl: checkout.checkout_url,
      amount: checkout.amount / 100, // Convert back from centimes
    };
  });

  // Verify payment status
  app.post("/payments/verify", async (request, reply) => {
    const apiKey = (request.headers["x-api-key"] as string) ?? "";
    const partner = await authenticatePartner(apiKey);

    if (!partner) {
      return reply.status(401).send({ error: "Invalid API key" });
    }

    const { checkoutId } = request.body as { checkoutId?: string };

    if (!checkoutId) {
      return reply.status(400).send({ error: "Missing checkoutId" });
    }

    const result = await verifyChargilyPayment(checkoutId);

    if (!result) {
      return reply.status(500).send({ error: "Verification failed" });
    }

    // If payment completed, upgrade partner tier
    if (result.status === "paid") {
      await pool.query(
        `UPDATE partners SET tier = 'pro', updated_at = NOW() WHERE id = $1`,
        [partner.id]
      );
    }

    return {
      status: result.status,
      amount: result.amount / 100,
    };
  });
}
