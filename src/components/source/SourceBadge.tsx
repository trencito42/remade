import { sourceTierLabels, type SourceTier } from "@/types/domain";

export function SourceBadge({ tier }: { tier: number }) {
  return <span className="text-faint">{sourceTierLabels[tier as SourceTier] ?? `Tier ${tier}`}</span>;
}
