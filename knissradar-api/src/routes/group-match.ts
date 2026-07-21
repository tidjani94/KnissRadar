import type { FastifyInstance } from "fastify";
import { upsertProductGroups, aggregateGroupPrices } from "../lib/group-matcher.js";

export async function groupMatchRoutes(app: FastifyInstance): Promise<void> {
  app.post("/match", async (request, reply) => {
    try {
      const groupsCreated = await upsertProductGroups();
      return { groupsCreated, message: "Product group matching complete" };
    } catch (err) {
      app.log.error(err, "Group matching failed");
      return reply.status(500).send({ error: "Group matching failed" });
    }
  });

  app.post("/aggregate", async (request, reply) => {
    try {
      await aggregateGroupPrices();
      return { message: "Price aggregation complete" };
    } catch (err) {
      app.log.error(err, "Price aggregation failed");
      return reply.status(500).send({ error: "Price aggregation failed" });
    }
  });
}
