"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useRole } from "@/lib/role";
import { fetchMarket, updateMarket } from "@/lib/admin-api";
import type { AdminMarket, RunSummary } from "@/lib/types";
import { MarketDetail } from "@/components/admin/market-detail";
import { AiResultDetail } from "@/components/admin/ai-result-detail";
import { PorTrigger } from "@/components/admin/por-trigger";
import { ResolveForm } from "@/components/admin/resolve-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MarketDetailPage() {
  const params = useParams<{ id: string }>();
  const { accessCode } = useRole();
  const [market, setMarket] = useState<AdminMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [porResult, setPorResult] = useState<RunSummary | null>(null);
  const [porRawResult, setPorRawResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessCode || !params.id) return;
    setLoading(true);
    try {
      const m = await fetchMarket(accessCode, Number(params.id));
      setMarket(m);
    } catch {
      // Error handled by admin-api
    } finally {
      setLoading(false);
    }
  }, [accessCode, params.id]);

  useEffect(() => { load(); }, [load]);

  async function handleBackToMonitoring() {
    if (!accessCode || !market) return;
    try {
      await updateMarket(accessCode, market.id, { status: "monitoring" });
      toast.success("Market moved back to monitoring");
      load();
    } catch {
      // Error handled by admin-api
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Market not found
      </div>
    );
  }

  // Use PoR raw result if available, otherwise fall back to market's ai_result
  const displayAiResult = porRawResult || market.ai_result;

  // Build the resolve form content passed into PorTrigger's Resolve tab
  const resolveForm = (displayAiResult || porResult) ? (
    <ResolveForm
      marketId={market.id}
      porResult={porResult}
      rawAiResult={displayAiResult || undefined}
      onResolved={load}
      onRevertToMonitoring={market.status === "pending_verification" ? handleBackToMonitoring : undefined}
    />
  ) : undefined;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-xs text-muted-foreground">
        Admin &rarr; Market Monitor &rarr; <span className="text-foreground">{market.title}</span>
      </div>

      <MarketDetail market={market} />

      {/* AI Result Detail — full evidence, reasoning, proofs */}
      {displayAiResult && (
        <AiResultDetail
          aiResult={displayAiResult}
          aiPrompt={market.ai_prompt || undefined}
          resolveReasoning={market.resolve_reasoning || undefined}
        />
      )}

      {/* Action panel — shown for monitoring and pending_verification */}
      {(market.status === "monitoring" || market.status === "pending_verification") && (
        <PorTrigger
          question={market.title}
          aiPrompt={market.ai_prompt || undefined}
          aiResult={displayAiResult || undefined}
          onResult={setPorResult}
          onRawResult={setPorRawResult}
          resolveContent={resolveForm}
        />
      )}

      {/* resolved: read-only, no action buttons */}
    </div>
  );
}
