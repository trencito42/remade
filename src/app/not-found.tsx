import Link from "next/link";
import { TopNav } from "@/components/layout/TopNav";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <TopNav variant="public" />
      <main className="site-wrap pt-20 pb-28 text-center max-w-md mx-auto">
        <div className="w-11 h-11 rounded-full bg-s1 border border-line flex items-center justify-center mx-auto mb-4 text-mute">
          <Compass size={20} strokeWidth={1.75} />
        </div>
        <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">
          Story unavailable
        </h1>
        <p className="mt-2 text-[14px] text-mute leading-relaxed text-pretty">
          This article may have been archived, unclustered, or has not yet been published to the wire.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-white bg-ink rounded-md hover:bg-ink/90 active:scale-[0.98] transition-all"
          >
            <ArrowLeft size={14} />
            <span>Back to wire</span>
          </Link>
          <Link
            href="/latest"
            className="inline-flex items-center h-9 px-3.5 text-[13px] font-medium text-mute hover:text-ink transition-colors"
          >
            Latest coverage
          </Link>
        </div>
      </main>
    </>
  );
}
