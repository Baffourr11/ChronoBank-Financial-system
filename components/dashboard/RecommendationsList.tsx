"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X } from "lucide-react";

export interface RecommendationItem {
  id: string;
  recommendation: string;
  priority: string;
  status: string;
}

interface RecommendationsListProps {
  items: RecommendationItem[];
  loading?: boolean;
  onDismiss?: (id: string) => void;
}

export default function RecommendationsList({
  items,
  loading,
  onDismiss,
}: RecommendationsListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">AI Recommendations</CardTitle>
        <Sparkles className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active recommendations. Run analytics to generate insights.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex gap-2 items-start border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{item.recommendation}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {item.priority}
                  </Badge>
                </div>
                {onDismiss && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={() => onDismiss(item.id)}
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
