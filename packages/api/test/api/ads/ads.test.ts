/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { ValidationError } from "@proyecta/common";
import {
  createAddAdScreens,
  createCancelAd,
  createCreateAd,
  createRemoveAdScreen,
  createReplaceAdAsset
} from "../../../src/api/ads/createAdFunctions.js";
import { DomainError } from "../../../src/identity/errors.js";

const AD = "0a0a0a0a-1b2d-4c5e-9f00-112233445566";
const ASSET = "1a1a1a1a-1b2d-4c5e-9f00-112233445566";
const ASSET_2 = "2a2a2a2a-1b2d-4c5e-9f00-112233445566";
const OWN_SCREEN = "3a3a3a3a-1b2d-4c5e-9f00-112233445566";
const OTHER_SCREEN = "4a4a4a4a-1b2d-4c5e-9f00-112233445566";
const NOW = new Date("2026-06-10T15:00:00Z"); // June 10, 11:00 in Santo Domingo

const asset = (overrides: Record<string, unknown> = {}) => ({
  id: ASSET,
  workspaceAccessKeyId: "WO1",
  status: "READY",
  orientation: "LANDSCAPE",
  ...overrides
});

const screens = [
  { id: OWN_SCREEN, workspaceAccessKeyId: "WO1", orientation: "LANDSCAPE" },
  { id: OTHER_SCREEN, workspaceAccessKeyId: "WO2", orientation: null }
];

const existingAd = (overrides: Record<string, unknown> = {}) => ({
  id: AD,
  workspaceAccessKeyId: "WO1",
  assetId: ASSET,
  state: "SUBMITTED",
  startsAt: new Date("2026-06-01T04:00:00Z"),
  endsAt: new Date("2026-07-01T04:00:00Z"),
  asset: asset(),
  placements: [
    { screenId: OWN_SCREEN, status: "APPROVED" },
    { screenId: OTHER_SCREEN, status: "PENDING" }
  ],
  ...overrides
});

function stubs() {
  const db = {
    asset: { findFirst: sinon.stub().resolves(asset()) },
    workspaceSettings: { findUnique: sinon.stub().resolves(null) },
    screen: { findMany: sinon.stub().resolves(screens) },
    ad: {
      create: sinon.stub().resolves({ id: AD }),
      findFirst: sinon.stub().resolves(existingAd()),
      update: sinon.stub().resolves({})
    },
    adPlacement: {
      createMany: sinon.stub().resolves({ count: 1 }),
      updateMany: sinon.stub().resolves({ count: 1 }),
      findMany: sinon.stub().resolves([])
    },
    $transaction: sinon.stub().resolves([])
  };
  return { db, notifyScreens: sinon.stub().resolves(), now: () => NOW };
}

const create = (overrides: Record<string, unknown> = {}) => ({
  workspaceAccessKeyId: "WO1",
  advertiserName: "Café Aroma",
  name: "Promo Verano",
  assetId: ASSET,
  startDate: "2026-06-10",
  endDate: "2026-06-30",
  screenIds: [OWN_SCREEN, OTHER_SCREEN],
  ...overrides
});

async function expectDomain(promise: Promise<unknown>, messageId: string) {
  try {
    await promise;
    expect.fail(`expected ${messageId}`);
  } catch (err) {
    expect(err).to.be.instanceOf(DomainError);
    expect((err as DomainError).messageId).to.equal(messageId);
  }
}

describe("ad functions", () => {
  afterEach(() => sinon.restore());

  describe("createCreateAd", () => {
    it("should approve own screens, leave other businesses' pending and notify players", async () => {
      // Arrange
      const deps = stubs();

      // Act
      const result = await createCreateAd(deps as never)(create());

      // Assert
      const data = deps.db.ad.create.firstCall.args[0].data;
      expect(result).to.deep.equal({ id: AD });
      expect(data).to.include({ advertiserName: "Café Aroma", startDate: "2026-06-10" });
      expect(data.startsAt.toISOString()).to.equal("2026-06-10T04:00:00.000Z");
      expect(data.endsAt.toISOString()).to.equal("2026-07-01T04:00:00.000Z");
      expect(data.placements.create).to.deep.equal([
        {
          screenId: OWN_SCREEN,
          assetId: ASSET,
          status: "APPROVED",
          decidedAt: NOW,
          decidedByUserRef: null
        },
        {
          screenId: OTHER_SCREEN,
          assetId: ASSET,
          status: "PENDING",
          decidedAt: null,
          decidedByUserRef: null
        }
      ]);
      // Only the approved placement changes a rotation.
      expect(deps.notifyScreens.firstCall.args[0]).to.deep.equal([OWN_SCREEN]);
    });

    it("should reject a start date before today in the business time zone", async () => {
      // Arrange
      const deps = stubs();

      // Act + Assert
      await expectDomain(
        createCreateAd(deps as never)(create({ startDate: "2026-06-09" })),
        "errors.ad.startInPast"
      );
      expect(deps.db.ad.create.called).to.equal(false);
    });

    it("should reject a file that isn't ready and a screen of the wrong orientation", async () => {
      // Arrange
      const processing = stubs();
      processing.db.asset.findFirst.resolves(asset({ status: "PROCESSING" }));
      const portrait = stubs();
      portrait.db.asset.findFirst.resolves(asset({ orientation: "PORTRAIT" }));

      // Act + Assert
      await expectDomain(createCreateAd(processing as never)(create()), "errors.asset.notReady");
      await expectDomain(
        createCreateAd(portrait as never)(create()),
        "errors.ad.orientationMismatch"
      );
    });

    it("should reject screens that left the catalog", async () => {
      // Arrange
      const deps = stubs();
      deps.db.screen.findMany.resolves([screens[0]]);

      // Act + Assert
      await expectDomain(createCreateAd(deps as never)(create()), "errors.ad.screenUnavailable");
    });

    it("should reject invalid input without touching the database", async () => {
      // Arrange
      const deps = stubs();

      // Act + Assert
      try {
        await createCreateAd(deps as never)(create({ endDate: "2026-06-01" }));
        expect.fail("expected ValidationError");
      } catch (err) {
        expect(err).to.be.instanceOf(ValidationError);
        expect(deps.db.asset.findFirst.called).to.equal(false);
      }
    });
  });

  describe("approval reuse", () => {
    it("should start approved where the owner's latest decision on the file was an approval", async () => {
      // Arrange
      const deps = stubs();
      deps.db.adPlacement.findMany.resolves([
        { screenId: OTHER_SCREEN, status: "WITHDRAWN", decidedByUserRef: "owner-1" },
        { screenId: OTHER_SCREEN, status: "REJECTED", decidedByUserRef: "owner-1" }
      ]);

      // Act
      await createCreateAd(deps as never)(create());

      // Assert
      const query = deps.db.adPlacement.findMany.firstCall.args[0];
      expect(query.where).to.deep.equal({
        assetId: ASSET,
        screenId: { in: [OTHER_SCREEN] },
        decidedAt: { not: null }
      });
      expect(query.orderBy).to.deep.equal({ decidedAt: "desc" });
      expect(deps.db.ad.create.firstCall.args[0].data.placements.create[1]).to.deep.equal({
        screenId: OTHER_SCREEN,
        assetId: ASSET,
        status: "APPROVED",
        decidedAt: NOW,
        decidedByUserRef: "owner-1"
      });
    });

    it("should ask again where the owner's latest decision was a rejection or a stop", async () => {
      // Arrange
      const deps = stubs();
      deps.db.adPlacement.findMany.resolves([
        { screenId: OTHER_SCREEN, status: "REVOKED", decidedByUserRef: "owner-1" },
        { screenId: OTHER_SCREEN, status: "APPROVED", decidedByUserRef: "owner-1" }
      ]);

      // Act
      await createCreateAd(deps as never)(create());

      // Assert
      expect(deps.db.ad.create.firstCall.args[0].data.placements.create[1]).to.include({
        status: "PENDING",
        decidedAt: null
      });
    });
  });

  describe("changing screens", () => {
    it("should let a rejected screen be added again", async () => {
      // Arrange
      const deps = stubs();
      deps.db.ad.findFirst.resolves(
        existingAd({ placements: [{ screenId: OTHER_SCREEN, status: "REJECTED" }] })
      );
      deps.db.screen.findMany.resolves([screens[1]]);

      // Act
      await createAddAdScreens(deps as never)({
        id: AD,
        workspaceAccessKeyId: "WO1",
        screenIds: [OTHER_SCREEN]
      });

      // Assert
      expect(deps.db.adPlacement.createMany.firstCall.args[0].data[0]).to.include({
        status: "PENDING"
      });
    });

    it("should refuse a screen that is already in the ad", async () => {
      // Arrange
      const deps = stubs();

      // Act + Assert
      await expectDomain(
        createAddAdScreens(deps as never)({
          id: AD,
          workspaceAccessKeyId: "WO1",
          screenIds: [OWN_SCREEN]
        }),
        "errors.ad.screenAlreadyInAd"
      );
    });

    it("should add a removed screen back with the current file", async () => {
      // Arrange
      const deps = stubs();
      deps.db.ad.findFirst.resolves(
        existingAd({ placements: [{ screenId: OTHER_SCREEN, status: "WITHDRAWN" }] })
      );
      deps.db.screen.findMany.resolves([screens[1]]);

      // Act
      await createAddAdScreens(deps as never)({
        id: AD,
        workspaceAccessKeyId: "WO1",
        screenIds: [OTHER_SCREEN]
      });

      // Assert
      expect(deps.db.adPlacement.createMany.firstCall.args[0].data).to.deep.equal([
        {
          adId: AD,
          screenId: OTHER_SCREEN,
          assetId: ASSET,
          status: "PENDING",
          decidedAt: null,
          decidedByUserRef: null
        }
      ]);
    });

    it("should withdraw a removed screen's placements and notify its player", async () => {
      // Arrange
      const deps = stubs();

      // Act
      await createRemoveAdScreen(deps as never)({
        id: AD,
        workspaceAccessKeyId: "WO1",
        screenId: OWN_SCREEN
      });

      // Assert
      expect(deps.db.adPlacement.updateMany.firstCall.args[0]).to.deep.equal({
        where: { adId: AD, screenId: OWN_SCREEN, status: { in: ["PENDING", "APPROVED"] } },
        data: { status: "WITHDRAWN", withdrawnAt: NOW }
      });
      expect(deps.notifyScreens.firstCall.args[0]).to.deep.equal([OWN_SCREEN]);
    });
  });

  describe("createReplaceAdAsset", () => {
    it("should add placements for the new file and withdraw pending old ones", async () => {
      // Arrange
      const deps = stubs();
      deps.db.asset.findFirst.resolves(asset({ id: ASSET_2 }));

      // Act
      await createReplaceAdAsset(deps as never)({
        id: AD,
        workspaceAccessKeyId: "WO1",
        assetId: ASSET_2
      });

      // Assert
      expect(deps.db.adPlacement.updateMany.firstCall.args[0]).to.deep.equal({
        where: { adId: AD, status: "PENDING" },
        data: { status: "WITHDRAWN", withdrawnAt: NOW }
      });
      expect(deps.db.adPlacement.createMany.firstCall.args[0].data).to.deep.equal([
        {
          adId: AD,
          screenId: OWN_SCREEN,
          assetId: ASSET_2,
          status: "APPROVED",
          decidedAt: NOW,
          decidedByUserRef: null
        },
        {
          adId: AD,
          screenId: OTHER_SCREEN,
          assetId: ASSET_2,
          status: "PENDING",
          decidedAt: null,
          decidedByUserRef: null
        }
      ]);
      expect(deps.db.ad.update.firstCall.args[0].data).to.deep.equal({ assetId: ASSET_2 });
      expect(deps.db.$transaction.calledOnce).to.equal(true);
    });

    it("should refuse the same file or a different orientation", async () => {
      // Arrange
      const same = stubs();
      const portrait = stubs();
      portrait.db.asset.findFirst.resolves(asset({ id: ASSET_2, orientation: "PORTRAIT" }));

      // Act + Assert
      await expectDomain(
        createReplaceAdAsset(same as never)({
          id: AD,
          workspaceAccessKeyId: "WO1",
          assetId: ASSET
        }),
        "errors.asset.sameFile"
      );
      await expectDomain(
        createReplaceAdAsset(portrait as never)({
          id: AD,
          workspaceAccessKeyId: "WO1",
          assetId: ASSET_2
        }),
        "errors.asset.orientationMismatch"
      );
    });
  });

  describe("createCancelAd", () => {
    it("should cancel the ad and notify every screen in it", async () => {
      // Arrange
      const deps = stubs();

      // Act
      await createCancelAd(deps as never)({ id: AD, workspaceAccessKeyId: "WO1" });

      // Assert
      expect(deps.db.ad.update.firstCall.args[0].data).to.deep.equal({
        state: "CANCELED",
        canceledAt: NOW
      });
      expect(deps.notifyScreens.firstCall.args[0]).to.deep.equal([OWN_SCREEN, OTHER_SCREEN]);
    });

    it("should refuse to change a cancelled, finished or foreign ad", async () => {
      // Arrange
      const canceled = stubs();
      canceled.db.ad.findFirst.resolves(existingAd({ state: "CANCELED" }));
      const finished = stubs();
      finished.db.ad.findFirst.resolves(existingAd({ endsAt: new Date("2026-06-01T04:00:00Z") }));
      const foreign = stubs();
      foreign.db.ad.findFirst.resolves(null);
      const input = { id: AD, workspaceAccessKeyId: "WO1", screenIds: [OWN_SCREEN] };

      // Act + Assert
      await expectDomain(createAddAdScreens(canceled as never)(input), "errors.ad.canceled");
      await expectDomain(createCancelAd(finished as never)(input), "errors.ad.finished");
      await expectDomain(createCancelAd(foreign as never)(input), "errors.ad.notFound");
    });
  });
});
