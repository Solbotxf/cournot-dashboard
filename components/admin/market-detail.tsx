"use client";

import type { AdminMarket } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function MarketDetail({ market }: { market: AdminMarket }) {
  return (
    <div className="space-y-4">
      {/* Info card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{market.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{market.description}</p>
              {market.platform_url && (
                <a
                  href={market.platform_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  View on {market.platform} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Badge variant="outline" className={cn(
                "text-xs",
                market.status === "ALERTED" && "bg-red-500/10 text-red-400 border-red-500/30",
              )}>
                {market.status}
              </Badge>
              <Badge variant="outline" className="text-xs">{market.platform}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Start</span>
              <p>{formatDate(market.start_time)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">End</span>
              <p>{formatDate(market.end_time)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Resolve By</span>
              <p className="text-amber-400">{formatDate(market.resolve_time)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Added By</span>
              <p className="font-mono text-xs">{market.created_by}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert reason */}
      {market.alert_reason && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">Alert Reason</p>
                <p className="text-sm text-muted-foreground mt-1">{market.alert_reason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
