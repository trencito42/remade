import { requireAdminOrRedirect } from "@/features/auth/session";
import { listSourceHealth } from "@/features/sources/repository";
import { addSourceAction } from "@/app/(dashboard)/newsroom/actions";
import { FetchSourcesButton } from "@/components/newsroom/FetchSourcesButton";
import { SourceManager } from "@/components/newsroom/SourceManager";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  await requireAdminOrRedirect();
  const sources = await listSourceHealth();

  return (
    <div className="pt-2">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] text-faint">Sources</p>
          <p className="mt-1 max-w-[48ch] text-[14px] text-mute">
            Live RSS/Atom feeds monitored by Dispatch. Ingestion pulls items, extracts full content, dedupes, and clusters by event.
          </p>
        </div>
        <FetchSourcesButton />
      </div>

      <SourceManager initialSources={sources} />

      <form action={addSourceAction} className="mt-12 max-w-[440px] space-y-3.5 border-t border-line pt-6">
        <p className="text-[12px] font-medium text-ink">Add RSS source</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-[12px] text-mute">
            Name
            <input
              name="name"
              required
              placeholder="The Verge"
              className="field mt-1 py-1.5 text-[14px]"
            />
          </label>
          <label className="block text-[12px] text-mute">
            Domain
            <input
              name="domain"
              required
              placeholder="theverge.com"
              className="field mt-1 py-1.5 text-[14px]"
            />
          </label>
        </div>

        <label className="block text-[12px] text-mute">
          Feed URL
          <input
            name="url"
            type="url"
            required
            placeholder="https://www.theverge.com/rss/index.xml"
            className="field mt-1 py-1.5 text-[14px]"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-[12px] text-mute">
            Tier
            <select name="tier" defaultValue="1" className="field mt-1 py-1.5 text-[14px]">
              <option value="0">0 Primary (Official)</option>
              <option value="1">1 Independent (Top reporting)</option>
              <option value="2">2 Specialist (Niche)</option>
              <option value="3">3 Aggregator</option>
              <option value="4">4 Community</option>
            </select>
          </label>
          <label className="block text-[12px] text-mute">
            Category
            <select name="category" defaultValue="technology" className="field mt-1 py-1.5 text-[14px]">
              <option value="technology">Technology</option>
              <option value="gaming">Gaming</option>
              <option value="hardware">Hardware</option>
              <option value="ai">AI</option>
            </select>
          </label>
        </div>

        <input type="hidden" name="feedType" value="rss" />
        <button type="submit" className="nav-item mt-2 h-9 text-ink">
          Add Source
        </button>
      </form>
    </div>
  );
}
