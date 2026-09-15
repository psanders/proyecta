/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { DEFAULT_LANGUAGE, LANGUAGES, type Language } from "@proyecta/common";
import { en } from "./messages/en.js";
import { es, type MessageId } from "./messages/es.js";

export type { Language, MessageId };
export { DEFAULT_LANGUAGE, LANGUAGES };

export const messages: Record<Language, Record<MessageId, string>> = { es, en };

/** Endonyms: each language is shown in its own name, whatever the active language. */
export const languageNames: Record<Language, string> = { es: "Español", en: "English" };

/** Locale for Intl number and date formatting. */
export const locales: Record<Language, string> = { es: "es-DO", en: "en-US" };

export const LANGUAGE_KEY = "proyecta.dashboard.language";

export type Translate = (id: MessageId, vars?: Record<string, string | number>) => string;

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

/** The text of `id` in `language`, with `{name}` placeholders replaced from `vars`. */
export function translate(
  language: Language,
  id: MessageId,
  vars?: Record<string, string | number>
): string {
  const text = messages[language][id];
  return vars
    ? text.replace(/\{(\w+)\}/g, (match, key: string) => String(vars[key] ?? match))
    : text;
}

export interface LanguageDeps {
  storage: Pick<Storage, "getItem" | "setItem">;
  /** `navigator.languages`, most preferred first. */
  preferred: readonly string[];
  root: { setAttribute(name: string, value: string): void };
}

type Listener = () => void;

/**
 * The dashboard language. Starts from the language last used in this browser, else English when
 * the browser prefers English, else Spanish. Signed-in users' saved language replaces it (see
 * usePreferenceSync). The active locale is written to `<html lang>`.
 */
export function createLanguageStore({ storage, preferred, root }: LanguageDeps) {
  const listeners = new Set<Listener>();
  const initial = (): Language => {
    try {
      const stored = storage.getItem(LANGUAGE_KEY);
      if (isLanguage(stored)) return stored;
    } catch {
      // Storage unavailable: fall back to the browser's language.
    }
    return preferred[0]?.toLowerCase().startsWith("en") ? "en" : DEFAULT_LANGUAGE;
  };
  let language = initial();
  root.setAttribute("lang", locales[language]);

  return {
    get: () => language,
    set(next: Language) {
      if (!isLanguage(next)) throw new TypeError(`Invalid language: ${String(next)}`);
      try {
        storage.setItem(LANGUAGE_KEY, next);
      } catch {
        // Private mode: the choice applies now but isn't remembered.
      }
      if (next === language) return;
      language = next;
      root.setAttribute("lang", locales[next]);
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    }
  };
}

export type LanguageStore = ReturnType<typeof createLanguageStore>;

const memory = new Map<string, string>();

export const i18n =
  typeof window === "undefined"
    ? null
    : createLanguageStore({
        storage: (() => {
          try {
            return window.localStorage;
          } catch {
            return {
              getItem: (key: string) => memory.get(key) ?? null,
              setItem: (key: string, value: string) => void memory.set(key, value)
            };
          }
        })(),
        preferred: navigator.languages?.length ? navigator.languages : [navigator.language],
        root: document.documentElement
      });

/** The active language outside React (e.g. the tRPC client's x-language header). */
export function currentLanguage(): Language {
  return i18n?.get() ?? DEFAULT_LANGUAGE;
}
