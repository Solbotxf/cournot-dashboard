"use client";

import type { MarketCase, ParseResult, RunSummary, ExecutionLog } from "@/lib/types";
import { HeroPending } from "@/components/detail/hero-pending";
import { HeroResolved } from "@/components/detail/hero-resolved";
import { PillarUnderstanding } from "@/components/detail/pillar-understanding";
import { PillarPerformance } from "@/components/detail/pillar-performance";
import { PillarTrust } from "@/components/detail/pillar-trust";
import { DeepTabs } from "@/components/detail/deep-tabs";
import { DiscoveredSourcesCard } from "@/components/detail/discovered-sources";
import { ReasoningTraceCard } from "@/components/detail/reasoning-trace";
import { EvidenceSection } from "@/components/detail/evidence-section";
import { ExecutionLogsCard } from "@/components/detail/execution-logs";

interface PlaygroundResultsProps {
  promptResult: ParseResult;
  resolveResult: RunSummary | null;
  userInput: string;
  executionLogs?: ExecutionLog[];
}

function buildSyntheticCase(
  promptResult: ParseResult,
  resolveResult: RunSummary | null,
  userInput: string
): MarketCase {
  const spec = promptResult.prompt_spec;
  const now = new Date().toISOString();

  return {
    market_id: `playground-${Date.now()}`,
    source: {
      platform: "Playground",
      event_url: "",
      title: userInput.slice(0, 100),
      question: userInput,
      resolution_deadline: spec?.market.resolution_deadline ?? now,
      resolution_window: spec?.market.resolution_window ?? {
        start: now,
        end: now,
      },
      status: resolveResult ? "RESOLVED" : "OPEN",
      official_outcome: "UNKNOWN",
      official_resolved_at: null,
      last_updated_at: now,
    },
    parse_result: promptResult,
    oracle_result: resolveResult,
  };
}

export function PlaygroundResults({
  promptResult,
  resolveResult,
  userInput,
  executionLogs = [],
}: PlaygroundResultsProps) {
  // Debug: log resolveResult to console
  console.log("resolveResult:", JSON.stringify(resolveResult, null, 2));

  const c = buildSyntheticCase(promptResult, resolveResult, userInput);
  const isResolved = resolveResult !== null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero section */}
      {isResolved ? <HeroResolved c={c} /> : <HeroPending c={c} />}

      {/* Evidence Section (resolve only) */}
      {isResolved && resolveResult.evidence_items && resolveResult.evidence_items.length > 0 && (
        <EvidenceSection result={resolveResult} toolPlan={promptResult.tool_plan} />
      )}

      {/* Execution Logs (from collect step) */}
      {executionLogs.length > 0 && (
        <ExecutionLogsCard logs={executionLogs} />
      )}

      {/* Discovered Sources (resolve only, legacy format) */}
      {isResolved && resolveResult.discovered_sources && resolveResult.discovered_sources.length > 0 && (
        <DiscoveredSourcesCard sources={resolveResult.discovered_sources} />
      )}

      {/* Reasoning Trace (resolve only) */}
      {isResolved && resolveResult.reasoning_steps && resolveResult.reasoning_steps.length > 0 && (
        <ReasoningTraceCard
          steps={resolveResult.reasoning_steps}
          evidenceSummary={resolveResult.evidence_summary}
          reasoningSummary={resolveResult.reasoning_summary}
        />
      )}

      {/* Pillars */}
      <div className="space-y-6">
        <PillarUnderstanding c={c} />
        {isResolved && (
          <>
            <PillarPerformance c={c} />
            <PillarTrust c={c} />
          </>
        )}
      </div>

      {/* Deep Tabs */}
      <DeepTabs c={c} />
    </div>
  );
}
