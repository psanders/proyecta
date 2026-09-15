/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIdentityClient } from "@fonoster/identity-client";
import { createScreenRotationLoader } from "./api/ads/createScreenRotationLoader.js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDbClient } from "./db.js";
import { createAdScheduleSweeper } from "./events/createAdScheduleSweeper.js";
import { createNotifyScreens } from "./events/createNotifyScreens.js";
import { createRateLimiter } from "./events/createRateLimiter.js";
import { createStatusSweeper } from "./events/createStatusSweeper.js";
import { EventHub } from "./events/hub.js";
import { createRotationLoader } from "./events/rotation.js";
import { createVerifyAccessToken } from "./identity/createVerifyAccessToken.js";
import { logger } from "./logger.js";
import { createContentStore } from "./media/contentStore.js";
import { createRenditionQueue } from "./media/createRenditionQueue.js";
import { createFfmpegRenderer, createFfprobe } from "./media/ffmpeg.js";

const config = loadConfig();
const db = createDbClient(config.databaseUrl);
const identity = createIdentityClient(config.identity.endpoint);
const mediaDir = config.mediaDir;
const sync = {
  db,
  hub: new EventHub(),
  loadRotation: createRotationLoader(mediaDir),
  loadScreenRotation: createScreenRotationLoader(db)
};
const notifyScreens = createNotifyScreens(sync);
const store = createContentStore(config.contentDir);
const queue = createRenditionQueue({ db, store, render: createFfmpegRenderer() });

createStatusSweeper(sync);
createAdScheduleSweeper({ db, notifyScreens });
void queue.resume();

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
  pairingLimiter: createRateLimiter(10, 60_000),
  media: { store, probe: createFfprobe(), queue, tempDir: join(tmpdir(), "proyecta-uploads") },
  notifyScreens
};

createApp(services, { mediaDir, contentDir: config.contentDir }).listen(config.port, () => {
  logger.info(`api listening on :${config.port}`);
});
