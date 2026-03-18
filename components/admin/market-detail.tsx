"use client";

import type { AdminMarket } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function statusBadge(market: AdminMarket) {
  switch (market.status) {
    case "monitoring":
      return <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400">Monitoring</Badge>;
    case "pending_verification":
      return <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400">Pending Verification</Badge>;
    case "resolved":
      return <Badge variant="outline" className="text-xs text-muted-foreground">Resolved</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{market.status}</Badge>;
  }
}

export function MarketDetail({ market, actions }: { market: AdminMarket; actions?: ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold truncate">{market.title}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={cn("text-[10px]", market.market_timing_type === "time_based" ? "bg-cyan-500/10 text-cyan-400" : market.market_timing_type === "event_based" ? "bg-orange-500/10 text-orange-400" : "text-muted-foreground")}>
              {market.market_timing_type || "unset"}
            </Badge>
            {market.source && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {market.source}
              </Badge>
            )}
            {statusBadge(market)}
            {market.ai_outcome && (
              <Badge variant="outline" className={cn("text-xs", {
                "bg-green-500/10 text-green-400": market.ai_outcome === "YES",
                "bg-red-500/10 text-red-400": market.ai_outcome === "NO",
                "bg-yellow-500/10 text-yellow-500": market.ai_outcome === "INVALID",
                "bg-purple-500/10 text-purple-400": !["YES", "NO", "INVALID"].includes(market.ai_outcome),
              })}>
                AI: {market.ai_outcome}
              </Badge>
            )}
            {actions}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-2">{market.description}</p>
        {market.platform_url && (
          <a
            href={market.platform_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
          >
            View on platform <ExternalLink className="h-3 w-3" />
          </a>
        )}

        <div className="grid grid-cols-6 gap-4 mt-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Start</span>
            <p>{formatDate(market.start_time)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">End</span>
            <p>{formatDate(market.end_time)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Expected Resolve</span>
            <p>{market.expected_resolve_time ? formatDate(market.expected_resolve_time) : "—"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">AI Result</span>
            <p>{market.ai_result_time ? formatDate(market.ai_result_time) : "—"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Resolved</span>
            <p className={market.resolve_time ? "text-amber-400" : ""}>
              {market.resolve_time ? formatDate(market.resolve_time) : "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Created By</span>
            <p className="font-mono text-xs truncate">{market.user_id}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
