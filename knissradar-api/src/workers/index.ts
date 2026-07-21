import { Queue, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import "dotenv/config";
import { upsertProductGroups, aggregateGroupPrices } from "../lib/group-matcher.js";
import { pool } from "../db/pool.js";
import { sendTelegramAlert, getTelegramUsers } from "../lib/telegram.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const productGroupQueue = new Queue("product-group-agg", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  },
});

export const staleCleanupQueue = new Queue("stale-listing-cleanup", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  },
});

export const alertQueue = new Queue("alert-dispatch", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

const productGroupWorker = new Worker(
  "product-group-agg",
  async (job: Job) => {
    const start = Date.now();
    job.log(`[${new Date().toISOString()}] Starting product group aggregation`);

    try {
      const groupsCreated = await upsertProductGroups();
      await aggregateGroupPrices();

      const elapsed = Date.now() - start;
      job.log(`[${new Date().toISOString()}] Completed in ${elapsed}ms — ${groupsCreated} new groups`);
      return { groupsCreated, elapsed };
    } catch (err) {
      job.log(`[${new Date().toISOString()}] Failed: ${(err as Error).message}`);
      throw err;
    }
  },
  { connection, concurrency: 1 }
);

const staleCleanupWorker = new Worker(
  "stale-listing-cleanup",
  async (job: Job) => {
    const start = Date.now();
    job.log(`[${new Date().toISOString()}] Starting stale listing cleanup`);

    try {
      const { rows } = await pool.query(
        `UPDATE listings SET updated_at = updated_at
         WHERE updated_at < NOW() - INTERVAL '30 days'
         RETURNING id`
      );

      const elapsed = Date.now() - start;
      job.log(`[${new Date().toISOString()}] Completed in ${elapsed}ms — ${rows.length} stale listings`);
      return { staleCount: rows.length, elapsed };
    } catch (err) {
      job.log(`[${new Date().toISOString()}] Failed: ${(err as Error).message}`);
      throw err;
    }
  },
  { connection, concurrency: 1 }
);

productGroupWorker.on("completed", (job) => {
  console.log(`[product-group-agg] Job ${job.id} completed`);
});

productGroupWorker.on("failed", (job, err) => {
  console.error(`[product-group-agg] Job ${job?.id} failed:`, err.message);
});

staleCleanupWorker.on("completed", (job) => {
  console.log(`[stale-listing-cleanup] Job ${job.id} completed`);
});

staleCleanupWorker.on("failed", (job, err) => {
  console.error(`[stale-listing-cleanup] Job ${job?.id} failed:`, err.message);
});

interface AlertJobData {
  watchlistId: number;
  userFingerprint: string;
  listingId: string;
  title: string;
  currentPrice: number;
  targetPrice: number;
}

const alertDispatchWorker = new Worker(
  "alert-dispatch",
  async (job: Job<AlertJobData>) => {
    const { watchlistId, userFingerprint, title, currentPrice, targetPrice } = job.data;
    const start = Date.now();
    job.log(`[${new Date().toISOString()}] Sending alert for listing ${job.data.listingId}`);

    try {
      const telegramUsers = await getTelegramUsers(userFingerprint);
      let sentCount = 0;

      for (const user of telegramUsers) {
        const message =
          `🔔 <b>Prix baisé!</b>\n\n` +
          `<b>${title}</b>\n\n` +
          `Prix actuel: <b>${currentPrice.toLocaleString("fr-FR")} DA</b>\n` +
          `Prix cible: ${targetPrice.toLocaleString("fr-FR")} DA\n\n` +
          `Voir l'annonce: https://ouedkniss.com/annonce/${job.data.listingId}`;

        const sent = await sendTelegramAlert(user.chat_id, message);
        if (sent) sentCount++;
      }

      await pool.query(
        `UPDATE watchlist SET last_notified_at = NOW() WHERE id = $1`,
        [watchlistId]
      );

      const elapsed = Date.now() - start;
      job.log(`[${new Date().toISOString()}] Sent ${sentCount} alerts in ${elapsed}ms`);
      return { sentCount, elapsed };
    } catch (err) {
      job.log(`[${new Date().toISOString()}] Failed: ${(err as Error).message}`);
      throw err;
    }
  },
  { connection, concurrency: 5 }
);

alertDispatchWorker.on("completed", (job) => {
  console.log(`[alert-dispatch] Job ${job.id} completed`);
});

alertDispatchWorker.on("failed", (job, err) => {
  console.error(`[alert-dispatch] Job ${job?.id} failed:`, err.message);
});

async function scheduleRecurring(): Promise<void> {
  await productGroupQueue.add(
    "recurring-agg",
    {},
    {
      repeat: { every: 6 * 60 * 60 * 1000 },
      jobId: "product-group-agg-recurring",
    }
  );

  await staleCleanupQueue.add(
    "recurring-cleanup",
    {},
    {
      repeat: { every: 24 * 60 * 60 * 1000 },
      jobId: "stale-listing-cleanup-recurring",
    }
  );

  console.log("Recurring jobs scheduled");
}

export async function enqueueAlerts(): Promise<number> {
  const { rows } = await pool.query(
    `SELECT w.id as watchlist_id, w.user_fingerprint, w.target_price,
            l.id as listing_id, l.title, l.price as current_price
     FROM watchlist w
     JOIN listings l ON l.id = w.listing_id
     WHERE w.is_active = TRUE
       AND l.price <= w.target_price
       AND (w.last_notified_at IS NULL OR w.last_notified_at < NOW() - INTERVAL '24 hours')`
  );

  let enqueued = 0;
  for (const row of rows) {
    await alertQueue.add("price-drop", {
      watchlistId: row.watchlist_id,
      userFingerprint: row.user_fingerprint,
      listingId: row.listing_id,
      title: row.title,
      currentPrice: row.current_price,
      targetPrice: row.target_price,
    });
    enqueued++;
  }

  console.log(`[alert-dispatch] Enqueued ${enqueued} alerts`);
  return enqueued;
}

scheduleRecurring().catch((err) => {
  console.error("Failed to schedule recurring jobs:", err);
  process.exit(1);
});

// Schedule alert check every 15 minutes
const alertCheckQueue = new Queue("alert-check", {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 5 },
  },
});

alertCheckQueue.add(
  "recurring-check",
  {},
  {
    repeat: { every: 15 * 60 * 1000 },
    jobId: "alert-check-recurring",
  }
);

const alertCheckWorker = new Worker(
  "alert-check",
  async () => {
    await enqueueAlerts();
  },
  { connection, concurrency: 1 }
);

alertCheckWorker.on("completed", () => {
  console.log(`[alert-check] Completed`);
});

alertCheckWorker.on("failed", (job, err) => {
  console.error(`[alert-check] Job ${job?.id} failed:`, err.message);
});

console.log("BullMQ workers started");
