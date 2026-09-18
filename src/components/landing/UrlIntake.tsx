"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function UrlIntake() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not start analysis.");
        setLoading(false);
        return;
      }
      router.push(`/projects/${data.projectId}`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="intake">
      <label className="intake-label" htmlFor="website-url">
        Drop your website.
      </label>
      <div className="intake-row">
        <input
          id="website-url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="https://their-old-business-website.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          required
        />
        <button type="submit" disabled={loading || !url.trim()}>
          {loading ? "Starting…" : "Rebuild my site"}
        </button>
      </div>
      {error ? <p className="intake-error">{error}</p> : null}
      <p className="intake-note">
        Research first. Nothing gets designed blindly.
      </p>
    </form>
  );
}
