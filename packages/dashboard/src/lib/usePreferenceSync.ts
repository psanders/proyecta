/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useEffect } from "react";
import { trpc } from "./trpc.js";
import { useI18n } from "./useI18n.js";

/**
 * Applies the signed-in user's saved language, which wins over the language cached in this
 * browser. Runs in every signed-in shell so a language chosen on another device shows up here.
 */
export function usePreferenceSync() {
  const { language, setLanguage } = useI18n();
  const profile = trpc.profile.get.useQuery(undefined, { staleTime: 60_000 });
  const saved = profile.data?.language;
  useEffect(() => {
    if (saved && saved !== language) setLanguage(saved);
  }, [saved, language, setLanguage]);
}
