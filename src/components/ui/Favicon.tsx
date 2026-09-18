"use client";

import { useState } from "react";

export function Favicon({
  domain,
  name,
  size = 16,
  className = "",
}: {
  domain?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  // Extract clean domain if url was passed
  let cleanDomain = domain || "";
  if (cleanDomain.startsWith("http://") || cleanDomain.startsWith("https://")) {
    try {
      cleanDomain = new URL(cleanDomain).hostname;
    } catch {
      // fallback
    }
  }

  const initial = name.trim().charAt(0).toUpperCase() || "S";

  if (!cleanDomain || failed) {
    return (
      <span
        style={{ width: size, height: size, fontSize: Math.max(9, Math.floor(size * 0.65)) }}
        className={`inline-flex shrink-0 items-center justify-center rounded-sm bg-s1 text-mute font-semibold tracking-tighter uppercase select-none ${className}`}
        aria-hidden="true"
      >
        {initial}
      </span>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={`https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=32`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`inline-block shrink-0 rounded-sm object-contain ${className}`}
      aria-hidden="true"
    />
  );
}
