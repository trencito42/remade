"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SearchCommand } from "@/components/news/SearchCommand";

const publicLinks = [
  { href: "/latest", label: "Latest" },
  { href: "/gaming", label: "Gaming" },
  { href: "/hardware", label: "Hardware" },
  { href: "/technology", label: "Tech" },
  { href: "/ai", label: "AI" },
];

export function TopNav({ variant }: { variant: "public" | "desk" }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b bg-canvas pt-5 pb-4 transition-[border-color] duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        scrolled ? "border-line" : "border-transparent",
      )}
    >
      <div className={variant === "public" ? "site-wrap" : "desk-wrap"}>
        <div className="flex items-baseline justify-between gap-6">
          <Link
            href={variant === "public" ? "/" : "/newsroom"}
            className="nav-link shrink-0 text-[15px] tracking-[-0.03em] !text-ink"
            aria-current={pathname === (variant === "public" ? "/" : "/newsroom") ? "page" : undefined}
          >
            Dispatch
            {variant === "desk" ? <span className="text-mute"> Desk</span> : null}
          </Link>
          <nav
            className="flex min-w-0 flex-1 items-baseline justify-end gap-5 overflow-x-auto text-[13px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label={variant === "public" ? "Sections" : "Desk"}
          >
            {variant === "public" ? (
              <>
                {publicLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn("nav-link whitespace-nowrap", pathname === link.href && "is-active")}
                    aria-current={pathname === link.href ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                ))}
                <SearchCommand variant="public" />
              </>
            ) : (
              <>
                <SearchCommand variant="desk" />
                <Link href="/" className="nav-link whitespace-nowrap">
                  Site
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
