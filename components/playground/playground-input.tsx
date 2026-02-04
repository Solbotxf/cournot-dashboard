"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Plus,
  X,
  Sparkles,
  Play,
  Settings2,
} from "lucide-react";

const TEMPLATES = [
  {
    label: "Gov Shutdown",
    text: `US government shutdown Saturday?\n\nThis market will resolve to "Yes" if the U.S. Office of Personnel Management (OPM) announces another federal government shutdown due to a lapse in appropriations by January 31, 2026, 11:59 PM ET. Otherwise, this market will resolve to "No".\n\nPartial shutdowns count as shutdowns; announcements of office closures due to holidays or inclement weather do not qualify as a shutdown.\n\nThe resolution source for this market will be OPM's Operating Status page (https://www.opm.gov/policy-data-oversight/snow-dismissal-procedures/current-status/).`,
  },
  {
    label: "Fed Rate Cut",
    text: `Will the Federal Reserve cut interest rates at the March 2026 FOMC meeting?\n\nThis market will resolve to "Yes" if the Federal Open Market Committee (FOMC) announces a reduction in the federal funds target rate at the conclusion of its March 18-19, 2026 meeting. Otherwise, this market will resolve to "No".\n\nThe resolution source is the official FOMC statement published on the Federal Reserve's website (https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm).`,
  },
  {
    label: "BTC $150k",
    text: `Will Bitcoin reach $150,000 before April 2026?\n\nThis market will resolve to "Yes" if the BTC/USD spot price on Coinbase, Binance, or Kraken reaches or exceeds $150,000.00 at any point before April 1, 2026, 12:00 AM UTC. Otherwise, this market will resolve to "No".\n\nThe price must be reflected on at least one of the three listed exchanges. Futures or derivative prices do not count.`,
  },
  {
    label: "SpaceX Starship",
    text: `Will SpaceX Starship complete a successful orbital flight by June 2026?\n\nThis market will resolve to "Yes" if SpaceX's Starship vehicle (including Super Heavy booster) completes a full orbital trajectory with both stages performing nominally before June 30, 2026, 11:59 PM UTC. Otherwise, this market will resolve to "No".\n\nA successful flight requires the vehicle to reach orbital velocity and complete at least one orbit. Suborbital test flights do not count.`,
  },
  {
    label: "S&P 500 Correction",
    text: `Will the S&P 500 experience a 10%+ correction in Q1 2026?\n\nThis market will resolve to "Yes" if the S&P 500 index (SPX) closes at a value that is 10% or more below its highest closing value during Q1 2026, at any point between January 1, 2026 and March 31, 2026. Otherwise, this market will resolve to "No".\n\nThe resolution source is the official closing price data from NYSE/CBOE.`,
  },
];

const DEFAULT_SOURCES = [
  "Associated Press",
  "Reuters",
  "Bloomberg",
  "ESPN",
  "Official Gov",
  "Wikipedia",
];

interface PlaygroundInputProps {
  userInput: string;
  onUserInputChange: (v: string) => void;
  predictionType: string;
  onPredictionTypeChange: (v: string) => void;
  multiSelectChoices: string[];
  onMultiSelectChoicesChange: (v: string[]) => void;
  resolutionDeadline: string;
  onResolutionDeadlineChange: (v: string) => void;
  dataSources: string[];
  onDataSourcesChange: (v: string[]) => void;
  strictMode: boolean;
  onStrictModeChange: (v: boolean) => void;
  onPrompt: () => void;
  onResolve: () => void;
  canResolve: boolean;
  isLoading: boolean;
  compact: boolean;
}

export function PlaygroundInput({
  userInput,
  onUserInputChange,
  predictionType,
  onPredictionTypeChange,
  multiSelectChoices,
  onMultiSelectChoicesChange,
  resolutionDeadline,
  onResolutionDeadlineChange,
  dataSources,
  onDataSourcesChange,
  strictMode,
  onStrictModeChange,
  onPrompt,
  onResolve,
  canResolve,
  isLoading,
  compact,
}: PlaygroundInputProps) {
  const [configOpen, setConfigOpen] = useState(!compact);

  const toggleSource = (source: string) => {
    if (dataSources.includes(source)) {
      onDataSourcesChange(dataSources.filter((s) => s !== source));
    } else {
      onDataSourcesChange([...dataSources, source]);
    }
  };

  const addChoice = () => {
    onMultiSelectChoicesChange([...multiSelectChoices, ""]);
  };

  const removeChoice = (index: number) => {
    onMultiSelectChoicesChange(multiSelectChoices.filter((_, i) => i !== index));
  };

  const updateChoice = (index: number, value: string) => {
    const updated = [...multiSelectChoices];
    updated[index] = value;
    onMultiSelectChoicesChange(updated);
  };

  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
      <CardContent className={cn("space-y-4", compact ? "pt-4 pb-4" : "pt-5 pb-5")}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold tracking-tight">Market Question</h2>
        </div>

        {/* Templates */}
        {!compact && (
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => onUserInputChange(t.text)}
                disabled={isLoading}
                className="rounded-md border border-border bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-violet-500/10 hover:text-violet-300 hover:border-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Textarea */}
        <Textarea
          placeholder="e.g. Will the Federal Reserve cut interest rates by more than 25 basis points at the June 2025 FOMC meeting?"
          value={userInput}
          onChange={(e) => onUserInputChange(e.target.value)}
          className={cn(
            "resize-none transition-all duration-300 bg-muted/20 border-border/50 focus:border-violet-500/50",
            compact ? "min-h-[60px]" : "min-h-[120px]"
          )}
          disabled={isLoading}
        />

        {/* Collapsible Config */}
        <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
            <Settings2 className="h-3.5 w-3.5" />
            <span className="font-medium">Configuration</span>
            <ChevronDown
              className={cn(
                "h-3 w-3 ml-auto transition-transform",
                configOpen && "rotate-180"
              )}
            />
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-3 space-y-4">
            {/* Prediction Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Prediction Type
              </label>
              <ToggleGroup
                type="single"
                value={predictionType}
                onValueChange={(v) => v && onPredictionTypeChange(v)}
                className="justify-start"
              >
                <ToggleGroupItem
                  value="binary"
                  className="text-xs px-3 py-1 h-7 data-[state=on]:bg-violet-500/20 data-[state=on]:text-violet-300"
                >
                  Binary
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="multi_select"
                  className="text-xs px-3 py-1 h-7 data-[state=on]:bg-violet-500/20 data-[state=on]:text-violet-300"
                >
                  Multi-select
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Multi-select choices */}
            {predictionType === "multi_select" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Choices
                </label>
                <div className="space-y-1.5">
                  {multiSelectChoices.map((choice, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Input
                        value={choice}
                        onChange={(e) => updateChoice(i, e.target.value)}
                        placeholder={`Choice ${i + 1}`}
                        className="h-7 text-xs bg-muted/20"
                      />
                      <button
                        onClick={() => removeChoice(i)}
                        className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addChoice}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-violet-400 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add choice
                  </button>
                </div>
              </div>
            )}

            {/* Resolution Deadline */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Resolution Deadline
              </label>
              <Input
                type="date"
                value={resolutionDeadline}
                onChange={(e) => onResolutionDeadlineChange(e.target.value)}
                className="h-7 text-xs bg-muted/20 w-48"
              />
            </div>

            {/* Data Sources */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Data Sources
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_SOURCES.map((source) => (
                  <Badge
                    key={source}
                    variant={dataSources.includes(source) ? "default" : "outline"}
                    className={cn(
                      "text-[10px] cursor-pointer transition-colors select-none",
                      dataSources.includes(source)
                        ? "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border-violet-500/30"
                        : "hover:border-violet-500/30 hover:text-violet-300"
                    )}
                    onClick={() => toggleSource(source)}
                  >
                    {source}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Strict Mode */}
            <div className="flex items-center gap-2">
              <Switch
                checked={strictMode}
                onCheckedChange={onStrictModeChange}
              />
              <label className="text-xs text-muted-foreground">
                Strict mode
              </label>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons */}
        <div className={cn("flex gap-2", compact ? "pt-0" : "pt-2")}>
          <button
            onClick={onPrompt}
            disabled={!userInput.trim() || isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Prompt
          </button>
          <button
            onClick={onResolve}
            disabled={!canResolve || isLoading}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              canResolve && !isLoading
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Play className="h-3.5 w-3.5" />
            Resolve
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
