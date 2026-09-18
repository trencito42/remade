import React from "react";
import { CircleCheck, Clock3, TriangleAlert } from "lucide-react";

export type StatusType = "confirmed" | "developing" | "disputed" | "rumor" | "unverified" | "healthy" | "failed" | string;

interface StatusIndicatorProps {
  status: StatusType;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StatusIndicator({
  status,
  showIcon = false,
  showLabel = true,
  size = "sm",
  className = "",
}: StatusIndicatorProps) {
  const norm = (status || "").toLowerCase();

  let dotColor = "status-dot-warn";
  let label = "Developing";
  let Icon = Clock3;
  let textColor = "text-mute";

  if (norm === "confirmed" || norm === "healthy" || norm === "published") {
    dotColor = "status-dot-ok";
    label = norm === "healthy" ? "Healthy" : norm === "published" ? "Published" : "Confirmed";
    Icon = CircleCheck;
    textColor = "text-[#276749]";
  } else if (norm === "disputed" || norm === "failed") {
    dotColor = "status-dot-alert";
    label = norm === "failed" ? "Failed" : "Disputed";
    Icon = TriangleAlert;
    textColor = "text-[#9b2c2c]";
  } else if (norm === "rumor") {
    dotColor = "status-dot-warn";
    label = "Rumor";
    Icon = Clock3;
    textColor = "text-[#8d6b1d]";
  } else if (norm === "unverified") {
    dotColor = "bg-[#a8a8a4]";
    label = "Unverified";
    Icon = Clock3;
    textColor = "text-mute";
  }

  const iconSize = size === "sm" ? 13 : 15;

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium tabular-nums ${className}`}>
      {showIcon ? (
        <Icon size={iconSize} strokeWidth={1.75} className={textColor} />
      ) : (
        <span className={`status-dot ${dotColor}`} />
      )}
      {showLabel && <span className="text-[12px] text-mute capitalize">{label}</span>}
    </span>
  );
}
