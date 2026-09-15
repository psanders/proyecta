/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { ValidationError } from "@proyecta/common";
import {
  createGetAd,
  createListAds,
  createListCatalogScreens
} from "../../../src/api/ads/createAdQueries.js";
import { createScreenRotationLoader } from "../../../src/api/ads/createScreenRotationLoader.js";
import { DomainError } from "../../../src/identity/errors.js";

const AD = "0a0a0a0a-1b2d-4c5e-9f00-112233445566";
const OWN_SCREEN = "3a3a3a3a-1b2d-4c5e-9f00-112233445566";
const OTHER_SCREEN = "4a4a4a4a-1b2d-4c5e-9f00-112233445566";
const NOW = new Date("2026-06-10T15:00:00Z");
const at = (minute: number) => new Date(Date.UTC(2026, 5, 9, 0, minute));

const adRow = (overrides: Record<string, unknown> = {}) => ({
  id: AD,
  workspaceAccessKeyId: "WO1",
  name: "Promo Verano",
  advertiserName: "Café Aroma",
  assetId: "a1",
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  startsAt: new Date("2026-06-01T04:00:00Z"),
  endsAt: new Date("2026-07-01T04:00:00Z"),
  state: "SUBMITTED",
  createdAt: at(0),
  asset: {
    id: "a1",
    name: "Promo Verano",
    kind: "VIDEO",
    durationMs: 15000,
    orientation: "LANDSCAPE",
    renditions: { poster: "/content/a1/poster.webp" }
  },
  placements: [
    { id: "p1", screenId: OWN_SCREEN, assetId: "a1", status: "APPROVED", createdAt: at(1) },
    { id: "p2", screenId: OTHER_SCREEN, assetId: "a1", status: "PENDING", createdAt: at(1) },
    { id: "p3", screenId: "gone", assetId: "a1", status: "WITHDRAWN", createdAt: at(1) }
  ],
  ...overrides
});

describe("ad queries", () => {
  afterEach(() => sinon.restore());

  it("should list catalog screens with the viewer's own screens marked", async () => {
    // Arrange
    const db = {
      screen: {
        findMany: sinon.stub().resolves([
          { id: OWN_SCREEN, workspaceAccessKeyId: "WO1", ratePerFiveSecondsCents: 90 },
          { id: OTHER_SCREEN, workspaceAccessKeyId: "WO2", ratePerFiveSecondsCents: 250 }
        ])
      }
    };

    // Act
    const list = await createListCatalogScreens({ db: db as never })({
      workspaceAccessKeyId: "WO1",
      city: "santiago"
    });

    // Assert
    expect(list.map((s) => s.own)).to.deep.equal([true, false]);
    const where = db.screen.findMany.firstCall.args[0].where;
    expect(where).to.deep.include({
      status: "ACTIVE",
      deletedAt: null,
      city: { equals: "santiago", mode: "insensitive" }
    });
  });

  it("should reject an unknown place type filter", async () => {
    // Arrange
    const db = { screen: { findMany: sinon.stub() } };

    // Act + Assert
    try {
      await createListCatalogScreens({ db: db as never })({
        workspaceAccessKeyId: "WO1",
        placeType: "CASINO"
      });
      expect.fail("expected ValidationError");
    } catch (err) {
      expect(err).to.be.instanceOf(ValidationError);
      expect(db.screen.findMany.called).to.equal(false);
    }
  });

  it("should list ads with a derived status and approved screen count", async () => {
    // Arrange
    const db = { ad: { findMany: sinon.stub().resolves([adRow()]) } };

    // Act
    const [item] = await createListAds({ db: db as never, now: () => NOW })({
      workspaceAccessKeyId: "WO1"
    });

    // Assert
    expect(item).to.deep.include({ status: "ON_AIR", screens: { total: 2, approved: 1 } });
    expect(item!.asset.poster).to.equal("/content/a1/poster.webp");
  });

  it("should report per-screen status, plays, house plays and spend", async () => {
    // Arrange
    const db = {
      ad: { findFirst: sinon.stub().resolves(adRow()) },
      screen: {
        findMany: sinon.stub().resolves([
          {
            id: OWN_SCREEN,
            name: "Farmacia Luz",
            city: "Santo Domingo",
            placeType: "HEALTH",
            workspaceAccessKeyId: "WO1",
            ratePerFiveSecondsCents: 90
          },
          {
            id: OTHER_SCREEN,
            name: "Valla 27",
            city: "Santo Domingo",
            placeType: "BILLBOARD",
            workspaceAccessKeyId: "WO2",
            ratePerFiveSecondsCents: 200
          }
        ])
      },
      playLog: {
        findMany: sinon.stub().resolves([
          ...Array.from({ length: 4 }, () => ({
            placementId: "p1",
            billedUnits: null,
            rateCentsAtPlay: null,
            house: true
          })),
          ...Array.from({ length: 10 }, () => ({
            placementId: "p2",
            billedUnits: 3,
            rateCentsAtPlay: 200,
            house: false
          }))
        ])
      }
    };

    // Act
    const detail = await createGetAd({ db: db as never, now: () => NOW })({
      id: AD,
      workspaceAccessKeyId: "WO1"
    });

    // Assert
    expect(detail.stats).to.deep.equal({ plays: 14, housePlays: 4, spendCents: 6000 });
    const [own, other] = detail.adScreens;
    expect(own).to.deep.include({
      own: true,
      status: "ON_AIR",
      plays: 4,
      housePlays: 4,
      spendCents: 0
    });
    expect(other).to.deep.include({ own: false, status: "PENDING_APPROVAL", spendCents: 6000 });
    expect(detail.adScreens).to.have.length(2);
  });

  it("should not find another business's ad", async () => {
    // Arrange
    const db = { ad: { findFirst: sinon.stub().resolves(null) } };

    // Act + Assert
    try {
      await createGetAd({ db: db as never })({ id: AD, workspaceAccessKeyId: "WO9" });
      expect.fail("expected NOT_FOUND");
    } catch (err) {
      expect((err as DomainError).messageId).to.equal("errors.ad.notFound");
    }
  });
});

describe("createScreenRotationLoader", () => {
  const placement = (id: string, adId: string, minute: number, asset: Record<string, unknown>) => ({
    id,
    adId,
    status: "APPROVED",
    createdAt: at(minute),
    ad: { name: `Ad ${adId}`, advertiserName: "Café Aroma", createdAt: at(adId === "ad1" ? 0 : 5) },
    asset: {
      kind: "VIDEO",
      durationMs: 15000,
      renditions: { webm: "/c/v.webm", mp4: "/c/v.mp4" },
      ...asset
    }
  });

  it("should build a manifest of each in-date ad's most recently approved file", async () => {
    // Arrange
    const db = {
      adPlacement: {
        findMany: sinon.stub().resolves([
          placement("old", "ad1", 1, {}),
          placement("new", "ad1", 9, {
            kind: "IMAGE",
            durationMs: 10000,
            renditions: { webp: "/c/i.webp" }
          }),
          placement("other", "ad2", 2, {})
        ])
      }
    };

    // Act
    const manifest = await createScreenRotationLoader(db as never)(
      { id: OWN_SCREEN, name: "Farmacia Luz", resolution: "1280x720" },
      NOW
    );

    // Assert
    expect(manifest!.items.map((i) => i.id)).to.deep.equal(["new", "other"]);
    expect(manifest!.items[0]).to.deep.include({
      type: "image",
      advertiser: "Café Aroma",
      durationMs: 10000,
      renditions: { webp: "/c/i.webp" }
    });
    expect(manifest).to.include({ width: 1280, height: 720, screenName: "Farmacia Luz" });
    const where = db.adPlacement.findMany.firstCall.args[0].where;
    expect(where).to.deep.include({ screenId: OWN_SCREEN, status: "APPROVED" });
    expect(where.ad).to.deep.equal({
      state: "SUBMITTED",
      startsAt: { lte: NOW },
      endsAt: { gt: NOW }
    });
  });

  it("should return null for a screen without approved in-date ads", async () => {
    // Arrange
    const db = { adPlacement: { findMany: sinon.stub().resolves([]) } };

    // Act
    const manifest = await createScreenRotationLoader(db as never)(
      { id: OWN_SCREEN, name: "Farmacia Luz", resolution: null },
      NOW
    );

    // Assert
    expect(manifest).to.equal(null);
  });
});
