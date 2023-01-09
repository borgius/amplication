import { INestApplication, Injectable, OnModuleInit } from "@nestjs/common";
import { createPrismaQueryEventHandler } from "prisma-query-log";
import { PrismaClient } from "../../prisma/generated-prisma-client";

globalThis.queries = [];
const log = createPrismaQueryEventHandler({
  format: true,
  queryDuration: true,
  logger: (query) => {
    globalThis.queries.unshift(query);
    if (globalThis.queries.length > 100) {
      globalThis.queries.pop();
    }
  },
});

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      log: [
        {
          emit: "event",
          level: "query",
        },
      ],
    });
  }
  async onModuleInit() {
    try {
      await this.$connect();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.$on("query", log);
    } catch (error) {
      console.error("Prisma connection error", error);
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on("beforeExit", async () => {
      await app.close();
    });
  }
}
