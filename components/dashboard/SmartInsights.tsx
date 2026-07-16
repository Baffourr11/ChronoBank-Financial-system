"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Shield,
} from "lucide-react";

interface Insight {
  id: string;
  type: "pattern" | "anomaly" | "forecast";
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  href: string;
}

interface SmartInsightsProps {
  datasetId?: string;
}

function buildInsights(patternsData: any, forecastData: any): Insight[] {
  const items: Insight[] = [];

  patternsData?.patterns?.forEach((pattern: any, index: number) => {
    if (pattern.confidence > 0.75) {
      items.push({
        id: `pattern-${index}`,
        type: "pattern",
        title: `${pattern.category} spending pattern`,
        description: `Confidence ${(pattern.confidence * 100).toFixed(0)}%${
          pattern.seasonality?.hasSeasonalPattern
            ? ` · peak in ${pattern.seasonality.peakSeason}`
            : ""
        }`,
        severity:
          pattern.trend?.direction === "increasing" ? "medium" : "low",
        href: "/analytics/overview",
      });
    }
  });

  patternsData?.anomalies?.forEach((anomaly: any, index: number) => {
    if (anomaly.severity === "high" || anomaly.severity === "medium") {
      items.push({
        id: `anomaly-${index}`,
        type: "anomaly",
        title: "Unusual activity",
        description: anomaly.description,
        severity: anomaly.severity === "high" ? "high" : "medium",
        href: "/timeline",
      });
    }
  });

  if (forecastData?.cashFlowIssues?.hasIssues) {
    const count = forecastData.cashFlowIssues.issues.length;
    items.push({
      id: "cash-flow",
      type: "forecast",
      title: "Cash-flow risk ahead",
      description: `${count} projected shortage${count === 1 ? "" : "s"} in the next 90 days.`,
      severity: "high",
      href: "/analytics/overview",
    });
  }

  if (patternsData?.ghanaianPatterns?.paydaySpending) {
    items.push({
      id: "payday",
      type: "pattern",
      title: "Payday spending cycle",
      description:
        "Spending spikes around pay periods — consider a payday budget.",
      severity: "medium",
      href: "/budgets",
    });
  }

  const order = { high: 3, medium: 2, low: 1 };
  return items.sort((a, b) => order[b.severity] - order[a.severity]);
}

export default function SmartInsights({ datasetId }: SmartInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!datasetId) {
      setInsights([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const qs = `datasetId=${datasetId}`;
      const [patternsRes, forecastRes] = await Promise.all([
        fetch(`/api/analytics/patterns?${qs}`),
        fetch(`/api/analytics/forecast?days=90&${qs}`),
      ]);

      let patternsData = null;
      let forecastData = null;

      if (patternsRes.ok) {
        patternsData = (await patternsRes.json()).data;
      }
      if (forecastRes.ok) {
        forecastData = (await forecastRes.json()).data;
      }

      setInsights(buildInsights(patternsData, forecastData));
    } catch {
      setInsights([]);
    } finally {
      setIsLoading(false);
    }
  }, [datasetId]);

  useEffect(() => {
    load();
  }, [load]);

  const icon = (type: Insight["type"]) => {
    if (type === "anomaly") return <AlertTriangle className="w-4 h-4" />;
    if (type === "forecast") return <TrendingUp className="w-4 h-4" />;
    return <Brain className="w-4 h-4" />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Live insights
            </CardTitle>
            <CardDescription>
              From your dataset patterns and forecast
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/analytics/overview">
              Full analytics
              <ChevronRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted rounded-md animate-pulse" />
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No insights yet.</p>
            <p className="mt-1">
              Run analysis on the dashboard, then check back here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {insights.slice(0, 4).map((insight) => (
              <li key={insight.id}>
                <Link
                  href={insight.href}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <span className="mt-0.5 text-muted-foreground">
                    {icon(insight.type)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {insight.title}
                      </span>
                      <Badge
                        variant={
                          insight.severity === "high"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {insight.severity}
                      </Badge>
                    </span>
                    <span className="text-xs text-muted-foreground line-clamp-2 block mt-0.5">
                      {insight.description}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
