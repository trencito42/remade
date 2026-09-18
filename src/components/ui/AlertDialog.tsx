"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px]" />
        <Dialog.Content className="panel fixed left-1/2 top-1/2 z-50 w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 p-5 outline-none">
          <div className="flex items-start gap-3">
            {destructive && (
              <div className="w-8 h-8 rounded-full bg-alert/10 text-alert flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle size={16} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-[15px] font-semibold text-ink leading-tight">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1.5 text-[13px] text-mute leading-relaxed">
                {description}
              </Dialog.Description>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="nav-item h-8 px-3 text-[13px] text-mute hover:text-ink disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                await onConfirm();
                onOpenChange(false);
              }}
              className={`inline-flex items-center justify-center h-8 px-3.5 text-[13px] font-medium rounded-md transition-colors disabled:opacity-50 ${
                destructive
                  ? "bg-alert text-white hover:bg-alert/90"
                  : "bg-ink text-white hover:bg-ink/90"
              }`}
            >
              {loading ? "Processing…" : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
