/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import { createRateLimiter } from "../../../src/events/createRateLimiter.js";
import { EventHub } from "../../../src/events/hub.js";
import { deriveStatus } from "../../../src/events/status.js";

describe("live status building blocks", () => {
  const now = new Date("2026-09-14T12:00:00Z");
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

  describe("deriveStatus", () => {
    it("should be UNLINKED without a device", () => {
      expect(deriveStatus({ linked: false, lastSeenAt: now, streamOpen: true, now })).to.equal(
        "UNLINKED"
      );
    });

    it("should be ONLINE with an open stream regardless of last activity", () => {
      expect(deriveStatus({ linked: true, lastSeenAt: ago(60), streamOpen: true, now })).to.equal(
        "ONLINE"
      );
    });

    it("should go STALE after 2 minutes and OFFLINE after 10", () => {
      expect(deriveStatus({ linked: true, lastSeenAt: ago(1.9), streamOpen: false, now })).to.equal(
        "ONLINE"
      );
      expect(deriveStatus({ linked: true, lastSeenAt: ago(5), streamOpen: false, now })).to.equal(
        "STALE"
      );
      expect(deriveStatus({ linked: true, lastSeenAt: ago(11), streamOpen: false, now })).to.equal(
        "OFFLINE"
      );
    });
  });

  describe("EventHub", () => {
    it("should count streams per device and close each only once", () => {
      // Arrange
      const hub = new EventHub();
      const closeA = hub.openStream("d1");
      const closeB = hub.openStream("d1");

      // Act
      closeA();
      closeA();

      // Assert
      expect(hub.isStreamOpen("d1")).to.equal(true);
      closeB();
      expect(hub.isStreamOpen("d1")).to.equal(false);
    });

    it("should deliver workspace events only to that workspace and stop after unsubscribe", () => {
      // Arrange
      const hub = new EventHub();
      const received: string[] = [];
      const unsubscribe = hub.subscribeWorkspace("WO1", (e) => received.push(e.screenId));

      // Act
      hub.publishToWorkspace("WO2", { screenId: "other", status: "ONLINE" });
      hub.publishToWorkspace("WO1", { screenId: "mine", status: "ONLINE" });
      unsubscribe();
      hub.publishToWorkspace("WO1", { screenId: "late", status: "OFFLINE" });

      // Assert
      expect(received).to.deep.equal(["mine"]);
    });
  });

  describe("createRateLimiter", () => {
    it("should allow `limit` attempts per window per key", () => {
      // Arrange
      let clock = 0;
      const limiter = createRateLimiter(2, 60_000, () => clock);

      // Act + Assert
      expect([limiter.take("WO1"), limiter.take("WO1"), limiter.take("WO1")]).to.deep.equal([
        true,
        true,
        false
      ]);
      expect(limiter.take("WO2")).to.equal(true);
      clock = 60_000;
      expect(limiter.take("WO1")).to.equal(true);
    });
  });
});
