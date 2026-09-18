"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function NewsroomBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push("/newsroom");
        }
      }}
      className="inline-flex items-center gap-1.5 touch-target-44 -ml-2 px-2 text-[13px] font-medium text-mute hover:text-ink transition-colors focus-visible:outline-none"
      aria-label="Return to Live feed"
    >
      <ArrowLeft size={16} strokeWidth={2} />
      <span>Live</span>
    </button>
  );
}
