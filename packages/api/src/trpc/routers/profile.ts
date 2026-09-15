/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import {
  changePasswordSchema,
  updateProfileSchema,
  updateUserLanguageSchema
} from "@proyecta/common";
import {
  createChangePassword,
  createGetUserSettings,
  createUpdateUserLanguage
} from "../../api/profile/index.js";
import { protectedProcedure, router } from "../trpc.js";
import { validate } from "../validate.js";

export const profileRouter = router({
  // Identity profile enriched with the Proyecta-owned dashboard language.
  get: protectedProcedure.query(async ({ ctx }) => {
    const [user, settings] = await Promise.all([
      ctx.identity.getUser(ctx.principal.userRef, ctx.token),
      createGetUserSettings(ctx.sync.db)({ userRef: ctx.principal.userRef })
    ]);
    return { ref: user.ref, name: user.name, email: user.email, language: settings.language };
  }),

  updateLanguage: protectedProcedure
    .input(validate(updateUserLanguageSchema))
    .mutation(({ ctx, input }) =>
      createUpdateUserLanguage(ctx.sync.db)({ ...input, userRef: ctx.principal.userRef })
    ),

  updateName: protectedProcedure
    .input(validate(updateProfileSchema))
    .mutation(async ({ ctx, input }) => {
      await ctx.identity.updateUser({ ref: ctx.principal.userRef, name: input.name }, ctx.token);
      return { updated: true as const };
    }),

  changePassword: protectedProcedure
    .input(validate(changePasswordSchema))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.identity.getUser(ctx.principal.userRef, ctx.token);
      return createChangePassword(ctx.identity)({
        ...input,
        userRef: ctx.principal.userRef,
        email: user.email,
        token: ctx.token
      });
    })
});
