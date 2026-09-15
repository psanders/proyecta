/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import {
  adScreenStatus,
  adStatus,
  createAdSchema,
  effectivePlacement,
  localDateString,
  startOfLocalDate,
  type AdTiming,
  type PlacementFacts
} from "../src/index.js";

const SCREEN = "7f3c2a8e-1b2d-4c5e-9f00-112233445566";
const ASSET = "8f3c2a8e-1b2d-4c5e-9f00-112233445566";
const base = {
  name: "Promo Verano",
  assetId: ASSET,
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  screenIds: [SCREEN]
};

const ad: AdTiming = {
  state: "SUBMITTED",
  startsAt: new Date("2026-06-01T04:00:00Z"),
  endsAt: new Date("2026-07-01T04:00:00Z")
};
const DURING = new Date("2026-06-10T15:00:00Z");
const row = (status: PlacementFacts["status"], minute: number, assetId = "a1"): PlacementFacts => ({
  id: `${status}-${minute}`,
  status,
  assetId,
  createdAt: new Date(Date.UTC(2026, 4, 1, 0, minute))
});

describe("ad schema", () => {
  it("should accept an ad with valid dates and screens", () => {
    // Act + Assert
    expect(createAdSchema.safeParse(base).success).to.equal(true);
  });

  it("should reject an end date before the start date", () => {
    // Act
    const result = createAdSchema.safeParse({ ...base, endDate: "2026-05-31" });

    // Assert
    expect(result.error!.issues[0]).to.include({ message: "validation.adDates.order" });
    expect(result.error!.issues[0]!.path).to.deep.equal(["endDate"]);
  });

  it("should reject an ad longer than 365 days, an invalid date and a repeated screen", () => {
    // Act
    const long = createAdSchema.safeParse({ ...base, endDate: "2027-06-02" });
    const invalid = createAdSchema.safeParse({ ...base, startDate: "2026-02-30" });
    const repeated = createAdSchema.safeParse({ ...base, screenIds: [SCREEN, SCREEN] });
    const none = createAdSchema.safeParse({ ...base, screenIds: [] });

    // Assert
    expect(long.error!.issues[0]!.message).to.equal("validation.adDates.tooLong");
    expect(invalid.error!.issues[0]!.message).to.equal("validation.date.format");
    expect(repeated.error!.issues[0]!.message).to.equal("validation.adScreens.duplicate");
    expect(none.error!.issues[0]!.message).to.equal("validation.adScreens.min");
  });

  it("should turn calendar dates into instants in the business time zone", () => {
    // Act + Assert
    expect(startOfLocalDate("2026-06-01", "America/Santo_Domingo").toISOString()).to.equal(
      "2026-06-01T04:00:00.000Z"
    );
    expect(startOfLocalDate("2026-06-30", "America/Santo_Domingo", 1).toISOString()).to.equal(
      "2026-07-01T04:00:00.000Z"
    );
    expect(localDateString(new Date("2026-06-01T03:30:00Z"), "America/Santo_Domingo")).to.equal(
      "2026-05-31"
    );
  });
});

describe("placement statuses", () => {
  it("should play the most recently approved file and ignore pending ones", () => {
    // Act + Assert
    expect(
      effectivePlacement([row("APPROVED", 1), row("APPROVED", 5), row("PENDING", 9)])!.id
    ).to.equal("APPROVED-5");
    expect(effectivePlacement([row("PENDING", 1)])).to.equal(null);
  });

  it("should show on air with a pending new file while the approved file keeps playing", () => {
    // Act
    const status = adScreenStatus(ad, [row("APPROVED", 1), row("PENDING", 5, "a2")], DURING);

    // Assert
    expect(status).to.deep.equal({ status: "ON_AIR", newFilePending: true });
  });

  it("should derive pending, scheduled, finished, cancelled and removed screens", () => {
    // Act + Assert
    expect(adScreenStatus(ad, [row("PENDING", 1)], DURING)!.status).to.equal("PENDING_APPROVAL");
    expect(
      adScreenStatus(ad, [row("APPROVED", 1)], new Date("2026-05-20T00:00:00Z"))!.status
    ).to.equal("SCHEDULED");
    expect(adScreenStatus(ad, [row("APPROVED", 1)], ad.endsAt)!.status).to.equal("FINISHED");
    expect(
      adScreenStatus({ ...ad, state: "CANCELED" }, [row("APPROVED", 1)], DURING)!.status
    ).to.equal("CANCELED");
    expect(adScreenStatus(ad, [row("WITHDRAWN", 1)], DURING)).to.equal(null);
    expect(adScreenStatus(ad, [row("REJECTED", 1)], DURING)!.status).to.equal("NOT_APPROVED");
  });

  it("should pick the ad status by precedence", () => {
    // Act + Assert
    expect(adStatus(ad, ["PENDING_APPROVAL", "ON_AIR"], DURING)).to.equal("ON_AIR");
    expect(adStatus(ad, ["PENDING_APPROVAL", "SCHEDULED"], DURING)).to.equal("SCHEDULED");
    expect(adStatus(ad, ["PENDING_APPROVAL"], DURING)).to.equal("PENDING_APPROVAL");
    expect(adStatus(ad, [], DURING)).to.equal("NO_SCREENS");
    expect(adStatus(ad, ["ON_AIR"], ad.endsAt)).to.equal("FINISHED");
    expect(adStatus({ ...ad, state: "CANCELED" }, ["ON_AIR"], DURING)).to.equal("CANCELED");
  });
});
