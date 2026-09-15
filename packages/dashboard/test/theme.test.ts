/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { THEME_KEY, createThemeStore, type ThemePreference } from "../src/lib/theme.js";

function fakeMedia(matches: boolean) {
  let handler: (() => void) | undefined;
  return {
    matches,
    addEventListener: (_: string, h: () => void) => void (handler = h),
    removeEventListener: sinon.spy(),
    /** Simulates the OS switching its color scheme. */
    change(next: boolean) {
      this.matches = next;
      handler?.();
    }
  };
}

function setup(stored: string | null, systemDark = false) {
  const data = new Map<string, string>();
  if (stored !== null) data.set(THEME_KEY, stored);
  const storage = {
    getItem: sinon.spy((k: string) => data.get(k) ?? null),
    setItem: sinon.spy((k: string, v: string) => void data.set(k, v))
  };
  const media = fakeMedia(systemDark);
  const root = { setAttribute: sinon.spy(), style: { colorScheme: "" } };
  const store = createThemeStore({ storage, media: media as never, root });
  return { store, storage, media, root, data };
}

describe("dashboard theme", () => {
  afterEach(() => sinon.restore());

  it("should default to system and follow a dark OS", () => {
    // Arrange
    const { store, root } = setup(null, true);

    // Act
    store.start();

    // Assert
    expect(store.get()).to.equal("system");
    expect(root.setAttribute.calledWith("data-theme", "dark")).to.equal(true);
    expect(root.style.colorScheme).to.equal("dark");
  });

  it("should persist and apply a chosen theme and notify listeners", () => {
    // Arrange
    const { store, root, data } = setup(null, true);
    const listener = sinon.spy();
    store.subscribe(listener);

    // Act
    store.set("light");

    // Assert
    expect(data.get(THEME_KEY)).to.equal("light");
    expect(root.setAttribute.lastCall.args).to.deep.equal(["data-theme", "light"]);
    expect(listener.calledOnce).to.equal(true);
    expect(setup("light", true).store.get()).to.equal("light");
  });

  it("should re-apply on OS changes only while the choice is system", () => {
    // Arrange
    const { store, root, media } = setup(null, false);
    store.start();

    // Act
    media.change(true);

    // Assert
    expect(root.setAttribute.lastCall.args).to.deep.equal(["data-theme", "dark"]);
    store.set("light");
    media.change(false);
    media.change(true);
    expect(store.resolved()).to.equal("light");
    expect(root.setAttribute.lastCall.args).to.deep.equal(["data-theme", "light"]);
  });

  it("should fall back to system when storage throws", () => {
    // Arrange
    const media = fakeMedia(false);
    const root = { setAttribute: sinon.spy(), style: { colorScheme: "" } };
    const storage = {
      getItem: sinon.stub().throws(new Error("blocked")),
      setItem: sinon.stub().throws(new Error("blocked"))
    };
    const store = createThemeStore({ storage, media: media as never, root });

    // Act
    store.set("dark");

    // Assert
    expect(store.resolved()).to.equal("dark");
    expect(createThemeStore({ storage, media: media as never, root }).get()).to.equal("system");
  });

  it("should treat an invalid stored value as system", () => {
    // Arrange
    const { store } = setup("sepia", false);

    // Act
    const preference = store.get();

    // Assert
    expect(preference).to.equal("system");
    expect(store.resolved()).to.equal("light");
  });

  it("should reject an invalid preference without storing or applying it", () => {
    // Arrange
    const { store, storage, root } = setup("dark", false);

    // Act
    const act = () => store.set("sepia" as ThemePreference);

    // Assert
    expect(act).to.throw(TypeError, "Invalid theme preference: sepia");
    expect(storage.setItem.called).to.equal(false);
    expect(root.setAttribute.called).to.equal(false);
    expect(store.get()).to.equal("dark");
  });
});
