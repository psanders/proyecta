/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import {
  createWorkspaceSchema,
  setDashboardViewSchema,
  showsAds,
  showsScreens
} from "../src/index.js";

describe("dashboard view", () => {
  it("should accept the three views and reject anything else", () => {
    // Act
    const both = setDashboardViewSchema.safeParse({ dashboardView: "BOTH" });
    const invalid = setDashboardViewSchema.safeParse({ dashboardView: "VALLERO" });

    // Assert
    expect(both.success).to.equal(true);
    expect(invalid.error!.issues[0]!.message).to.equal("validation.dashboardView.invalid");
  });

  it("should let a new business omit the view", () => {
    // Act + Assert
    expect(createWorkspaceSchema.safeParse({ name: "Café Aroma" }).success).to.equal(true);
  });

  it("should show each side only in the views that include it", () => {
    // Act + Assert
    expect([showsScreens("SCREEN_OWNER"), showsAds("SCREEN_OWNER")]).to.deep.equal([true, false]);
    expect([showsScreens("ADVERTISER"), showsAds("ADVERTISER")]).to.deep.equal([false, true]);
    expect([showsScreens("BOTH"), showsAds("BOTH")]).to.deep.equal([true, true]);
  });
});
