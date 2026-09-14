/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import {
  createRefreshSession,
  createRequestPasswordReset,
  createResetPassword,
  createSignIn,
  createSignUp
} from "../../api/auth/index.js";
import {
  refreshSessionSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema
} from "@proyecta/common";
import { publicProcedure, router } from "../trpc.js";
import { validate } from "../validate.js";

export const authRouter = router({
  signUp: publicProcedure
    .input(validate(signUpSchema))
    .mutation(({ ctx, input }) => createSignUp(ctx.identity)(input)),

  signIn: publicProcedure
    .input(validate(signInSchema))
    .mutation(({ ctx, input }) => createSignIn(ctx.identity)(input)),

  refresh: publicProcedure
    .input(validate(refreshSessionSchema))
    .mutation(({ ctx, input }) => createRefreshSession(ctx.identity)(input)),

  requestPasswordReset: publicProcedure
    .input(validate(requestPasswordResetSchema))
    .mutation(({ ctx, input }) =>
      createRequestPasswordReset(ctx.identity, `${ctx.dashboardUrl}/restablecer`)(input)
    ),

  resetPassword: publicProcedure
    .input(validate(resetPasswordSchema))
    .mutation(({ ctx, input }) => createResetPassword(ctx.identity)(input))
});
