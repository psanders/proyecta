/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useSyncExternalStore } from "react";
import { DEFAULT_LANGUAGE, i18n, translate, type Language, type Translate } from "./i18n.js";

const noop = () => () => undefined;
const fallback = (): Language => DEFAULT_LANGUAGE;

/** The active language, a setter, and `t` to read copy in it. */
export function useI18n(): {
  language: Language;
  setLanguage: (next: Language) => void;
  t: Translate;
} {
  const language = useSyncExternalStore(i18n?.subscribe ?? noop, i18n?.get ?? fallback, fallback);
  return {
    language,
    setLanguage: (next) => i18n?.set(next),
    t: (id, vars) => translate(language, id, vars)
  };
}
