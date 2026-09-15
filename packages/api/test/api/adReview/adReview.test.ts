/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { ValidationError } from "@proyecta/common";
import {
  createApproveRequest,
  createRejectRequest,
  createRevokePlacement
} from "../../../src/api/adReview/createReviewFunctions.js";
import {
  createGetPendingRequestCount,
  createGetRequest,
  createListRequests,
  createListScreenAds
} from "../../../src/api/adReview/createReviewQueries.js";
import { DomainError } from "../../../src/identity/errors.js";

const AD = "0a0a0a0a-1b2d-4c5e-9f00-112233445566";
const GYM = "3a3a3a3a-1b2d-4c5e-9f00-112233445566";
const CLINIC = "4a4a4a4a-1b2d-4c5e-9f00-112233445566";
const NOW = new Date("2026-06-10T15:00:00Z");
const OWNER = { workspaceAccessKeyId: "WO-owner", userRef: "u-owner" };

const ad = (overrides: Record<string, unknown> = {}) => ({
  id: AD,
  workspaceAccessKeyId: "WO-adv",
  name: "Promo Verano",
  advertiserName: "Café Aroma",
  assetId: "a1",
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  startsAt: new Date("2026-06-01T04:00:00Z"),
  endsAt: new Date("2026-07-01T04:00:00Z"),
  state: "SUBMITTED",
  createdAt: new Date("2026-05-20T00:00:00Z"),
  asset: {
    id: "a1",
    name: "Promo Verano",
    kind: "VIDEO",
    durationMs: 15000,
    orientation: "LANDSCAPE",
    width: 1920,
    height: 1080,
    renditions: { webm: "/c/v.webm", mp4: "/c/v.mp4", poster: "/c/p.webp" }
  },
  ...overrides
});

const placement = (screenId: string, status: string, extra: Record<string, unknown> = {}) => ({
  id: `${screenId}-${status}`,
  adId: AD,
  screenId,
  assetId: "a1",
  status,
  createdAt: new Date("2026-05-20T00:00:00Z"),
  reasonCode: null,
  note: null,
  ad: ad(),
  screen: {
    id: screenId,
    name: screenId === GYM ? "Gimnasio Norte" : "Clínica Luz",
    city: "Santiago",
    placeType: "GYM",
    ratePerFiveSecondsCents: 75
  },
  ...extra
});

function stubs() {
  const db = {
    ad: { findFirst: sinon.stub().resolves(ad()) },
    screen: { findFirst: sinon.stub().resolves({ id: GYM }) },
    adPlacement: {
      findMany: sinon.stub().resolves([
        { id: "p-gym", screenId: GYM },
        { id: "p-clinic", screenId: CLINIC }
      ]),
      updateMany: sinon.stub().resolves({ count: 1 }),
      count: sinon.stub().resolves(1)
    },
    $transaction: sinon.stub().resolves([])
  };
  return { db, notifyScreens: sinon.stub().resolves(), now: () => NOW };
}

async function expectDomain(promise: Promise<unknown>, messageId: string) {
  try {
    await promise;
    expect.fail(`expected ${messageId}`);
  } catch (err) {
    expect(err).to.be.instanceOf(DomainError);
    expect((err as DomainError).messageId).to.equal(messageId);
  }
}

describe("ad review", () => {
  afterEach(() => sinon.restore());

  describe("createApproveRequest", () => {
    it("should approve the chosen screens, decline the rest and notify their players", async () => {
      // Arrange
      const deps = stubs();

      // Act
      await createApproveRequest(deps as never)({ ...OWNER, adId: AD, screenIds: [GYM] });

      // Assert
      const [approve, decline] = deps.db.$transaction.firstCall.args[0];
      expect(deps.db.adPlacement.updateMany.firstCall.args[0]).to.deep.equal({
        where: { id: { in: ["p-gym"] }, status: "PENDING" },
        data: {
          status: "APPROVED",
          reasonCode: null,
          note: null,
          decidedAt: NOW,
          decidedByUserRef: "u-owner"
        }
      });
      expect(deps.db.adPlacement.updateMany.secondCall.args[0]).to.deep.equal({
        where: { id: { in: ["p-clinic"] }, status: "PENDING" },
        data: {
          status: "REJECTED",
          reasonCode: "NOT_SUITABLE_FOR_VENUE",
          decidedAt: NOW,
          decidedByUserRef: "u-owner"
        }
      });
      expect([approve, decline]).to.have.length(2);
      expect(deps.notifyScreens.firstCall.args[0]).to.deep.equal([GYM]);
      const pendingQuery = deps.db.adPlacement.findMany.firstCall.args[0].where;
      expect(pendingQuery).to.deep.include({ adId: AD, assetId: "a1", status: "PENDING" });
      expect(pendingQuery.screen).to.deep.equal({ workspaceAccessKeyId: "WO-owner" });
    });

    it("should refuse a screen that isn't pending, a cancelled or ended ad and a foreign ad", async () => {
      // Arrange
      const deps = stubs();
      const canceled = stubs();
      canceled.db.ad.findFirst.resolves(ad({ state: "CANCELED" }));
      const ended = stubs();
      ended.db.ad.findFirst.resolves(ad({ endsAt: new Date("2026-06-01T00:00:00Z") }));
      const foreign = stubs();
      foreign.db.ad.findFirst.resolves(null);
      const input = { ...OWNER, adId: AD, screenIds: ["9a9a9a9a-1b2d-4c5e-9f00-112233445566"] };

      // Act + Assert
      await expectDomain(
        createApproveRequest(deps as never)(input),
        "errors.review.screenNotPending"
      );
      await expectDomain(createApproveRequest(canceled as never)(input), "errors.ad.canceled");
      await expectDomain(createApproveRequest(ended as never)(input), "errors.ad.finished");
      await expectDomain(createApproveRequest(foreign as never)(input), "errors.review.notFound");
      expect(deps.db.$transaction.called).to.equal(false);
    });

    it("should reject approving without screens before touching the database", async () => {
      // Arrange
      const deps = stubs();

      // Act + Assert
      try {
        await createApproveRequest(deps as never)({ ...OWNER, adId: AD, screenIds: [] });
        expect.fail("expected ValidationError");
      } catch (err) {
        expect(err).to.be.instanceOf(ValidationError);
        expect(deps.db.ad.findFirst.called).to.equal(false);
      }
    });
  });

  describe("createRejectRequest", () => {
    it("should reject every pending screen with the reason and note", async () => {
      // Arrange
      const deps = stubs();

      // Act
      await createRejectRequest(deps as never)({
        ...OWNER,
        adId: AD,
        reason: "COMPETITOR",
        note: "Ya anunciamos otra cafetería"
      });

      // Assert
      expect(deps.db.adPlacement.updateMany.firstCall.args[0]).to.deep.equal({
        where: { id: { in: ["p-gym", "p-clinic"] }, status: "PENDING" },
        data: {
          status: "REJECTED",
          reasonCode: "COMPETITOR",
          note: "Ya anunciamos otra cafetería",
          decidedAt: NOW,
          decidedByUserRef: "u-owner"
        }
      });
    });

    it("should refuse a request with nothing pending", async () => {
      // Arrange
      const deps = stubs();
      deps.db.adPlacement.findMany.resolves([]);

      // Act + Assert
      await expectDomain(
        createRejectRequest(deps as never)({ ...OWNER, adId: AD, reason: "LOW_QUALITY" }),
        "errors.review.nothingPending"
      );
    });
  });

  describe("createRevokePlacement", () => {
    it("should stop the ad on the screen and notify its player", async () => {
      // Arrange
      const deps = stubs();

      // Act
      await createRevokePlacement(deps as never)({
        ...OWNER,
        adId: AD,
        screenId: GYM,
        note: "Cambiamos la programación"
      });

      // Assert
      const update = deps.db.adPlacement.updateMany.firstCall.args[0];
      expect(update.where).to.deep.include({
        adId: AD,
        screenId: GYM,
        status: { in: ["APPROVED", "PENDING"] }
      });
      expect(update.data).to.deep.equal({
        status: "REVOKED",
        reasonCode: null,
        note: "Cambiamos la programación",
        decidedAt: NOW,
        decidedByUserRef: "u-owner"
      });
      expect(deps.notifyScreens.firstCall.args[0]).to.deep.equal([GYM]);
    });

    it("should refuse to stop an ad that isn't approved, and hide other businesses' screens", async () => {
      // Arrange
      const pending = stubs();
      pending.db.adPlacement.count.onFirstCall().resolves(0).onSecondCall().resolves(1);
      const foreign = stubs();
      foreign.db.adPlacement.count.resolves(0);
      const input = { ...OWNER, adId: AD, screenId: GYM };

      // Act + Assert
      await expectDomain(
        createRevokePlacement(pending as never)(input),
        "errors.review.notApproved"
      );
      await expectDomain(createRevokePlacement(foreign as never)(input), "errors.review.notFound");
    });
  });

  describe("queries", () => {
    it("should group placements into requests with per-screen statuses and tabs", async () => {
      // Arrange
      const db = {
        adPlacement: {
          findMany: sinon
            .stub()
            .resolves([
              placement(GYM, "PENDING"),
              placement(CLINIC, "REJECTED", { reasonCode: "NOT_SUITABLE_FOR_VENUE" })
            ])
        }
      };

      // Act
      const pending = await createListRequests({ db: db as never, now: () => NOW })({
        workspaceAccessKeyId: "WO-owner",
        tab: "PENDING"
      });
      const reviewed = await createListRequests({ db: db as never, now: () => NOW })({
        workspaceAccessKeyId: "WO-owner",
        tab: "REVIEWED"
      });

      // Assert
      expect(reviewed).to.have.length(0);
      expect(pending).to.have.length(1);
      expect(pending[0]).to.deep.include({ adId: AD, advertiserName: "Café Aroma", pending: true });
      expect(
        pending[0]!.screens.map((s) => [s.name, s.status, s.pending, s.reasonCode])
      ).to.deep.equal([
        ["Clínica Luz", "REJECTED", false, "NOT_SUITABLE_FOR_VENUE"],
        ["Gimnasio Norte", "PENDING_APPROVAL", true, null]
      ]);
      expect(db.adPlacement.findMany.firstCall.args[0].where).to.deep.include({
        screen: { workspaceAccessKeyId: "WO-owner" },
        ad: { workspaceAccessKeyId: { not: "WO-owner" } }
      });
    });

    it("should move an ended request with a pending screen to Revisadas as Sin respuesta", async () => {
      // Arrange
      const db = { adPlacement: { findMany: sinon.stub().resolves([placement(GYM, "PENDING")]) } };
      const later = new Date("2026-07-02T00:00:00Z");

      // Act
      const reviewed = await createListRequests({ db: db as never, now: () => later })({
        workspaceAccessKeyId: "WO-owner",
        tab: "REVIEWED"
      });

      // Assert
      expect(reviewed[0]).to.deep.include({ pending: false, open: false });
      expect(reviewed[0]!.screens[0]!.status).to.equal("NO_RESPONSE");
    });

    it("should fail for a request with nothing on the owner's screens", async () => {
      // Arrange
      const db = { adPlacement: { findMany: sinon.stub().resolves([]) } };

      // Act + Assert
      await expectDomain(
        createGetRequest({ db: db as never })({ workspaceAccessKeyId: "WO-owner", adId: AD }),
        "errors.review.notFound"
      );
    });

    it("should count distinct pending ads that are still open", async () => {
      // Arrange
      const db = { adPlacement: { findMany: sinon.stub().resolves([{ adId: AD }]) } };

      // Act
      const result = await createGetPendingRequestCount({ db: db as never, now: () => NOW })({
        workspaceAccessKeyId: "WO-owner"
      });

      // Assert
      expect(result).to.deep.equal({ count: 1 });
      const query = db.adPlacement.findMany.firstCall.args[0];
      expect(query.distinct).to.deep.equal(["adId"]);
      expect(query.where.ad).to.deep.equal({
        workspaceAccessKeyId: { not: "WO-owner" },
        state: "SUBMITTED",
        endsAt: { gt: NOW }
      });
    });

    it("should list pending and approved ads on one of the owner's screens", async () => {
      // Arrange
      const db = {
        screen: { findFirst: sinon.stub().resolves({ id: GYM }) },
        adPlacement: {
          findMany: sinon.stub().resolves([placement(GYM, "APPROVED")])
        }
      };

      // Act
      const ads = await createListScreenAds({ db: db as never, now: () => NOW })({
        workspaceAccessKeyId: "WO-owner",
        screenId: GYM
      });

      // Assert
      expect(ads).to.deep.equal([
        {
          adId: AD,
          adName: "Promo Verano",
          advertiserName: "Café Aroma",
          startDate: "2026-06-01",
          endDate: "2026-06-30",
          status: "ON_AIR"
        }
      ]);
    });
  });
});
