/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import { approveRequestSchema, rejectRequestSchema, revokePlacementSchema } from "../src/index.js";

const AD = "7f3c2a8e-1b2d-4c5e-9f00-112233445566";

describe("ad review schemas", () => {
  it("should require at least one screen to approve", () => {
    // Act
    const result = approveRequestSchema.safeParse({ adId: AD, screenIds: [] });

    // Assert
    expect(result.error!.issues[0]!.message).to.equal("validation.review.screens");
  });

  it("should require a note only for the Otro reason", () => {
    // Act
    const other = rejectRequestSchema.safeParse({ adId: AD, reason: "OTHER", note: "  " });
    const competitor = rejectRequestSchema.safeParse({ adId: AD, reason: "COMPETITOR" });

    // Assert
    expect(other.error!.issues[0]).to.include({ message: "validation.review.noteRequired" });
    expect(other.error!.issues[0]!.path).to.deep.equal(["note"]);
    expect(competitor.success).to.equal(true);
  });

  it("should reject an unknown reason and a note over 280 characters", () => {
    // Act
    const reason = rejectRequestSchema.safeParse({ adId: AD, reason: "UGLY" });
    const long = revokePlacementSchema.safeParse({ adId: AD, screenId: AD, note: "x".repeat(281) });

    // Assert
    expect(reason.error!.issues[0]!.message).to.equal("validation.review.reason");
    expect(long.error!.issues[0]!.message).to.equal("validation.review.noteMax");
  });
});
