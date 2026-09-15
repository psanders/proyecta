/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";
import {
  parseLanguage,
  updateUserLanguageSchema,
  withErrorHandlingAndValidation,
  type Language,
  type UserSettingsClient
} from "@proyecta/common";

export interface UserSettingsView {
  language: Language;
}

/**
 * Creates a function that reads a user's Proyecta settings. A user without a row gets the
 * defaults (Spanish); nothing is written.
 *
 * @param client - Injected user settings client
 */
export function createGetUserSettings(client: UserSettingsClient) {
  const schema = z.object({ userRef: z.string().min(1) });

  const fn = async (params: z.infer<typeof schema>): Promise<UserSettingsView> => {
    const row = await client.userSettings.findUnique({ where: { userRef: params.userRef } });
    return { language: parseLanguage(row?.language) };
  };

  return withErrorHandlingAndValidation(fn, schema);
}

/**
 * Creates a function that saves a user's dashboard language. Upserts, so a user who never had a
 * settings row gets one. An unsupported language is rejected before any write.
 *
 * @param client - Injected user settings client
 */
export function createUpdateUserLanguage(client: UserSettingsClient) {
  const schema = updateUserLanguageSchema.extend({ userRef: z.string().min(1) });

  const fn = async (params: z.infer<typeof schema>): Promise<UserSettingsView> => {
    const row = await client.userSettings.upsert({
      where: { userRef: params.userRef },
      create: { userRef: params.userRef, language: params.language },
      update: { language: params.language }
    });
    return { language: parseLanguage(row.language) };
  };

  return withErrorHandlingAndValidation(fn, schema);
}
