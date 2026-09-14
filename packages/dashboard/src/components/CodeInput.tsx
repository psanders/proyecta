/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { PAIRING_CODE_ALPHABET, formatPairingCode, normalizePairingCode } from "@proyecta/common";
import { useId } from "react";

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
  error
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
  error?: string;
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
        className="h-12 w-52 rounded-full border border-input bg-background px-4 text-center font-mono text-lg font-bold tracking-[0.2em] text-foreground uppercase outline-none placeholder:text-muted-foreground/60 focus:border-foreground aria-invalid:border-destructive"
      />
    </div>
  );
}
