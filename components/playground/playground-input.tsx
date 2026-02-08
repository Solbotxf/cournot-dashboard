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
  Layers,
  Cpu,
} from "lucide-react";

interface ProviderInfo {
  provider: string;
  default_model: string;
}

const TEMPLATES = [
  {
    label: "Gov Shutdown",
    text: `US government shutdown Saturday?\n\nThis market will resolve to "Yes" if the U.S. Office of Personnel Management (OPM) announces another federal government shutdown due to a lapse in appropriations by January 31, 2026, 11:59 PM ET. Otherwise, this market will resolve to "No".\n\nPartial shutdowns count as shutdowns; announcements of office closures due to holidays or inclement weather do not qualify as a shutdown.\n\nThe resolution source for this market will be OPM's Operating Status page (https://www.opm.gov/policy-data-oversight/snow-dismissal-procedures/current-status/).`,
  },
  {
    label: "Caroline Ellison",
    text: `Caroline Ellison new boyfriend by January 31?\n\nThis market will resolve to "Yes" if Caroline Ellison is confirmed to be in a romantic relationship with any man between market creation and January 31, 2026, 11:59 PM ET. Otherwise, this market will resolve to "No".\n\nConfirmation must come directly from Caroline Ellison or their official representative(s), or a wide consensus of credible reporting.`,
  },
  {
    label: "Fed Rate Hike",
    text: `Fed rate hike in 2025?\n\nThis market will resolve to "Yes" if the upper bound of the target federal funds rate is increased at any point between January 1, 2025 and the Fed's December 2025 meeting, currently scheduled for December 9-10. Otherwise, this market will resolve to "No".\n\nThis market may not resolve to "No" until the Fed has released its rate changes information following its December meeting.\n\nThe primary resolution source for this market will be the official website of the Federal Reserve (https://www.federalreserve.gov/monetarypolicy/openmarket.htm), however a consensus of credible reporting may also be used.\n\nCreated At: Dec 29, 2024, 5:50 PM ET`,
  },
  {
    label: "SpaceX Starship",
    text: `Will SpaceX Starship complete a successful orbital flight by June 2026?\n\nThis market will resolve to "Yes" if SpaceX's Starship vehicle (including Super Heavy booster) completes a full orbital trajectory with both stages performing nominally before June 30, 2026, 11:59 PM UTC. Otherwise, this market will resolve to "No".\n\nA successful flight requires the vehicle to reach orbital velocity and complete at least one orbit. Suborbital test flights do not count.`,
  },
  {
    label: "META Earnings",
    text: `Will Meta Platforms (META) beat quarterly earnings?\n\nAs of market creation, Meta Platforms is estimated to release earnings on January 28, 2026. The Street consensus estimate for Meta Platforms's GAAP EPS for the relevant quarter is $8.19 as of market creation. This market will resolve to "Yes" if Meta Platforms reports GAAP EPS greater than $8.19 for the relevant quarter in its next quarterly earnings release. Otherwise, it will resolve to "No." The resolution source will be the GAAP EPS listed in the company's official earnings documents.\n\nIf Meta Platforms releases earnings without GAAP EPS, then the market will resolve according to the GAAP EPS figure reported by SeekingAlpha. If no such figure is published within 96h of market close (4:00:00pm ET) on the day earnings are announced, the market will resolve to "No".\n\nIf the company does not release earnings within 45 calendar days of the estimated earnings date, this market will resolve to "No."\n\nNote: Subsequent restatements, corrections, or revisions made to the initially announced GAAP EPS figure will not qualify for resolution, except in the case of obvious and immediate mistakes (e.g., fat finger errors, as with Lyft's (LYFT) earnings release in February 2024).\nNote: The strike prices used in these markets are derived from SeekingAlpha estimates, and reflect the consensus of sell-side analyst estimates for GAAP EPS.\nNote: All figures will be rounded to the nearest cent using standard rounding.\nNote: For the purposes of this market, IFRS EPS will be treated as GAAP EPS.\nNote: For the purposes of this market, GAAP EPS refers to diluted GAAP EPS, unless this is not published, in which case it refers to basic GAAP EPS.\nNote: All figures are expressed in USD, unless otherwise indicated.\nNote: For primarily internationally listed companies, this market refers specifically to the shares traded in the United States on U.S. stock exchanges such as the NYSE or Nasdaq. In cases where the company trades in the U.S. through an American Depositary Receipt (ADR) or American Depositary Share (ADS), this market will refer to the ADR/ADS.`,
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

interface CollectorInfo {
  id: string;
  name: string;
  description: string;
}

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
  useMultiStep?: boolean;
  // Collector options
  availableCollectors?: CollectorInfo[];
  selectedCollectors?: string[];
  onToggleCollector?: (collectorId: string) => void;
  // LLM provider/model selection
  providers?: ProviderInfo[];
  selectedProvider?: string | null;
  selectedModel?: string;
  onProviderChange?: (provider: string | null) => void;
  onModelChange?: (model: string) => void;
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
  availableCollectors = [],
  selectedCollectors = [],
  onToggleCollector,
  providers = [],
  selectedProvider = null,
  selectedModel = "",
  onProviderChange,
  onModelChange,
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
        <div className={cn("space-y-3", compact ? "pt-0" : "pt-2")}>
          {/* Collector Selection (appears when prompt is done) */}
          {canResolve && onToggleCollector && availableCollectors.length > 0 && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Evidence Collectors</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {selectedCollectors.length} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableCollectors.map((collector) => {
                  const isSelected = selectedCollectors.includes(collector.id);
                  return (
                    <button
                      key={collector.id}
                      onClick={() => onToggleCollector(collector.id)}
                      disabled={isLoading}
                      title={collector.description}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                        isSelected
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-muted/30 text-muted-foreground border border-border/50 hover:border-emerald-500/30 hover:text-emerald-300",
                        isLoading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div
                        className={cn(
                          "w-3 h-3 rounded-sm border flex items-center justify-center",
                          isSelected
                            ? "border-emerald-400 bg-emerald-500"
                            : "border-muted-foreground/40"
                        )}
                      >
                        {isSelected && (
                          <svg
                            className="w-2 h-2 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      {collector.name}
                    </button>
                  );
                })}
              </div>
              {selectedCollectors.some((c) => c.toLowerCase().includes("graphrag")) && (
                <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5">
                  <span className="text-amber-400 text-sm leading-none mt-0.5">&#9888;</span>
                  <span className="text-[11px] text-amber-300/90">
                    GraphRAG builds a knowledge graph before reasoning. This may take a few minutes to resolve.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* LLM Provider/Model Selection (appears when prompt is done) */}
          {canResolve && providers.length > 0 && onProviderChange && onModelChange && (
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-xs font-medium text-violet-400">LLM Provider</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {selectedProvider ?? "server default"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedProvider ?? ""}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    onProviderChange(value);
                    if (value) {
                      const info = providers.find((p) => p.provider === value);
                      if (info) onModelChange(info.default_model);
                    } else {
                      onModelChange("");
                    }
                  }}
                  disabled={isLoading}
                  className={cn(
                    "rounded-md border bg-muted/20 px-2.5 py-1 text-xs transition-colors",
                    "border-violet-500/30 focus:border-violet-500/50 focus:outline-none",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <option value="">Server Default</option>
                  {providers.map((p) => (
                    <option key={p.provider} value={p.provider}>
                      {p.provider}
                    </option>
                  ))}
                </select>
                {selectedProvider && (
                  <input
                    type="text"
                    value={selectedModel}
                    onChange={(e) => onModelChange(e.target.value)}
                    placeholder="Model name"
                    disabled={isLoading}
                    className={cn(
                      "rounded-md border bg-muted/20 px-2.5 py-1 text-xs transition-colors flex-1 min-w-[200px]",
                      "border-violet-500/30 focus:border-violet-500/50 focus:outline-none",
                      isLoading && "opacity-50 cursor-not-allowed"
                    )}
                  />
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
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
        </div>
      </CardContent>
    </Card>
  );
}
