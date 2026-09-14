/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

/** Creates the Prisma client. Called once at startup and injected everywhere else. */
export function createDbClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export type DbClient = PrismaClient;
