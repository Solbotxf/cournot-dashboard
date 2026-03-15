"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useRole } from "@/lib/role";
import { fetchMarket } from "@/lib/admin-api";
import type { AdminMarket, RunSummary } from "@/lib/types";
import { MarketDetail } from "@/components/admin/market-detail";
import { PorTrigger } from "@/components/admin/por-trigger";
import { ResolveForm } from "@/components/admin/resolve-form";
import { Loader2 } from "lucide-react";

export default function MarketDetailPage() {
  const params = useParams<{ id: string }>();
  const { accessCode } = useRole();
  const [market, setMarket] = useState<AdminMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [porResult, setPorResult] = useState<RunSummary | null>(null);

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

  const isResolved = !!market.resolve_time;
  const hasExistingAiResult = !!market.ai_result;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-xs text-muted-foreground">
        Admin → Market Monitor → <span className="text-foreground">{market.title}</span>
      </div>

      <MarketDetail market={market} />

      {!isResolved && (
        <>
          <PorTrigger
            question={market.title}
            onResult={setPorResult}
          />
          <ResolveForm
            marketId={market.id}
            hasExistingAiResult={hasExistingAiResult}
            porResult={porResult}
          />
        </>
      )}
    </div>
  );
}
