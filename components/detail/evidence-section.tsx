"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ErrorCallout } from "@/components/shared/error-callout";
import { InlineCopyButton } from "@/components/shared/copy-field";
import type { RunSummary, Check, ToolPlan, EvidenceItem } from "@/lib/types";
import {
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Globe,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const checkStatusConfig: Record<
  Check["status"],
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  pass: { icon: CheckCircle2, color: "text-emerald-400", label: "Pass" },
  fail: { icon: XCircle, color: "text-red-400", label: "Fail" },
  warn: { icon: AlertTriangle, color: "text-yellow-400", label: "Warn" },
  skip: { icon: MinusCircle, color: "text-slate-400", label: "Skip" },
};

function CheckItem({ check }: { check: Check }) {
  const [open, setOpen] = useState(false);
  const cfg = checkStatusConfig[check.status];
  const Icon = cfg.icon;

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/30 transition-colors"
      >
        <Icon className={cn("h-4 w-4 shrink-0", cfg.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">{check.name}</p>
        </div>
        <Badge variant="outline" className={cn("text-[10px]", cfg.color, "border-current/20")}>
          {cfg.label}
        </Badge>
        {check.requirement_id && (
          <Badge variant="outline" className="text-[10px] font-mono">
            {check.requirement_id}
          </Badge>
        )}
        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted-foreground transition-transform shrink-0",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border/50 px-3 py-2 bg-muted/10">
          <p className="text-xs text-muted-foreground leading-relaxed">{check.message}</p>
          {check.check_id && (
            <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">
              ID: {check.check_id}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function EvidenceSection({
  result,
  toolPlan,
}: {
  result: RunSummary | null;
  toolPlan: ToolPlan | null;
}) {
  if (!result) return null;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Evidence & Execution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Tool Plan overview */}
        {toolPlan && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tool Plan Execution
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Requirements
                </p>
                <div className="flex flex-wrap gap-1">
                  {toolPlan.requirements.map((r) => (
                    <Badge key={r} variant="outline" className="text-[10px] font-mono">
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sources Queried
                </p>
                <div className="space-y-1">
                  {toolPlan.sources.map((s) => (
                    <div key={s.source_id} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px] font-mono capitalize">
                        {s.provider}
                      </Badge>
                      <span className="text-muted-foreground font-mono text-[10px] truncate">
                        {s.endpoint}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">T{s.tier}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Min tier required:</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  T{toolPlan.min_provenance_tier}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Fallbacks:</span>
                <span className={toolPlan.allow_fallbacks ? "text-emerald-400" : "text-red-400"}>
                  {toolPlan.allow_fallbacks ? "Allowed" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Evidence items */}
        {result.evidence_items && result.evidence_items.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Evidence Items ({result.evidence_items.length})
              </p>
              <div className="space-y-2">
                {result.evidence_items.map((item) => (
                  <EvidenceItemCard key={item.evidence_id} item={item} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Checks */}
        {(result.checks ?? []).length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Checks ({(result.checks ?? []).length})
            </p>
            <div className="space-y-1.5">
              {(result.checks ?? []).map((check) => (
                <CheckItem key={check.check_id} check={check} />
              ))}
            </div>
          </div>
        )}

        {/* Errors */}
        {result.errors.length > 0 && <ErrorCallout errors={result.errors} />}
      </CardContent>
    </Card>
  );
}

// ─── Evidence Item Card ───────────────────────────────────────────────────

function EvidenceItemCard({ item }: { item: EvidenceItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/30 transition-colors"
      >
        <Globe
          className={cn(
            "h-4 w-4 shrink-0",
            item.status_code === 200 ? "text-emerald-400" : "text-red-400"
          )}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{item.source_name}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">
            {item.source_uri}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
          Tier {item.tier}
        </Badge>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-mono shrink-0",
            item.status_code === 200
              ? "text-emerald-400 border-emerald-500/20"
              : "text-red-400 border-red-500/20"
          )}
        >
          {item.status_code}
        </Badge>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted-foreground transition-transform shrink-0",
            expanded && "rotate-180"
          )}
        />
      </button>
      {expanded && (
        <div className="border-t border-border/50 px-3 py-3 bg-muted/10 space-y-3">
          {/* Parsed excerpt */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Parsed Excerpt
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
              <p className="text-xs text-foreground/80 leading-relaxed font-mono whitespace-pre-wrap">
                {item.parsed_excerpt}
              </p>
            </div>
          </div>
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Fetched at: </span>
              <span className="font-mono text-foreground/80">
                {new Date(item.fetched_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZoneName: "short",
                })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Content hash: </span>
              <span className="font-mono text-foreground/70 text-[10px] truncate">
                {item.content_hash.slice(0, 16)}...
              </span>
              <InlineCopyButton
                value={item.content_hash}
                label="Content hash"
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-mono">
              {item.evidence_id}
            </span>
            <InlineCopyButton
              value={item.evidence_id}
              label="Evidence ID"
            />
          </div>
        </div>
      )}
    </div>
  );
}
