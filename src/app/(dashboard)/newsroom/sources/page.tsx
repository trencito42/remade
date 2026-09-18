import { addSourceAction } from "@/app/(dashboard)/newsroom/actions";
import { FetchSourcesButton } from "@/components/newsroom/FetchSourcesButton";
import { listSourceHealth } from "@/lib/db/queries";
import { formatDateTime } from "@/lib/utils";
import { sourceTierLabels, type SourceTier } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const rows = await listSourceHealth();

  return (
    <div className="pt-1">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] text-faint">Sources</p>
          <p className="mt-1 max-w-[46ch] text-[14px] text-mute">
            RSS and Atom feeds. Fetch pulls items, dedupes them, and clusters overlapping coverage.
          </p>
        </div>
        <FetchSourcesButton />
      </div>

      <div>
        {rows.map((source) => {
          const feed = source.feeds[0];
          return (
            <div key={source.id} className="row flex flex-wrap items-baseline justify-between gap-3 py-2.5">
              <div>
                <p className="text-[15px]">{source.name}</p>
                <p className="mt-1 text-[12px] text-mute">
                  {source.domain}
                  <span className="mx-2 text-faint">·</span>
                  {sourceTierLabels[source.tier as SourceTier]}
                  {source.isSeed ? <span className="text-faint"> · seed</span> : null}
                </p>
              </div>
              <p className="text-[12px] text-mute">
                {feed?.lastSuccessAt ? `ok ${formatDateTime(feed.lastSuccessAt)}` : "not fetched"}
                {feed ? ` · ${feed.articlesReceived} stored` : ""}
                {feed?.lastError ? <span className="text-alert"> · {feed.lastError}</span> : null}
              </p>
            </div>
          );
        })}
      </div>

      <form action={addSourceAction} className="mt-12 max-w-[420px] space-y-4">
        <p className="text-[12px] text-faint">Add RSS source</p>
        <label className="block text-[13px] text-mute">
          Name
          <input name="name" required className="field mt-1 py-2 text-[15px]" />
        </label>
        <label className="block text-[13px] text-mute">
          Domain
          <input name="domain" required placeholder="theverge.com" className="field mt-1 py-2 text-[15px]" />
        </label>
        <label className="block text-[13px] text-mute">
          Feed URL
          <input name="url" type="url" required className="field mt-1 py-2 text-[15px]" />
        </label>
        <label className="block text-[13px] text-mute">
          Tier
          <select name="tier" defaultValue="2" className="field mt-1 py-2 text-[15px]">
            <option value="0">0 Primary</option>
            <option value="1">1 Independent</option>
            <option value="2">2 Specialist</option>
            <option value="3">3 Aggregator</option>
            <option value="4">4 Community</option>
          </select>
        </label>
        <input type="hidden" name="category" value="technology" />
        <button type="submit" className="nav-item mt-2 h-11 text-ink">
          Add source
        </button>
      </form>
    </div>
  );
}
