"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Application Error]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-11 h-11 rounded-full bg-alert/10 text-alert flex items-center justify-center mx-auto mb-3.5">
          <AlertTriangle size={20} />
        </div>
        <h1 className="text-[20px] font-semibold text-ink tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-1.5 text-[13.5px] text-mute leading-relaxed text-pretty">
          The requested page encountered an unexpected issue while loading. You can retry or return to the wire.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-white bg-ink rounded-md hover:bg-ink/90 active:scale-[0.98] transition-all"
          >
            <RefreshCw size={13} />
            <span>Try again</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium text-mute hover:text-ink transition-colors"
          >
            <Home size={14} />
            <span>Return to wire</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
