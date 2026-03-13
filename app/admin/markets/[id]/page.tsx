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
      const data = await fetchMarket(accessCode, params.id);
      setMarket(data.market);
      if (data.market.por_result) {
        setPorResult(data.market.por_result);
      }
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

  const isResolvable = ["ALERTED", "MONITORING", "ACTIVE"].includes(market.status);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-xs text-muted-foreground">
        Admin → Market Monitor → <span className="text-foreground">{market.title}</span>
      </div>

      <MarketDetail market={market} />

      {isResolvable && (
        <>
          <PorTrigger
            question={market.question}
            onResult={setPorResult}
            newsUrl={`https://news.google.com/search?q=${encodeURIComponent(market.question)}`}
          />
          <ResolveForm marketId={market.id} porResult={porResult} />
        </>
      )}

      {market.status === "RESOLVED" && market.resolution && (
        <div className="rounded-lg border border-border bg-muted/30 p-6">
          <p className="text-sm font-medium mb-3">Resolution</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Outcome</span>
              <p className="font-bold">{market.resolution.outcome}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Confidence</span>
              <p>{(market.resolution.confidence * 100).toFixed(0)}%</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Method</span>
              <p>{market.resolution.method}</p>
            </div>
          </div>
          {market.resolution.admin_notes && (
            <p className="text-sm text-muted-foreground mt-3">{market.resolution.admin_notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
