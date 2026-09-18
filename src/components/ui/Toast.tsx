"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  message: string;
  type?: ToastType;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none pb-safe max-w-[calc(100vw-32px)]"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            data-state="open"
            className="toast-item pointer-events-auto flex items-center gap-2.5 rounded-lg border border-line bg-s2 px-3.5 py-2.5 shadow-lg text-[13px] text-ink min-w-[240px] max-w-[360px]"
          >
            {t.type === "success" && <CheckCircle2 size={15} className="text-ok shrink-0" />}
            {t.type === "error" && <AlertCircle size={15} className="text-alert shrink-0" />}
            {t.type === "info" && <Info size={15} className="text-mute shrink-0" />}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-faint hover:text-ink -mr-1 p-0.5 rounded transition-colors"
              aria-label="Dismiss notification"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      toast: (msg: string) => console.log("[Toast]", msg),
    };
  }
  return ctx;
}
