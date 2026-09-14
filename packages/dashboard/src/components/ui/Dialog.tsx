/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button.js";

/** Dashboard/Confirm Dialog, based on Pencil Modal/Center. Uses the native <dialog> for focus + Esc. */
export function Dialog({
  open,
  title,
  children,
  onClose,
  footer
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[440px] max-w-[calc(100vw-2rem)] border border-border bg-card p-0 shadow-xl backdrop:bg-black/40"
    >
      <div className="flex flex-col gap-2 p-6">
        <h2 className="font-mono text-lg font-medium text-foreground">{title}</h2>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  loading,
  error,
  onConfirm,
  onClose
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{body}</p>
      {error ? <p className="mt-3 text-destructive">{error}</p> : null}
    </Dialog>
  );
}
