"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import type { SourceStatus, MatchStatus } from "@/lib/types";

export interface FilterState {
  sourceStatus: SourceStatus | "ALL";
  matchStatus: MatchStatus | "ALL";
  needsAttention: boolean;
}

export const defaultFilters: FilterState = {
  sourceStatus: "ALL",
  matchStatus: "ALL",
  needsAttention: false,
};

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === opt.value
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CaseFilters({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card/50 px-4 py-3">
      <ChipGroup
        label="Status"
        value={filters.sourceStatus}
        onChange={(v) => onChange({ ...filters, sourceStatus: v })}
        options={[
          { value: "ALL", label: "All" },
          { value: "OPEN", label: "Open" },
          { value: "CLOSED", label: "Closed" },
          { value: "RESOLVED", label: "Resolved" },
          { value: "DISPUTED", label: "Disputed" },
        ]}
      />

      <div className="h-5 w-px bg-border hidden sm:block" />

      <ChipGroup
        label="Match"
        value={filters.matchStatus}
        onChange={(v) => onChange({ ...filters, matchStatus: v })}
        options={[
          { value: "ALL", label: "All" },
          { value: "MATCH", label: "Match" },
          { value: "MISMATCH", label: "Mismatch" },
          { value: "PENDING", label: "Pending" },
          { value: "VERIFICATION_FAILED", label: "Verify Failed" },
        ]}
      />

      <div className="h-5 w-px bg-border hidden sm:block" />

      <button
        onClick={() => onChange({ ...filters, needsAttention: !filters.needsAttention })}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
          filters.needsAttention
            ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
            : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <AlertTriangle className="h-3 w-3" />
        Needs Attention
      </button>
    </div>
  );
}
