import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/features/auth/session";
import { LoginForm } from "@/components/newsroom/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthenticated()) {
    redirect("/newsroom");
  }

  const { error } = await searchParams;

  return <LoginForm error={error} />;
}
