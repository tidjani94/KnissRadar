import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import "dotenv/config";
import { listingsRoutes } from "./routes/listings.js";
import { telemetryRoutes } from "./routes/telemetry.js";
import { groupsRoutes } from "./routes/groups.js";
import { groupMatchRoutes } from "./routes/group-match.js";

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

await app.register(cors, {
  origin: ["https://ouedkniss.com", "chrome-extension://*"],
  methods: ["GET", "POST"],
});
await app.register(helmet);
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

app.get("/health", async () => ({ status: "ok", ts: Date.now() }));

await app.register(listingsRoutes, { prefix: "/api/v1/listings" });
await app.register(telemetryRoutes, { prefix: "/api/v1/telemetry" });
await app.register(groupsRoutes, { prefix: "/api/v1/groups" });
await app.register(groupMatchRoutes, { prefix: "/api/v1/groups" });

const port = parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info(`KnissRadar API listening on ${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
