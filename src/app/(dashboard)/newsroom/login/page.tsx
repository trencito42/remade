import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/features/auth/session";
import { loginAction } from "@/app/(dashboard)/newsroom/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthenticated()) {
    redirect("/newsroom");
  }

  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-[340px] pt-16">
      <div className="mb-6">
        <p className="text-[12px] text-faint">Newsroom Access</p>
        <h1 className="mt-1 text-[20px] font-medium tracking-[-0.03em] text-ink">
          Dispatch Editor
        </h1>
        <p className="mt-1 text-[13px] text-mute">
          Enter admin passphrase to access story desks and publishing.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-[4px] bg-s1 px-3 py-2 text-[13px] text-alert">
          {error === "invalid" ? "Incorrect password. Please try again." : error}
        </div>
      ) : null}

      <form action={loginAction} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-[12px] text-faint">
            Passphrase
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            placeholder="••••••••••••"
            className="field mt-1.5 w-full py-2.5 text-[15px]"
          />
        </div>

        <button
          type="submit"
          className="nav-item h-10 w-full justify-center text-ink border border-line"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
