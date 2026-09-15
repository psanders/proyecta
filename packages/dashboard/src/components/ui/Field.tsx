/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from "react";
import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.js";

export const control =
  "h-10 w-full rounded-full border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground aria-invalid:border-destructive disabled:opacity-60";

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: string;
  /** Shown at the end of the hint/error line, e.g. a link. */
  action?: ReactNode;
  children: (id: string, describedBy: string | undefined) => ReactNode;
  className?: string;
}

function FieldShell({ label, error, hint, action, children, className }: FieldShellProps) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children(id, error || hint ? messageId : undefined)}
      {error || hint || action ? (
        <div className="flex items-start justify-between gap-4">
          {error ? (
            <p id={messageId} className="text-xs text-destructive">
              {error}
            </p>
          ) : hint ? (
            <p id={messageId} className="text-xs text-muted-foreground">
              {hint}
            </p>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
    </div>
  );
}

/** Pencil Input Group/Default: label + 40 px pill input + inline error. */
export function TextField({
  label,
  error,
  hint,
  action,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <FieldShell label={label} error={error} hint={hint} action={action} className={className}>
      {(id, describedBy) => (
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={control}
          {...props}
        />
      )}
    </FieldShell>
  );
}

/** Pencil Textarea Group: label + multi-line input + inline error. */
export function TextAreaField({
  label,
  error,
  hint,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string }) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      {(id, describedBy) => (
        <textarea
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(control, "h-auto min-h-20 resize-y rounded-2xl py-2.5")}
          {...props}
        />
      )}
    </FieldShell>
  );
}

/** Pencil Select Group/Default. */
export function SelectField({
  label,
  error,
  options,
  placeholder,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <FieldShell label={label} error={error} className={className}>
      {(id, describedBy) => (
        <div className="relative">
          <select
            id={id}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(control, "appearance-none pr-10")}
            {...props}
          >
            {placeholder ? <option value="">{placeholder}</option> : null}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Icon
            name="chevronDown"
            className="pointer-events-none absolute top-2.5 right-4 size-5 text-muted-foreground"
          />
        </div>
      )}
    </FieldShell>
  );
}
