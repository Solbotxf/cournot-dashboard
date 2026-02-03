"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JsonViewerPro } from "@/components/shared/json-viewer-pro";
import { ErrorCallout } from "@/components/shared/error-callout";
import type { MarketCase, DataRequirement, Check } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  FileText,
  Route,
  Database,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Package,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabKey =
  | "prompt_spec"
  | "tool_plan"
  | "data_reqs"
  | "evidence"
  | "checks"
  | "errors"
  | "raw";

interface TabDef {
  key: TabKey;
  label: string;
  icon: typeof FileText;
  badge?: (c: MarketCase) => string | null;
}

const tabDefs: TabDef[] = [
  { key: "prompt_spec", label: "PromptSpec", icon: FileText },
  { key: "tool_plan", label: "ToolPlan", icon: Route },
  { key: "data_reqs", label: "Data Requirements", icon: Database },
  { key: "evidence", label: "Evidence Snapshot", icon: Camera },
  {
    key: "checks",
    label: "Checks",
    icon: CheckCircle2,
    badge: (c) => {
      if (!c.oracle_result) return null;
      const fail = c.oracle_result.checks.filter((ch) => ch.status === "fail").length;
      if (fail > 0) return `${fail} fail`;
      return `${c.oracle_result.checks.length}`;
    },
  },
  {
    key: "errors",
    label: "Errors",
    icon: AlertTriangle,
    badge: (c) => {
      if (!c.oracle_result || c.oracle_result.errors.length === 0) return null;
      return String(c.oracle_result.errors.length);
    },
  },
  { key: "raw", label: "Raw Bundle", icon: Package },
];

// ─── Sub-panels ───────────────────────────────────────────────────────────────

function DataRequirementsTable({ reqs }: { reqs: DataRequirement[] }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Requirement</TableHead>
            <TableHead>Sources</TableHead>
            <TableHead>Expected Fields</TableHead>
            <TableHead>Strategy</TableHead>
            <TableHead>Quorum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reqs.map((req) => (
            <TableRow key={req.requirement_id}>
              <TableCell>
                <div>
                  <Badge variant="outline" className="text-[10px] font-mono mb-1">
                    {req.requirement_id}
                  </Badge>
                  <p className="text-xs text-muted-foreground">{req.description}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {req.source_targets.map((st) => (
                    <div key={st.uri} className="text-[11px]">
                      <span className="font-mono text-violet-400">{st.provider}</span>
                      <p className="text-muted-foreground truncate max-w-[200px] font-mono text-[10px]">
                        {st.uri}
                      </p>
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {req.expected_fields.map((f) => (
                    <Badge key={f} variant="outline" className="text-[10px] font-mono">
                      {f}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {req.selection_policy.strategy}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {req.selection_policy.quorum}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EvidenceSnapshotPanel({ c }: { c: MarketCase }) {
  const plan = c.parse_result.tool_plan;
  const oracle = c.oracle_result;

  if (!plan) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No tool plan available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sources overview */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Planned Sources ({plan.sources.length})
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {plan.sources.map((s) => (
            <div
              key={s.source_id}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
            >
              <Database className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium font-mono capitalize">{s.provider}</p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  {s.endpoint}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                T{s.tier}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Execution config */}
      <div className="flex flex-wrap items-center gap-4 text-xs rounded-lg border border-border/50 bg-muted/10 px-4 py-3">
        <div>
          <span className="text-muted-foreground">Min Tier:</span>{" "}
          <span className="font-mono font-medium">T{plan.min_provenance_tier}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Fallbacks:</span>{" "}
          <span className={plan.allow_fallbacks ? "text-emerald-400" : "text-red-400"}>
            {plan.allow_fallbacks ? "Enabled" : "Disabled"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Requirements:</span>{" "}
          {plan.requirements.map((r) => (
            <Badge key={r} variant="outline" className="text-[10px] font-mono ml-1">
              {r}
            </Badge>
          ))}
        </div>
      </div>

      {/* Duration if available */}
      {oracle && (
        <div className="text-xs text-muted-foreground">
          Executed in <span className="font-mono text-foreground">{oracle.duration_ms}ms</span>
          {" "}on{" "}
          <span className="font-mono text-foreground">
            {new Date(oracle.executed_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}
    </div>
  );
}

function ChecksPanel({ c }: { c: MarketCase }) {
  if (!c.oracle_result || c.oracle_result.checks.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No checks available
      </div>
    );
  }

  const iconMap: Record<Check["status"], { icon: typeof CheckCircle2; color: string }> = {
    pass: { icon: CheckCircle2, color: "text-emerald-400" },
    fail: { icon: XCircle, color: "text-red-400" },
    warn: { icon: AlertTriangle, color: "text-yellow-400" },
    skip: { icon: MinusCircle, color: "text-slate-400" },
  };

  return (
    <div className="space-y-2">
      {c.oracle_result.checks.map((check) => {
        const cfg = iconMap[check.status];
        const Icon = cfg.icon;
        return (
          <div
            key={check.check_id}
            className="rounded-lg border border-border/50 px-3 py-2.5 space-y-1"
          >
            <div className="flex items-center gap-2.5">
              <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.color)} />
              <span className="text-xs font-medium flex-1">{check.name}</span>
              <Badge
                variant="outline"
                className={cn("text-[10px] capitalize", cfg.color, "border-current/20")}
              >
                {check.status}
              </Badge>
              {check.requirement_id && (
                <Badge variant="outline" className="text-[10px] font-mono">
                  {check.requirement_id}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground pl-6">{check.message}</p>
          </div>
        );
      })}
    </div>
  );
}

function ErrorsPanel({ c }: { c: MarketCase }) {
  if (!c.oracle_result || c.oracle_result.errors.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No errors recorded
      </div>
    );
  }
  return <ErrorCallout errors={c.oracle_result.errors} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DeepTabs({ c }: { c: MarketCase }) {
  // Read initial tab from URL hash
  const [activeTab, setActiveTab] = useState<TabKey>("prompt_spec");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as TabKey;
    if (tabDefs.some((t) => t.key === hash)) {
      setActiveTab(hash);
    }
  }, []);

  // Update URL hash when tab changes
  function handleTabChange(key: TabKey) {
    setActiveTab(key);
    window.history.replaceState(null, "", `#${key}`);
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Deep Dive</CardTitle>
        <p className="text-xs text-muted-foreground">
          Detailed artifacts and raw data — deep-linkable via URL hash
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Tab bar */}
        <div className="flex gap-1 mb-4 overflow-x-auto border-b border-border pb-px">
          {tabDefs.map((tab) => {
            const Icon = tab.icon;
            const badge = tab.badge?.(c);
            const hasErrors =
              tab.key === "errors" &&
              c.oracle_result &&
              c.oracle_result.errors.length > 0;

            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap border-b-2 -mb-px",
                  activeTab === tab.key
                    ? "border-primary text-foreground bg-accent/30"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/20"
                )}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
                {badge && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1.5 py-0 h-4",
                      hasErrors ? "text-red-400 border-red-500/20" : ""
                    )}
                  >
                    {badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="min-h-[200px]">
          {activeTab === "prompt_spec" && (
            c.parse_result.prompt_spec ? (
              <JsonViewerPro data={c.parse_result.prompt_spec} title="PromptSpec" />
            ) : (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                No PromptSpec — parse failed
              </div>
            )
          )}

          {activeTab === "tool_plan" && (
            c.parse_result.tool_plan ? (
              <JsonViewerPro data={c.parse_result.tool_plan} title="ToolPlan" />
            ) : (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                No ToolPlan available
              </div>
            )
          )}

          {activeTab === "data_reqs" && (
            c.parse_result.prompt_spec ? (
              <DataRequirementsTable reqs={c.parse_result.prompt_spec.data_requirements} />
            ) : (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                No data requirements — parse failed
              </div>
            )
          )}

          {activeTab === "evidence" && <EvidenceSnapshotPanel c={c} />}

          {activeTab === "checks" && <ChecksPanel c={c} />}

          {activeTab === "errors" && <ErrorsPanel c={c} />}

          {activeTab === "raw" && (
            <JsonViewerPro
              data={{
                market_id: c.market_id,
                source: c.source,
                parse_result: c.parse_result,
                oracle_result: c.oracle_result,
              }}
              title="Full Case Bundle"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
