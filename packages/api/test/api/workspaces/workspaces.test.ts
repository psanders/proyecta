/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { createAcceptInvitation, createRemoveMember } from "../../../src/api/workspaces/index.js";
import { DomainError } from "../../../src/identity/errors.js";

describe("workspace functions", () => {
  afterEach(() => sinon.restore());

  describe("createRemoveMember", () => {
    function identity() {
      return {
        listWorkspaces: sinon.stub().resolves({
          items: [{ ref: "ws-1", accessKeyId: "WO1", name: "Vallas", ownerRef: "owner-1" }]
        }),
        removeUserFromWorkspace: sinon.stub().resolves({ userRef: "member-1" })
      };
    }

    it("should remove a member", async () => {
      // Arrange
      const id = identity();

      // Act
      await createRemoveMember(id)({
        userRef: "member-1",
        workspaceAccessKeyId: "WO1",
        token: "t"
      });

      // Assert
      expect(id.removeUserFromWorkspace.firstCall.args).to.deep.equal(["member-1", "WO1", "t"]);
    });

    it("should never remove the owner", async () => {
      // Arrange
      const id = identity();

      // Act + Assert
      try {
        await createRemoveMember(id)({
          userRef: "owner-1",
          workspaceAccessKeyId: "WO1",
          token: "t"
        });
        expect.fail("expected DomainError");
      } catch (err) {
        expect((err as DomainError).code).to.equal("FORBIDDEN");
        expect(id.removeUserFromWorkspace.called).to.equal(false);
      }
    });
  });

  describe("createAcceptInvitation", () => {
    const redirect = (location: string) =>
      new Response(null, { status: 302, headers: { location } });

    it("should accept when the bridge redirects to the app", async () => {
      // Arrange
      const fetch = sinon.stub().resolves(redirect("http://localhost:5173/sign-in"));

      // Act
      const result = await createAcceptInvitation({
        bridgeUrl: "http://bridge",
        failPath: "/invitation-invalid",
        fetch
      })({ token: "abc" });

      // Assert
      expect(result).to.deep.equal({ accepted: true });
      expect(fetch.firstCall.args[0]).to.equal(
        "http://bridge/api/identity/accept-invite?token=abc"
      );
    });

    it("should reject when the bridge redirects to the failure page", async () => {
      // Arrange
      const fetch = sinon.stub().resolves(redirect("http://localhost:5173/invitation-invalid"));

      // Act + Assert
      try {
        await createAcceptInvitation({
          bridgeUrl: "http://bridge",
          failPath: "/invitation-invalid",
          fetch
        })({ token: "abc" });
        expect.fail("expected DomainError");
      } catch (err) {
        expect((err as DomainError).code).to.equal("BAD_REQUEST");
      }
    });
  });
});
