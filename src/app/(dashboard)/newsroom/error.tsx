"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function NewsroomError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Newsroom Error]", error);
  }, [error]);

  return (
    <div className="py-20 text-center max-w-sm mx-auto">
      <div className="w-10 h-10 rounded-full bg-alert/10 text-alert flex items-center justify-center mx-auto mb-3">
        <AlertCircle size={18} />
      </div>
      <h2 className="text-[16px] font-semibold text-ink">
        Newsroom operation error
      </h2>
      <p className="mt-1.5 text-[13px] text-mute leading-relaxed">
        An error occurred while loading story clusters or workspace tools.
      </p>

      <div className="mt-5 flex items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[12.5px] font-medium text-white bg-ink rounded-md hover:bg-ink/90 active:scale-[0.98] transition-all"
        >
          <RefreshCw size={12} />
          <span>Retry</span>
        </button>
        <Link
          href="/newsroom"
          className="inline-flex items-center h-8 px-3 text-[12.5px] font-medium text-mute hover:text-ink transition-colors border border-line rounded-md"
        >
          Reset to Live
        </Link>
      </div>
    </div>
  );
}
