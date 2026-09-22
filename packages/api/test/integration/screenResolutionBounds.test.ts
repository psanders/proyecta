/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * screen-resolution-bounds is a gate on writes, not an invariant enforced on read (design.md,
 * "Existing screens are grandfathered"). A screen saved before the bounds existed can only reach
 * that state through a direct write — `createScreenSchema`/`updateScreenSchema` reject an
 * out-of-bounds resolution outright, so no amount of API or dashboard use can reproduce a legacy
 * row. This test seeds one the only way that's possible: a raw Prisma write, bypassing the schema
 * entirely, exactly as an already-stored row from before this change would look today.
 */
import { expect } from "chai";
import { TRPCError } from "@trpc/server";
import { ValidationError } from "@proyecta/common";
import { createDbClient } from "../../src/db.js";
import { EventHub } from "../../src/events/hub.js";
import { resolveContext, type Services } from "../../src/trpc/context.js";
import { appRouter } from "../../src/trpc/router.js";
import { createCallerFactory } from "../../src/trpc/trpc.js";
import { testConfig } from "./testConfig.js";

const db = createDbClient(testConfig().databaseUrl);
const hub = new EventHub();
const principal = (workspace: string) => ({
  userRef: "u1",
  accessKeyId: "US1",
  access: [{ accessKeyId: workspace, role: "WORKSPACE_ADMIN" }]
});
const services: Services = {
  identity: {} as Services["identity"],
  verifyAccessToken: async (token) =>
    token.startsWith("admin:") ? principal(token.slice(6)) : null,
  dashboardUrl: "http://app",
  identityBridgeUrl: "http://bridge",
  fetch,
  sync: {
    db,
    hub,
    loadRotation: async () => null,
    loadScreenRotation: async () => null
  },
  pairingLimiter: { take: () => true },
  media: {} as Services["media"],
  notifyScreens: async () => undefined
};
const createCaller = createCallerFactory(appRouter);
const dashboard = async (workspace: string) =>
  createCaller(
    await resolveContext(services, {
      authorization: `Bearer admin:${workspace}`,
      "x-workspace": workspace
    })
  );

describe("legacy out-of-bounds screen resolution (integration, Postgres)", function () {
  this.timeout(20_000);
  const stamp = Date.now();
  const WS = `WO-test-bounds-${stamp}`;

  after(async () => {
    await db.screen.deleteMany({ where: { workspaceAccessKeyId: WS } });
    await db.$disconnect();
  });

  it("still loads, lists and can be edited on unrelated fields, keeping its resolution untouched", async () => {
    // Arrange: a raw write, standing in for a row saved before this change existed.
    const legacy = await db.screen.create({
      data: {
        workspaceAccessKeyId: WS,
        name: "Valla Heredada",
        city: "Santo Domingo",
        resolution: "50000x2000" // Long side over the new 20,000px ceiling.
      }
    });
    const owner = await dashboard(WS);

    // Act + Assert: it loads.
    const fetched = await owner.screens.get({ id: legacy.id });
    expect(fetched.resolution).to.equal("50000x2000");

    // It lists.
    const list = await owner.screens.list({ archived: false });
    expect(list.screens.map((s) => s.id)).to.include(legacy.id);

    // An unrelated edit (renaming) succeeds without touching the out-of-bounds resolution.
    const updated = await owner.screens.update({
      id: legacy.id,
      name: "Valla Heredada Renovada",
      city: "Santo Domingo"
      // No `resolution`, as the dashboard sends when the field wasn't touched.
    });
    expect(updated.name).to.equal("Valla Heredada Renovada");
    expect(updated.resolution).to.equal("50000x2000");

    // It wasn't refused, altered or silently cleared — the row still carries the legacy value.
    const row = await db.screen.findUniqueOrThrow({ where: { id: legacy.id } });
    expect(row.resolution).to.equal("50000x2000");
  });

  it("still rejects a genuinely new out-of-bounds resolution on that same screen", async () => {
    // Arrange
    const legacy = await db.screen.create({
      data: {
        workspaceAccessKeyId: WS,
        name: "Valla Heredada 2",
        city: "Santo Domingo",
        resolution: "50000x2000"
      }
    });
    const owner = await dashboard(WS);

    // Act + Assert: the grandfather clause covers the untouched legacy value, not a fresh typo.
    try {
      await owner.screens.update({
        id: legacy.id,
        name: "Valla Heredada 2",
        city: "Santo Domingo",
        resolution: "640x360"
      });
      expect.fail("expected a validation error");
    } catch (err) {
      expect((err as TRPCError).code).to.equal("BAD_REQUEST");
      const cause = (err as TRPCError).cause;
      expect(cause).to.be.instanceOf(ValidationError);
      expect((cause as ValidationError).fieldErrors[0]).to.include({
        field: "resolution",
        message: "El lado más corto debe ser de al menos 480 píxeles"
      });
    }
  });
});
