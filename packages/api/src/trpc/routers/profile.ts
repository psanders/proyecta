/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { changePasswordSchema, updateProfileSchema } from "@proyecta/common";
import { createChangePassword } from "../../api/profile/index.js";
import { protectedProcedure, router } from "../trpc.js";
import { validate } from "../validate.js";

export const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.identity.getUser(ctx.principal.userRef, ctx.token);
    return { ref: user.ref, name: user.name, email: user.email };
  }),

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
