/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { createApp } from "./app.js";
import { createDbClient } from "./db.js";
import { logger } from "./logger.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set (see .env.example)");

const port = Number(process.env.PORT ?? 3000);
const client = createDbClient(databaseUrl);

createApp(client).listen(port, () => {
  logger.info(`api listening on :${port}`);
});
