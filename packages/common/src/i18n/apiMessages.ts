/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import type { Language } from "../schemas/userSettings.schema.js";

/**
 * User-facing messages the dashboard API can return (validation field errors and domain errors).
 * Schemas and errors carry these ids; the API resolves them in the requester's language.
 * Device protocol schemas keep literal English text and are never resolved.
 */
const es = {
  "validation.email.required": "El correo es obligatorio",
  "validation.email.invalid": "Escribe un correo válido",
  "validation.password.required": "La contraseña es obligatoria",
  "validation.password.min": "La contraseña debe tener al menos 8 caracteres",
  "validation.password.max": "La contraseña no puede tener más de 100 caracteres",
  "validation.currentPassword.required": "Escribe tu contraseña actual",
  "validation.personName.required": "El nombre es obligatorio",
  "validation.personName.max": "El nombre no puede tener más de 50 caracteres",
  "validation.businessName.required": "El nombre del negocio es obligatorio",
  "validation.businessName.max": "El nombre del negocio no puede tener más de 50 caracteres",
  "validation.sessionToken.required": "Falta el token de sesión",
  "validation.resetLink.invalid": "El enlace para restablecer no es válido",
  "validation.timezone.invalid": "Elige una zona horaria de la lista",
  "validation.deleteConfirmation": "Escribe ELIMINAR para confirmar",
  "validation.role.invalid": "Rol no válido",
  "validation.role.invitable": "Elige Administrador o Miembro",
  "validation.member.required": "Falta el miembro",
  "validation.invitation.invalid": "La invitación no es válida",
  "validation.language.invalid": "Elige Español o English",
  "validation.time.format": "Usa el formato HH:MM",
  "validation.hours.both": "Indica la hora de inicio y la de fin",
  "validation.hours.order": "La hora de fin debe ser después de la de inicio",
  "validation.address.max": "La dirección no puede tener más de 120 caracteres",
  "validation.rate.required": "La tarifa es obligatoria",
  "validation.rate.negative": "La tarifa no puede ser negativa",
  "validation.rate.tooHigh": "La tarifa es demasiado alta",
  "validation.rate.decimals": "Usa como máximo dos decimales",
  "validation.screenName.required": "El nombre de la pantalla es obligatorio",
  "validation.screenName.max": "El nombre no puede tener más de 80 caracteres",
  "validation.city.required": "La ciudad es obligatoria",
  "validation.city.max": "La ciudad no puede tener más de 60 caracteres",
  "validation.placeType.invalid": "Tipo de lugar no válido",
  "validation.environment.invalid": "Elige interior o exterior",
  "validation.orientation.invalid": "Orientación no válida",
  "validation.centimeters.integer": "Usa centímetros enteros",
  "validation.centimeters.min": "Debe ser mayor que 0",
  "validation.resolution.format": "Usa el formato 1920x1080",
  "validation.description.max": "La descripción no puede tener más de 500 caracteres",
  "validation.coordinates.format":
    "Pega las coordenadas como 18.4861, -69.9312 o un enlace de Google Maps",
  "validation.coordinates.both": "Indica la latitud y la longitud",
  "validation.coordinates.missingMinus":
    "A la longitud le falta el signo menos (en República Dominicana es negativa)",
  "validation.coordinates.swapped": "Parece que la latitud y la longitud están invertidas",
  "validation.coordinates.outsideDr": "Las coordenadas quedan fuera de República Dominicana",
  "validation.tags.invalid": "Etiqueta no válida",
  "validation.tags.max": "Elige como máximo 10 etiquetas",
  "validation.screen.invalid": "Pantalla no válida",

  "errors.internal": "Error interno",
  "errors.forbidden.member": "No perteneces a este negocio",
  "errors.forbidden.admin": "Necesitas ser administrador",
  "errors.forbidden.owner": "Necesitas ser el propietario",
  "errors.session.expired": "Tu sesión expiró. Ingresa de nuevo.",
  "errors.auth.invalidCredentials": "Correo o contraseña incorrectos",
  "errors.auth.accountExists": "Ya existe una cuenta con este correo",
  "errors.auth.invalidResetLink": "El enlace para restablecer no es válido o ya expiró",
  "errors.profile.wrongPassword": "Tu contraseña actual no es correcta",
  "errors.workspace.notFound": "Negocio no encontrado",
  "errors.workspace.linkedPlayers":
    "Desvincula todos los reproductores antes de eliminar el negocio",
  "errors.member.alreadyInWorkspace": "Esta persona ya es parte del negocio",
  "errors.member.removeOwner": "No puedes quitar al propietario del negocio",
  "errors.invitation.unavailable": "No pudimos validar la invitación. Intenta de nuevo.",
  "errors.invitation.invalid": "La invitación no es válida o ya expiró",
  "errors.screen.notFound": "Pantalla no encontrada",
  "errors.screen.archivedEdit": "Las pantallas archivadas no se pueden editar",
  "errors.screen.archivedLink": "Las pantallas archivadas no se pueden vincular",
  "errors.screen.unlinkBeforeArchive": "Desvincula el reproductor antes de archivar la pantalla",
  "errors.screen.unlinkBeforeDelete": "Desvincula el reproductor antes de eliminar la pantalla",
  "errors.screen.noDevice": "Esta pantalla no tiene un reproductor vinculado",
  "errors.pairing.notFound": "No encontramos un reproductor con ese código",
  "errors.pairing.offline": "El reproductor no está conectado",
  "errors.pairing.alreadyLinked": "El reproductor o la pantalla ya tienen un vínculo",
  "errors.pairing.tooManyAttempts": "Demasiados intentos. Espera un minuto."
} as const;

export type ApiMessageId = keyof typeof es;

const en: Record<ApiMessageId, string> = {
  "validation.email.required": "Email is required",
  "validation.email.invalid": "Enter a valid email",
  "validation.password.required": "Password is required",
  "validation.password.min": "Password must be at least 8 characters",
  "validation.password.max": "Password can't be longer than 100 characters",
  "validation.currentPassword.required": "Enter your current password",
  "validation.personName.required": "Name is required",
  "validation.personName.max": "Name can't be longer than 50 characters",
  "validation.businessName.required": "Business name is required",
  "validation.businessName.max": "Business name can't be longer than 50 characters",
  "validation.sessionToken.required": "Session token is missing",
  "validation.resetLink.invalid": "The reset link is not valid",
  "validation.timezone.invalid": "Choose a time zone from the list",
  "validation.deleteConfirmation": "Type DELETE to confirm",
  "validation.role.invalid": "Invalid role",
  "validation.role.invitable": "Choose Administrator or Member",
  "validation.member.required": "Member is missing",
  "validation.invitation.invalid": "The invitation is not valid",
  "validation.language.invalid": "Choose Español or English",
  "validation.time.format": "Use the HH:MM format",
  "validation.hours.both": "Enter both the start and end time",
  "validation.hours.order": "End time must be after the start time",
  "validation.address.max": "Address can't be longer than 120 characters",
  "validation.rate.required": "Rate is required",
  "validation.rate.negative": "Rate can't be negative",
  "validation.rate.tooHigh": "Rate is too high",
  "validation.rate.decimals": "Use at most two decimals",
  "validation.screenName.required": "Screen name is required",
  "validation.screenName.max": "Name can't be longer than 80 characters",
  "validation.city.required": "City is required",
  "validation.city.max": "City can't be longer than 60 characters",
  "validation.placeType.invalid": "Invalid place type",
  "validation.environment.invalid": "Choose indoor or outdoor",
  "validation.orientation.invalid": "Invalid orientation",
  "validation.centimeters.integer": "Use whole centimeters",
  "validation.centimeters.min": "Must be greater than 0",
  "validation.resolution.format": "Use the 1920x1080 format",
  "validation.description.max": "Description can't be longer than 500 characters",
  "validation.coordinates.format": "Paste coordinates like 18.4861, -69.9312 or a Google Maps link",
  "validation.coordinates.both": "Enter both latitude and longitude",
  "validation.coordinates.missingMinus":
    "The longitude is missing its minus sign (it's negative in the Dominican Republic)",
  "validation.coordinates.swapped": "Latitude and longitude look swapped",
  "validation.coordinates.outsideDr": "These coordinates are outside the Dominican Republic",
  "validation.tags.invalid": "Invalid tag",
  "validation.tags.max": "Choose at most 10 tags",
  "validation.screen.invalid": "Invalid screen",

  "errors.internal": "Internal error",
  "errors.forbidden.member": "You don't belong to this business",
  "errors.forbidden.admin": "You need to be an administrator",
  "errors.forbidden.owner": "You need to be the owner",
  "errors.session.expired": "Your session expired. Sign in again.",
  "errors.auth.invalidCredentials": "Incorrect email or password",
  "errors.auth.accountExists": "An account with this email already exists",
  "errors.auth.invalidResetLink": "The reset link is not valid or has expired",
  "errors.profile.wrongPassword": "Your current password is incorrect",
  "errors.workspace.notFound": "Business not found",
  "errors.workspace.linkedPlayers": "Unlink all players before deleting the business",
  "errors.member.alreadyInWorkspace": "This person is already part of the business",
  "errors.member.removeOwner": "You can't remove the business owner",
  "errors.invitation.unavailable": "We couldn't validate the invitation. Try again.",
  "errors.invitation.invalid": "The invitation is not valid or has expired",
  "errors.screen.notFound": "Screen not found",
  "errors.screen.archivedEdit": "Archived screens can't be edited",
  "errors.screen.archivedLink": "Archived screens can't be linked",
  "errors.screen.unlinkBeforeArchive": "Unlink the player before archiving the screen",
  "errors.screen.unlinkBeforeDelete": "Unlink the player before deleting the screen",
  "errors.screen.noDevice": "This screen has no linked player",
  "errors.pairing.notFound": "We couldn't find a player with that code",
  "errors.pairing.offline": "The player is not connected",
  "errors.pairing.alreadyLinked": "The player or the screen is already linked",
  "errors.pairing.tooManyAttempts": "Too many attempts. Wait a minute."
};

export const apiMessages: Record<Language, Record<ApiMessageId, string>> = { es, en };

export function isApiMessageId(value: string): value is ApiMessageId {
  return Object.hasOwn(es, value);
}

/** The text of a message id in `language`; anything that isn't a known id is returned unchanged. */
export function resolveApiMessage(idOrText: string, language: Language): string {
  return isApiMessageId(idOrText) ? apiMessages[language][idOrText] : idOrText;
}
