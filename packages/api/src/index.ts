/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { resolve } from "node:path";
import { createIdentityClient } from "@fonoster/identity-client";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDbClient } from "./db.js";
import { createVerifyAccessToken } from "./identity/createVerifyAccessToken.js";
import { logger } from "./logger.js";

const config = loadConfig();
const client = createDbClient(config.databaseUrl);
const identity = createIdentityClient(config.identity.endpoint);

const services = {
  identity,
  verifyAccessToken: createVerifyAccessToken({
    loadPublicKey: async () => (await identity.getPublicKey()).publicKey,
    issuer: config.identity.issuer,
    audience: config.identity.audience
  }),
  dashboardUrl: config.dashboardUrl,
  identityBridgeUrl: config.identity.bridgeUrl,
  fetch
};

const devMediaDir = config.isProduction
  ? undefined
  : resolve(import.meta.dirname, "../.data/media");

createApp(client, services, { devMediaDir }).listen(config.port, () => {
  logger.info(`api listening on :${config.port}`);
});
