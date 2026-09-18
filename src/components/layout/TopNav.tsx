"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
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
        "sticky top-0 z-30 border-b transition-[background-color,border-color,box-shadow] duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        scrolled ? "border-line bg-s1/80" : "border-transparent bg-canvas",
      )}
    >
      <div className={variant === "public" ? "site-wrap" : "desk-wrap"}>
        <div className="flex h-12 items-center justify-between gap-4">
          <Link href={variant === "public" ? "/" : "/newsroom"} className="flex h-8 items-center px-1">
            <span className="text-[14px] tracking-[-0.03em] text-ink">Dispatch</span>
            <span className="ml-1.5 hidden text-[12px] text-mute sm:inline">
              {variant === "desk" ? "Newsroom" : "Intel"}
            </span>
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-0.5">
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
        <button type="button" className="nav-item min-h-11 px-3" aria-label="Open menu">
          Menu
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-40" />
        <Dialog.Content className="sheet panel fixed inset-x-3 bottom-3 z-50 p-2 focus:outline-none">
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <div className="flex flex-col">
            {links.map((link) => (
              <Dialog.Close asChild key={link.href}>
                <Link
                  href={link.href}
                  className={cn("nav-item h-11 justify-start", isActive(pathname, link.href) && "is-active")}
                >
                  {link.label}
                </Link>
              </Dialog.Close>
            ))}
            {variant === "desk" ? (
              <Dialog.Close asChild>
                <Link href="/" className="nav-item h-11 justify-start">
                  Site
                </Link>
              </Dialog.Close>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
