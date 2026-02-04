"use client";

import type { MarketCase, ParseResult, RunSummary } from "@/lib/types";
import { HeroPending } from "@/components/detail/hero-pending";
import { HeroResolved } from "@/components/detail/hero-resolved";
import { PillarUnderstanding } from "@/components/detail/pillar-understanding";
import { PillarPerformance } from "@/components/detail/pillar-performance";
import { PillarTrust } from "@/components/detail/pillar-trust";
import { DeepTabs } from "@/components/detail/deep-tabs";
import { DiscoveredSourcesCard } from "@/components/detail/discovered-sources";
import { ReasoningTraceCard } from "@/components/detail/reasoning-trace";

interface PlaygroundResultsProps {
  promptResult: ParseResult;
  resolveResult: RunSummary | null;
  userInput: string;
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
}: PlaygroundResultsProps) {
  const c = buildSyntheticCase(promptResult, resolveResult, userInput);
  const isResolved = resolveResult !== null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero section */}
      {isResolved ? <HeroResolved c={c} /> : <HeroPending c={c} />}

      {/* Discovered Sources (resolve only) */}
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
