/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { z } from "zod/v4";

// Limits mirror Fonoster Identity's own validation (name ≤ 50, password 8–100).
export const emailSchema = z
  .string({ error: "El correo es obligatorio" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Escribe un correo válido" }));

export const passwordSchema = z
  .string({ error: "La contraseña es obligatoria" })
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(100, "La contraseña no puede tener más de 100 caracteres");

export const personNameSchema = z
  .string({ error: "El nombre es obligatorio" })
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(50, "El nombre no puede tener más de 50 caracteres");

export const businessNameSchema = z
  .string({ error: "El nombre del negocio es obligatorio" })
  .trim()
  .min(1, "El nombre del negocio es obligatorio")
  .max(50, "El nombre del negocio no puede tener más de 50 caracteres");

export const signUpSchema = z.object({
  name: personNameSchema,
  businessName: businessNameSchema,
  email: emailSchema,
  password: passwordSchema
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "La contraseña es obligatoria" })
    .min(1, "La contraseña es obligatoria")
});

export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(1, "Falta el token de sesión")
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema
});

/** The reset link carries Identity's token: base64 JSON of { username, code }. */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "El enlace para restablecer no es válido"),
  password: passwordSchema
});

export const updateProfileSchema = z.object({
  name: personNameSchema
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Escribe tu contraseña actual"),
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
