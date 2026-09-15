/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { PAIRING_CODE_ALPHABET, formatPairingCode, normalizePairingCode } from "@proyecta/common";
import { useId } from "react";
import { cn } from "../lib/cn.js";

/** Keeps only valid code characters (case-insensitive), max 8. */
export function cleanCode(raw: string): string {
  return normalizePairingCode(raw)
    .split("")
    .filter((c) => PAIRING_CODE_ALPHABET.includes(c))
    .join("")
    .slice(0, 8);
}

/** Pencil Dashboard/Code Input: 8-character pairing code shown as XXXX-XXXX. */
export function CodeInput({
  value,
  onChange,
  label,
  error,
  success
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
  error?: string;
  /** Code verified (Pencil onboarding-code-found: green border). */
  success?: boolean;
}) {
  const id = useId();
  const display = value.length > 4 ? formatPairingCode(value) : value;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        value={display}
        onChange={(event) => onChange(cleanCode(event.target.value))}
        placeholder="XXXX-XXXX"
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
        aria-invalid={!!error}
        className={cn(
          "h-10 w-40 rounded-full border border-input bg-background px-4 text-sm text-foreground uppercase outline-none placeholder:text-muted-foreground focus:border-foreground aria-invalid:border-destructive",
          success && "border-success-foreground focus:border-success-foreground"
        )}
      />
    </div>
  );
}
