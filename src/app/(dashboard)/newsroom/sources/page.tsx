import { requireAdminOrRedirect } from "@/features/auth/session";
import { listSourceHealth } from "@/features/sources/repository";
import { SourceManager } from "@/components/newsroom/SourceManager";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  await requireAdminOrRedirect();
  const sources = await listSourceHealth();

  return (
    <div className="pt-2">
      <SourceManager initialSources={sources} />
    </div>
  );
}
