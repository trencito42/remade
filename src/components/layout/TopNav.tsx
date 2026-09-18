"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu } from "lucide-react";
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
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links =
    variant === "public"
      ? publicLinks
      : [
          { href: "/newsroom", label: "Live" },
          { href: "/newsroom/sources", label: "Sources" },
          { href: "/newsroom/health", label: "Health" },
        ];

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b transition-[background-color,border-color,box-shadow] duration-[150ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        scrolled
          ? "border-line bg-[#fafaf8]/92 backdrop-blur-[14px] shadow-[0_1px_3px_rgb(17_17_17/0.03)]"
          : "border-transparent bg-canvas",
      )}
    >
      <div className={variant === "public" ? "site-wrap" : "desk-wrap"}>
        <div className="flex h-12 items-center justify-between gap-4">
          <Link
            href={variant === "public" ? "/" : "/newsroom"}
            className="flex h-8 items-center px-1 font-medium tracking-tight text-ink transition-opacity hover:opacity-80 focus-visible:outline-none"
          >
            <span className="text-[14px] tracking-[-0.03em] font-semibold">Dispatch</span>
            <span className="ml-1.5 hidden text-[12px] text-faint sm:inline font-normal">
              {variant === "desk" ? "Newsroom" : "Intel"}
            </span>
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-1">
            <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn("nav-item", isActive(pathname, link.href) && "is-active")}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              ))}
              {variant === "desk" ? (
                <Link href="/" className="nav-item">
                  Site
                </Link>
              ) : null}
            </nav>
            <SearchCommand variant={variant} />
            <div className="md:hidden">
              <MobileMenu variant={variant} links={links} pathname={pathname} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/newsroom") return pathname === "/newsroom";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MobileMenu({
  variant,
  links,
  pathname,
}: {
  variant: "public" | "desk";
  links: Array<{ href: string; label: string }>;
  pathname: string;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="touch-target-44 flex items-center justify-center rounded-[var(--radius)] text-mute transition-colors hover:bg-s1 hover:text-ink focus-visible:outline-none"
          aria-label="Open navigation menu"
        >
          <Menu size={18} strokeWidth={1.75} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-40 bg-ink/10 backdrop-blur-[2px]" />
        <Dialog.Content className="sheet panel fixed inset-x-3 bottom-3 z-50 p-2 max-w-lg mx-auto focus:outline-none shadow-lg">
          <Dialog.Title className="sr-only">Navigation Menu</Dialog.Title>
          <div className="flex flex-col gap-0.5">
            {links.map((link) => (
              <Dialog.Close asChild key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "nav-item min-h-[44px] justify-start text-[14px] px-3 font-medium rounded-md",
                    isActive(pathname, link.href) && "is-active bg-s1 text-ink font-semibold",
                  )}
                >
                  {link.label}
                </Link>
              </Dialog.Close>
            ))}
            {variant === "desk" ? (
              <>
                <div className="my-1 border-t border-line" />
                <Dialog.Close asChild>
                  <Link
                    href="/"
                    className="nav-item min-h-[44px] justify-start text-[14px] px-3 text-mute hover:text-ink rounded-md"
                  >
                    Public Site
                  </Link>
                </Dialog.Close>
              </>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
