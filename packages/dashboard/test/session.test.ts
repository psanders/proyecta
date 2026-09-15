/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { TRPCClientError } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { createRefreshLink } from "../src/lib/refreshLink.js";
import { createSessionStore } from "../src/lib/session.js";
import { availabilitySummary, formatCents, formatPlays } from "../src/lib/format.js";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k)
  };
}

const unauthorized = () => {
  const error = new TRPCClientError("UNAUTHORIZED");
  (error as { data?: unknown }).data = { code: "UNAUTHORIZED" };
  return error;
};

/** Runs one operation through the link with a terminating `next` stub. */
function run(link: ReturnType<typeof createRefreshLink>, path: string, next: sinon.SinonStub) {
  const op = { path, type: "query", id: 1, input: undefined, context: {}, signal: null } as never;
  return new Promise<unknown>((resolve, reject) => {
    link({} as never)({ op, next: next as never }).subscribe({ next: resolve, error: reject });
  });
}

const respond = (value: unknown) => observable((o) => (o.next(value as never), o.complete()));
const fail = (err: unknown) => observable((o) => o.error(err as never));

describe("dashboard session", () => {
  afterEach(() => sinon.restore());

  it("should persist, update and clear the session and notify listeners", () => {
    // Arrange
    const storage = memoryStorage();
    const store = createSessionStore(storage);
    const listener = sinon.spy();
    store.subscribe(listener);

    // Act
    store.set({ accessToken: "a", refreshToken: "r", workspace: null });
    store.update({ workspace: "WO1" });

    // Assert
    expect(createSessionStore(storage).get()).to.deep.equal({
      accessToken: "a",
      refreshToken: "r",
      workspace: "WO1"
    });
    store.set(null);
    expect(createSessionStore(storage).get()).to.equal(null);
    expect(listener.callCount).to.equal(3);
  });

  it("should refresh once and retry a request that failed as unauthorized", async () => {
    // Arrange
    const store = createSessionStore(memoryStorage());
    store.set({ accessToken: "old", refreshToken: "r1", workspace: "WO1" });
    const refresh = sinon.stub().resolves({ accessToken: "new", refreshToken: "r2" });
    const next = sinon.stub();
    next.onFirstCall().returns(fail(unauthorized()));
    next.onSecondCall().returns(respond({ result: { data: "ok" } }));

    // Act
    const result = await run(createRefreshLink(store, refresh), "screens.list", next);

    // Assert
    expect(result).to.deep.equal({ result: { data: "ok" } });
    expect(refresh.calledOnceWith("r1")).to.equal(true);
    expect(store.get()).to.deep.include({
      accessToken: "new",
      refreshToken: "r2",
      workspace: "WO1"
    });
  });

  it("should sign out when the refresh fails", async () => {
    // Arrange
    const store = createSessionStore(memoryStorage());
    store.set({ accessToken: "old", refreshToken: "expired", workspace: "WO1" });
    const next = sinon.stub().returns(fail(unauthorized()));

    // Act + Assert
    try {
      await run(
        createRefreshLink(store, sinon.stub().rejects(new Error("401"))),
        "screens.list",
        next
      );
      expect.fail("expected error");
    } catch (err) {
      expect(err).to.be.instanceOf(TRPCClientError);
      expect(store.get()).to.equal(null);
    }
  });

  it("should not try to refresh failed auth calls", async () => {
    // Arrange
    const store = createSessionStore(memoryStorage());
    store.set({ accessToken: "a", refreshToken: "r", workspace: null });
    const refresh = sinon.stub();

    // Act + Assert
    await run(
      createRefreshLink(store, refresh),
      "auth.signIn",
      sinon.stub().returns(fail(unauthorized()))
    ).catch(() => undefined);
    expect(refresh.called).to.equal(false);
  });

  it("should summarize availability and format pay-per-display cents like the design", () => {
    expect(availabilitySummary([1, 2, 3, 4, 5], "08:00", "20:00")).to.equal("Lun–Vie · 8:00–20:00");
    expect(availabilitySummary([1, 2, 3, 4, 5, 6, 7], "09:00", "22:00")).to.equal(
      "Todos los días · 9:00–22:00"
    );
    expect(availabilitySummary([6, 7], "10:00", "18:00")).to.equal("Sáb, Dom · 10:00–18:00");
    expect(availabilitySummary([], "08:00", "20:00")).to.equal(null);
    expect(formatCents(250)).to.equal("US$ 2.50");
    expect(formatCents(45000)).to.equal("US$ 450.00");
    expect(formatPlays(1)).to.equal("1 reproducción");
    expect(formatPlays(12)).to.equal("12 reproducciones");
  });
});
