/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import type { DeviceState } from "@proyecta/common";
import { UnauthorizedDeviceError } from "../src/protocol.js";
import { startSync, type SyncMode } from "../src/sync.js";

const state = (linked: boolean): DeviceState => ({
  linked,
  screen: linked ? { id: "s1", name: "Lobby" } : null,
  rotation: null,
  serverTime: new Date(0).toISOString()
});

describe("startSync", () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it("should deliver stream events in realtime mode", async () => {
    // Arrange
    const onState = sinon.spy();
    const modes: SyncMode[] = [];
    const client = {
      events: sinon
        .stub()
        .callsFake(
          async (
            _t: string,
            onEvent: (e: { type: string; data: DeviceState }) => void,
            onOpen: () => void
          ) => {
            onOpen();
            onEvent({ type: "linked", data: state(true) });
            await new Promise(() => undefined); // stays open
          }
        ),
      state: sinon.stub()
    };

    // Act
    const sync = startSync({
      client: client as never,
      token: "t",
      onState,
      onMode: (m) => modes.push(m)
    });
    await clock.tickAsync(10);

    // Assert
    expect(sync.mode()).to.equal("realtime");
    expect(onState.firstCall.args[0].linked).to.equal(true);
    expect(client.state.called).to.equal(false);
    sync.stop();
  });

  it("should fall back to polling after 3 stream failures and keep retrying the stream", async () => {
    // Arrange
    const onState = sinon.spy();
    const client = {
      events: sinon.stub().rejects(new Error("proxy closed the stream")),
      state: sinon.stub().resolves(state(true))
    };

    // Act: stream attempts at t=0, 2 s (backoff 2 s) and 6 s (backoff 4 s)
    const sync = startSync({ client: client as never, token: "t", onState, random: () => 0.5 });
    await clock.tickAsync(6_050);

    // Assert: third failure switches to polling and polls right away
    expect(client.events.callCount).to.equal(3);
    expect(sync.mode()).to.equal("polling");
    expect(client.state.callCount).to.equal(1);
    expect(onState.calledWith(sinon.match({ linked: true }))).to.equal(true);

    // The stream keeps being retried (backoff 8 s) while polling continues about every 60 s.
    await clock.tickAsync(8_000);
    expect(client.events.callCount).to.equal(4);
    await clock.tickAsync(60_000);
    expect(client.state.callCount).to.equal(2);
    sync.stop();
  });

  it("should report offline when neither stream nor polling reach the server", async () => {
    // Arrange
    const client = {
      events: sinon.stub().rejects(new TypeError("Failed to fetch")),
      state: sinon.stub().rejects(new TypeError("Failed to fetch"))
    };

    // Act
    const sync = startSync({ client: client as never, token: "t", onState: sinon.spy() });
    await clock.tickAsync(7_000);

    // Assert
    expect(sync.mode()).to.equal("offline");
    sync.stop();
  });

  it("should stop and ask to re-register when the token is rejected", async () => {
    // Arrange
    const onUnauthorized = sinon.spy();
    const client = {
      events: sinon.stub().rejects(new UnauthorizedDeviceError()),
      state: sinon.stub()
    };

    // Act
    startSync({ client: client as never, token: "t", onState: sinon.spy(), onUnauthorized });
    await clock.tickAsync(30_000);

    // Assert
    expect(onUnauthorized.calledOnce).to.equal(true);
    expect(client.events.calledOnce).to.equal(true);
  });
});
