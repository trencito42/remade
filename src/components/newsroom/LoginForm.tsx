"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/app/(dashboard)/newsroom/actions";
import { Eye, EyeOff, Lock, ArrowRight, RefreshCw } from "lucide-react";

export function LoginForm({ error }: { error?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-[360px] pt-12 sm:pt-20 px-2">
      <div className="mb-6 text-center">
        <div className="w-10 h-10 rounded-full bg-s1 border border-line flex items-center justify-center mx-auto mb-3 text-ink">
          <Lock size={17} strokeWidth={2} />
        </div>
        <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-ink">
          Newsroom Access
        </h1>
        <p className="mt-1 text-[13px] text-mute">
          Enter admin passphrase to access story desks and publishing tools.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg bg-alert/10 border border-alert/20 px-3.5 py-2.5 text-[12.5px] text-alert text-center font-medium">
          {error === "invalid" ? "Incorrect passphrase. Please try again." : error}
        </div>
      ) : null}

      <form
        action={(formData) => {
          startTransition(async () => {
            await loginAction(formData);
          });
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="password" className="block text-[12px] font-medium text-mute mb-1.5">
            Admin Passphrase
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoFocus
              placeholder="••••••••••••"
              className="w-full rounded-lg border border-line bg-s1/60 px-3.5 py-2.5 pr-10 text-[15px] text-ink outline-none transition-colors focus:bg-canvas focus:border-ink placeholder:text-faint"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-faint hover:text-ink transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-ink text-white text-[13.5px] font-medium hover:bg-ink/90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {pending ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Verifying…</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
