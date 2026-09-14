/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 *
 * Runs against the local stack (npm run db:up): Fonoster Identity + Mailpit.
 */
import { expect } from "chai";
import { createIdentityClient } from "@fonoster/identity-client";
import { TRPCError } from "@trpc/server";
import { loadConfig } from "../../src/config.js";
import { createVerifyAccessToken } from "../../src/identity/createVerifyAccessToken.js";
import { resolveContext, type Services } from "../../src/trpc/context.js";
import { appRouter } from "../../src/trpc/router.js";
import { createCallerFactory } from "../../src/trpc/trpc.js";

const config = loadConfig();
const mailpit = process.env.MAILPIT_URL ?? "http://localhost:8026";
const identity = createIdentityClient(config.identity.endpoint);
const services: Services = {
  identity,
  verifyAccessToken: createVerifyAccessToken({
    loadPublicKey: async () => (await identity.getPublicKey()).publicKey,
    issuer: config.identity.issuer,
    audience: config.identity.audience
  }),
  dashboardUrl: config.dashboardUrl,
  identityBridgeUrl: config.identity.bridgeUrl,
  fetch
};
const createCaller = createCallerFactory(appRouter);

async function caller(token?: string, workspace?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (workspace) headers["x-workspace"] = workspace;
  return createCaller(await resolveContext(services, headers));
}

function decodeEntities(html: string): string {
  return html
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, "&");
}

/** Waits for the newest email to `to` whose HTML matches `pattern`, and returns the match. */
async function waitForEmail(
  to: string,
  pattern: RegExp
): Promise<{ html: string; match: RegExpMatchArray }> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    for (const { ID } of messages) {
      const message = (await (await fetch(`${mailpit}/api/v1/message/${ID}`)).json()) as {
        HTML: string;
      };
      const html = decodeEntities(message.HTML);
      const match = html.match(pattern);
      if (match) return { html, match };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`no email to ${to} matching ${pattern}`);
}

async function expectCode(promise: Promise<unknown>, code: TRPCError["code"]) {
  try {
    await promise;
    expect.fail(`expected ${code}`);
  } catch (err) {
    expect((err as TRPCError).code).to.equal(code);
  }
}

describe("identity-auth (integration: Identity + Mailpit)", function () {
  this.timeout(60_000);

  const stamp = Date.now();
  const ownerEmail = `owner-${stamp}@proyecta.local`;
  const inviteeEmail = `staff-${stamp}@proyecta.local`;
  let ownerToken = "";
  let workspace = "";

  after(() => identity.close());

  it("signs up an owner with a first business", async () => {
    const session = await (
      await caller()
    ).auth.signUp({
      name: "Rosa Almonte",
      businessName: "Vallas del Cibao",
      email: ownerEmail,
      password: "supersecreta1"
    });
    ownerToken = session.accessToken;
    workspace = session.workspace.accessKeyId;

    const workspaces = await (await caller(ownerToken)).workspaces.list();
    expect(workspaces).to.deep.include({
      ref: session.workspace.ref,
      accessKeyId: workspace,
      name: "Vallas del Cibao",
      role: "WORKSPACE_OWNER"
    });
  });

  it("lets the owner rename the business", async () => {
    await (await caller(ownerToken, workspace)).workspaces.rename({ name: "Vallas del Cibao SRL" });
    const workspaces = await (await caller(ownerToken)).workspaces.list();
    expect(workspaces.find((w) => w.accessKeyId === workspace)?.name).to.equal(
      "Vallas del Cibao SRL"
    );
    await (await caller(ownerToken, workspace)).workspaces.rename({ name: "Vallas del Cibao" });
  });

  it("rejects a second sign up with the same email", async () => {
    await expectCode(
      (await caller()).auth.signUp({
        name: "Otra",
        businessName: "Otra",
        email: ownerEmail,
        password: "supersecreta1"
      }),
      "CONFLICT"
    );
  });

  it("rejects wrong credentials without saying which is wrong", async () => {
    await expectCode(
      (await caller()).auth.signIn({ email: ownerEmail, password: "incorrecta" }),
      "UNAUTHORIZED"
    );
  });

  it("invites a teammate who accepts from the Spanish email and signs in", async () => {
    const owner = await caller(ownerToken, workspace);
    await owner.workspaces.invite({
      email: inviteeEmail,
      role: "WORKSPACE_MEMBER",
      name: "Luis Peña"
    });

    const pending = await owner.workspaces.members();
    expect(pending.map((m) => [m.email, m.role, m.status])).to.deep.equal([
      [ownerEmail, "WORKSPACE_OWNER", "ACTIVE"],
      [inviteeEmail, "WORKSPACE_MEMBER", "PENDING"]
    ]);

    const { html, match } = await waitForEmail(inviteeEmail, /invitacion\?token=([^"&\s]+)/);
    expect(html).to.contain("Te invitaron a unirte a <b>Vallas del Cibao</b>");
    const password = html.match(/class="code">([0-9a-f]{10})</)?.[1];
    expect(password, "one-time password in email").to.be.a("string");

    await (await caller()).workspaces.acceptInvitation({ token: decodeURIComponent(match[1]!) });
    const active = await owner.workspaces.members();
    expect(active.find((m) => m.email === inviteeEmail)?.status).to.equal("ACTIVE");

    const staff = await (await caller()).auth.signIn({ email: inviteeEmail, password: password! });
    const staffCaller = await caller(staff.accessToken, workspace);
    const staffWorkspaces = await staffCaller.workspaces.list();
    expect(staffWorkspaces.find((w) => w.accessKeyId === workspace)?.role).to.equal(
      "WORKSPACE_MEMBER"
    );

    // Members can view but not manage.
    await expectCode(
      staffCaller.workspaces.invite({
        email: `x-${stamp}@proyecta.local`,
        role: "WORKSPACE_MEMBER"
      }),
      "FORBIDDEN"
    );
  });

  it("rejects an invalid invitation token", async () => {
    await expectCode(
      (await caller()).workspaces.acceptInvitation({ token: "not-a-real-token" }),
      "BAD_REQUEST"
    );
  });

  it("removes the teammate but never the owner", async () => {
    const owner = await caller(ownerToken, workspace);
    const members = await owner.workspaces.members();
    const staff = members.find((m) => m.email === inviteeEmail)!;
    const ownerRow = members.find((m) => m.role === "WORKSPACE_OWNER")!;

    await expectCode(owner.workspaces.removeMember({ userRef: ownerRow.userRef }), "FORBIDDEN");
    await owner.workspaces.removeMember({ userRef: staff.userRef });
    expect((await owner.workspaces.members()).map((m) => m.email)).to.deep.equal([ownerEmail]);
  });

  it("resets a forgotten password from the emailed link", async () => {
    await (await caller()).auth.requestPasswordReset({ email: ownerEmail });
    const { match } = await waitForEmail(ownerEmail, /restablecer\?token=([^"&\s]+)/);

    await (
      await caller()
    ).auth.resetPassword({ token: decodeURIComponent(match[1]!), password: "otraclave22" });

    await expectCode(
      (await caller()).auth.signIn({ email: ownerEmail, password: "supersecreta1" }),
      "UNAUTHORIZED"
    );
    const session = await (
      await caller()
    ).auth.signIn({ email: ownerEmail, password: "otraclave22" });
    expect(session.accessToken).to.be.a("string");
  });

  it("answers password reset requests for unknown emails the same way", async () => {
    const result = await (
      await caller()
    ).auth.requestPasswordReset({ email: `nobody-${stamp}@proyecta.local` });
    expect(result).to.deep.equal({ sent: true });
  });
});
