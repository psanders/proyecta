/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";

/** Languages of the owner dashboard and the messages its API returns. */
export const LANGUAGES = ["es", "en"] as const;
export const DEFAULT_LANGUAGE: Language = "es";

export const languageSchema = z.enum(LANGUAGES, { error: "validation.language.invalid" });
export type Language = z.infer<typeof languageSchema>;

export const updateUserLanguageSchema = z.object({ language: languageSchema });
export type UpdateUserLanguageInput = z.infer<typeof updateUserLanguageSchema>;

/** Proyecta-owned preferences of an Identity user (Identity itself is never modified). */
export interface UserSettingsRecord {
  userRef: string;
  language: string;
}

/** Narrow Prisma surface for user settings. */
export interface UserSettingsClient {
  userSettings: {
    findUnique(args: { where: { userRef: string } }): Promise<UserSettingsRecord | null>;
    upsert(args: {
      where: { userRef: string };
      create: { userRef: string; language: string };
      update: { language: string };
    }): Promise<UserSettingsRecord>;
  };
}

/** The language for a header or stored value, falling back to Spanish when missing or unsupported. */
export function parseLanguage(value: unknown): Language {
  const result = languageSchema.safeParse(value);
  return result.success ? result.data : DEFAULT_LANGUAGE;
}
