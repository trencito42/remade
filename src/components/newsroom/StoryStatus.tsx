import type { StoryStatus } from "@/types/domain";
import { cn } from "@/lib/utils";

const labels: Record<StoryStatus, string> = {
  ingesting: "Ingesting",
  developing: "Developing",
  confirmed: "Confirmed",
  disputed: "Disputed",
  published: "Published",
  archived: "Archived",
};

export function StoryStatus({ status }: { status: StoryStatus }) {
  return (
    <span
      className={cn(
        "text-[12px]",
        status === "confirmed" || status === "published" ? "text-ok" : "",
        status === "developing" || status === "ingesting" ? "text-warn" : "",
        status === "disputed" ? "text-alert" : "",
        status === "archived" ? "text-mute" : "",
      )}
    >
      {labels[status]}
    </span>
  );
}
