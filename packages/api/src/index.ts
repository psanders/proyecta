/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { createIdentityClient } from "@fonoster/identity-client";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDbClient } from "./db.js";
import { createRateLimiter } from "./events/createRateLimiter.js";
import { createStatusSweeper } from "./events/createStatusSweeper.js";
import { EventHub } from "./events/hub.js";
import { createRotationLoader } from "./events/rotation.js";
import { createVerifyAccessToken } from "./identity/createVerifyAccessToken.js";
import { logger } from "./logger.js";

const config = loadConfig();
const db = createDbClient(config.databaseUrl);
const identity = createIdentityClient(config.identity.endpoint);
const mediaDir = config.mediaDir;
const sync = { db, hub: new EventHub(), loadRotation: createRotationLoader(mediaDir) };

createStatusSweeper(sync);

const services = {
  identity,
  verifyAccessToken: createVerifyAccessToken({
    loadPublicKey: async () => (await identity.getPublicKey()).publicKey,
    issuer: config.identity.issuer,
    audience: config.identity.audience
  }),
  dashboardUrl: config.dashboardUrl,
  identityBridgeUrl: config.identity.bridgeUrl,
  fetch,
  sync,
  pairingLimiter: createRateLimiter(10, 60_000)
};

createApp(services, { mediaDir }).listen(config.port, () => {
  logger.info(`api listening on :${config.port}`);
});
