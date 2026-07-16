"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Shield,
  TrendingDown,
  CalendarClock,
  PiggyBank,
} from "lucide-react";

export interface AutomationEnhancements {
  warningLevel: 1 | 2 | 3 | null;
  warningTitle: string | null;
  warningMessage: string | null;
  virtualReserve: number | null;
  virtualReserveNote: string | null;
  incomeTimingNote: string | null;
  budgetSuggestionCount: number;
  insightCount: number;
}

interface AutomationStatusCardProps {
  data: AutomationEnhancements | null;
  loading?: boolean;
}

function warningBadge(level: 1 | 2 | 3 | null) {
  if (!level) return null;
  const map = {
    1: { label: "Level 1 · Notice", variant: "secondary" as const },
    2: { label: "Level 2 · Warning", variant: "outline" as const },
    3: { label: "Level 3 · Critical", variant: "destructive" as const },
  };
  const cfg = map[level];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export default function AutomationStatusCard({
  data,
  loading,
}: AutomationStatusCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Predictive automation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasContent =
    data.warningLevel ||
    data.virtualReserve != null ||
    data.incomeTimingNote ||
    data.budgetSuggestionCount > 0;

  if (!hasContent) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Predictive automation
          </CardTitle>
          <CardDescription>
            Run analysis to generate early warnings, reserve guidance, and budget insights.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-primary/15">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Predictive automation
          </CardTitle>
          {warningBadge(data.warningLevel)}
        </div>
        <CardDescription>
          Early warnings, virtual reserve, income timing, and budget intelligence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.warningMessage && (
          <Alert
            variant={data.warningLevel === 3 ? "destructive" : "default"}
            className={
              data.warningLevel === 2
                ? "border-amber-500/40 bg-amber-500/5"
                : undefined
            }
          >
            <TrendingDown className="h-4 w-4" />
            <AlertTitle className="text-sm">
              {data.warningTitle ?? "Financial warning"}
            </AlertTitle>
            <AlertDescription className="text-xs">
              {data.warningMessage}
            </AlertDescription>
          </Alert>
        )}

        {data.virtualReserve != null && data.virtualReserve > 0 && (
          <div className="flex gap-2 text-sm rounded-lg border p-3 bg-muted/30">
            <PiggyBank className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <div>
              <p className="font-medium">
                Precautionary reserve: GHS{" "}
                {data.virtualReserve.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </p>
              {data.virtualReserveNote && (
                <p className="text-xs text-muted-foreground mt-1">
                  {data.virtualReserveNote}
                </p>
              )}
            </div>
          </div>
        )}

        {data.incomeTimingNote && (
          <div className="flex gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-4 w-4 shrink-0" />
            <span>{data.incomeTimingNote}</span>
          </div>
        )}

        {(data.budgetSuggestionCount > 0 || data.insightCount > 0) && (
          <p className="text-xs text-muted-foreground">
            {data.budgetSuggestionCount > 0 &&
              `${data.budgetSuggestionCount} budget adjustment${data.budgetSuggestionCount === 1 ? "" : "s"}`}
            {data.budgetSuggestionCount > 0 && data.insightCount > 0 && " · "}
            {data.insightCount > 0 &&
              `${data.insightCount} auto-generated insight${data.insightCount === 1 ? "" : "s"}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
