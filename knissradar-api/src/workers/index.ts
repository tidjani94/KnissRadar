import { Queue, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import "dotenv/config";
import { upsertProductGroups, aggregateGroupPrices } from "../lib/group-matcher.js";
import { pool } from "../db/pool.js";

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

scheduleRecurring().catch((err) => {
  console.error("Failed to schedule recurring jobs:", err);
  process.exit(1);
});

console.log("BullMQ workers started");
