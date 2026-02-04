import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  SourceStatusBadge,
  PlatformBadge,
} from "@/components/shared/status-badge";
import { InlineCopyButton } from "@/components/shared/copy-field";
import { ParseFailedBanner } from "@/components/shared/error-callout";
import { HeroPending } from "@/components/detail/hero-pending";
import { HeroResolved } from "@/components/detail/hero-resolved";
import { ProofNarrative } from "@/components/detail/proof-narrative";
import { PillarUnderstanding } from "@/components/detail/pillar-understanding";
import { PillarPerformance } from "@/components/detail/pillar-performance";
import { PillarTrust } from "@/components/detail/pillar-trust";
import { DeepTabs } from "@/components/detail/deep-tabs";
import { DiscoveredSourcesCard } from "@/components/detail/discovered-sources";
import { ReasoningTraceCard } from "@/components/detail/reasoning-trace";
import { TimelineSection } from "@/components/detail/timeline";
import { getCaseById, mockCases } from "@/lib/mock-data";

export function generateStaticParams() {
  return mockCases.map((c) => ({ id: c.market_id }));
}

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const c = getCaseById(params.id);
  if (!c) notFound();

  // Determine layout: pending (no oracle result + unresolved) vs resolved
  const isPending = !c.oracle_result && c.source.official_outcome === "UNKNOWN";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/cases" className="hover:text-foreground transition-colors">
          Cases
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground truncate max-w-[300px]">{c.source.title}</span>
      </nav>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight">{c.source.title}</h1>
            <p className="text-sm text-muted-foreground">{c.source.question}</p>
          </div>
          <a
            href={c.source.event_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            Open in {c.source.platform}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PlatformBadge platform={c.source.platform} />
          <SourceStatusBadge status={c.source.status} />
          <Badge variant="outline" className="text-[10px] font-mono">
            {c.parse_result.metadata.question_type}
          </Badge>
          {c.parse_result.prompt_spec && (
            <Badge variant="outline" className="text-[10px] font-mono">
              v{c.parse_result.prompt_spec.schema_version}
            </Badge>
          )}
          <div className="flex items-center gap-1 ml-2">
            <span className="text-[11px] font-mono text-muted-foreground">{c.market_id}</span>
            <InlineCopyButton value={c.market_id} label="Market ID" />
          </div>
        </div>
      </div>

      {/* Parse failed banner */}
      {!c.parse_result.ok && c.parse_result.error && (
        <ParseFailedBanner error={c.parse_result.error} />
      )}

      {/* ═══ HERO: Layout A (Pending) or Layout B (Resolved) ═══ */}
      {isPending ? <HeroPending c={c} /> : <HeroResolved c={c} />}

      {/* ═══ PROOF NARRATIVE (resolved cases only) ═══ */}
      {!isPending && c.oracle_result && <ProofNarrative c={c} />}

      {/* ═══ DISCOVERED SOURCES (if deferred discovery) ═══ */}
      {c.oracle_result?.discovered_sources && c.oracle_result.discovered_sources.length > 0 && (
        <DiscoveredSourcesCard sources={c.oracle_result.discovered_sources} />
      )}

      {/* ═══ REASONING TRACE ═══ */}
      {c.oracle_result?.reasoning_steps && c.oracle_result.reasoning_steps.length > 0 && (
        <ReasoningTraceCard
          steps={c.oracle_result.reasoning_steps}
          evidenceSummary={c.oracle_result.evidence_summary}
          reasoningSummary={c.oracle_result.reasoning_summary}
        />
      )}

      {/* ═══ THREE PILLARS + TIMELINE ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* Pillar 1: AI Understanding */}
          <PillarUnderstanding c={c} />

          {/* Pillar 2: Performance */}
          <PillarPerformance c={c} />

          {/* Pillar 3: Trust & Proof */}
          <PillarTrust c={c} />
        </div>

        {/* Right column: Timeline */}
        <div className="space-y-6">
          <TimelineSection c={c} />
        </div>
      </div>

      {/* ═══ DEEP-LINKABLE TABS ═══ */}
      <DeepTabs c={c} />
    </div>
  );
}
