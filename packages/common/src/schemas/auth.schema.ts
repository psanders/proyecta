/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";

// Limits mirror Fonoster Identity's own validation (name ≤ 50, password 8–100).
export const emailSchema = z
  .string({ error: "validation.email.required" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "validation.email.invalid" }));

export const passwordSchema = z
  .string({ error: "validation.password.required" })
  .min(8, "validation.password.min")
  .max(100, "validation.password.max");

export const personNameSchema = z
  .string({ error: "validation.personName.required" })
  .trim()
  .min(1, "validation.personName.required")
  .max(50, "validation.personName.max");

export const businessNameSchema = z
  .string({ error: "validation.businessName.required" })
  .trim()
  .min(1, "validation.businessName.required")
  .max(50, "validation.businessName.max");

export const signUpSchema = z.object({
  name: personNameSchema,
  businessName: businessNameSchema,
  email: emailSchema,
  password: passwordSchema
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "validation.password.required" })
    .min(1, "validation.password.required")
});

export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(1, "validation.sessionToken.required")
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema
});

/** The reset link carries Identity's token: base64 JSON of { username, code }. */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "validation.resetLink.invalid"),
  password: passwordSchema
});

export const updateProfileSchema = z.object({
  name: personNameSchema
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "validation.currentPassword.required"),
  newPassword: passwordSchema
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type RefreshSessionInput = z.infer<typeof refreshSessionSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface Session {
  accessToken: string;
  refreshToken: string;
}
