/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import {
  LANGUAGE_KEY,
  createLanguageStore,
  messages,
  translate,
  type Language,
  type Translate
} from "../src/lib/i18n.js";
import { availabilitySummary, formatCents, formatPlays, relativeTime } from "../src/lib/format.js";

function setup(stored: string | null, preferred: string[] = ["es-DO"]) {
  const data = new Map<string, string>();
  if (stored !== null) data.set(LANGUAGE_KEY, stored);
  const storage = {
    getItem: sinon.spy((k: string) => data.get(k) ?? null),
    setItem: sinon.spy((k: string, v: string) => void data.set(k, v))
  };
  const root = { setAttribute: sinon.spy() };
  const store = createLanguageStore({ storage, preferred, root });
  return { store, storage, root, data };
}

const tr =
  (language: Language): Translate =>
  (id, vars) =>
    translate(language, id, vars);

describe("dashboard i18n", () => {
  afterEach(() => sinon.restore());

  describe("messages", () => {
    it("should have non-empty English copy for every Spanish id", () => {
      // Arrange
      const ids = Object.keys(messages.es);

      // Act + Assert
      expect(Object.keys(messages.en)).to.have.members(ids);
      for (const id of ids) {
        expect(messages.en[id as keyof typeof messages.en].trim(), id).to.not.equal("");
      }
    });

    it("should keep the same placeholders in both languages", () => {
      // Arrange
      const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

      // Act + Assert
      for (const id of Object.keys(messages.es) as (keyof typeof messages.es)[]) {
        expect(placeholders(messages.en[id]), id).to.deep.equal(placeholders(messages.es[id]));
      }
    });

    it("should replace placeholders", () => {
      // Act + Assert
      expect(translate("en", "form.pairingNoticeTitle", { code: "8F3K-2QLM" })).to.equal(
        "Player 8F3K-2QLM ready"
      );
      expect(translate("es", "relative.minutes", { n: 5 })).to.equal("hace 5 min");
    });
  });

  describe("language store", () => {
    it("should start from the language last used in this browser", () => {
      // Arrange + Act
      const { store, root } = setup("en", ["es-DO"]);

      // Assert
      expect(store.get()).to.equal("en");
      expect(root.setAttribute.calledWith("lang", "en-US")).to.equal(true);
    });

    it("should use English on a first visit from an English browser", () => {
      // Arrange + Act
      const { store } = setup(null, ["en-US", "es"]);

      // Assert
      expect(store.get()).to.equal("en");
    });

    it("should use Spanish on a first visit from any other browser language", () => {
      // Arrange + Act
      const { store, root } = setup(null, ["fr-FR"]);

      // Assert
      expect(store.get()).to.equal("es");
      expect(root.setAttribute.calledWith("lang", "es-DO")).to.equal(true);
    });

    it("should ignore an unsupported stored value", () => {
      // Arrange + Act
      const { store } = setup("fr", ["es"]);

      // Assert
      expect(store.get()).to.equal("es");
    });

    it("should switch, remember and notify", () => {
      // Arrange
      const { store, data, root } = setup(null);
      const listener = sinon.spy();
      store.subscribe(listener);

      // Act
      store.set("en");

      // Assert
      expect(store.get()).to.equal("en");
      expect(data.get(LANGUAGE_KEY)).to.equal("en");
      expect(root.setAttribute.lastCall.args).to.deep.equal(["lang", "en-US"]);
      expect(listener.calledOnce).to.equal(true);
    });

    it("should reject an unsupported language without changing anything", () => {
      // Arrange
      const { store, storage } = setup(null);

      // Act + Assert
      expect(() => store.set("fr" as Language)).to.throw(TypeError);
      expect(store.get()).to.equal("es");
      expect(storage.setItem.called).to.equal(false);
    });
  });

  describe("formatting", () => {
    it("should format in English", () => {
      // Act + Assert
      expect(formatCents(123450, "en")).to.equal("US$ 1,234.50");
      expect(formatPlays(12, tr("en"))).to.equal("12 plays");
      expect(formatPlays(1, tr("en"))).to.equal("1 play");
      expect(availabilitySummary([1, 2, 3, 4, 5], "08:00", "20:00", tr("en"))).to.equal(
        "Mon–Fri · 8:00–20:00"
      );
      expect(availabilitySummary([1, 2, 3, 4, 5, 6, 7], "09:00", "22:00", tr("en"))).to.equal(
        "Every day · 9:00–22:00"
      );
    });

    it("should format in Spanish", () => {
      // Arrange
      const now = Date.parse("2026-09-15T12:00:00Z");

      // Act + Assert
      expect(formatCents(123450, "es")).to.equal("US$ 1,234.50");
      expect(formatPlays(12, tr("es"))).to.equal("12 reproducciones");
      expect(availabilitySummary([1, 2, 3, 4, 5], "08:00", "20:00", tr("es"))).to.equal(
        "Lun–Vie · 8:00–20:00"
      );
      expect(relativeTime("2026-09-15T09:00:00Z", tr("es"), now)).to.equal("hace 3 h");
      expect(relativeTime("2026-09-15T09:00:00Z", tr("en"), now)).to.equal("3 h ago");
    });
  });
});
