"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Bell, Target } from "lucide-react";

interface AutomationPanelProps {
  activeRules: number;
  unreadAlerts: number;
  recentExecutions: number;
  warningLevel?: 1 | 2 | 3 | null;
  virtualReserve?: number | null;
  loading?: boolean;
}

function warningLabel(level: 1 | 2 | 3): string {
  if (level === 3) return "Critical";
  if (level === 2) return "Warning";
  return "Notice";
}

export default function AutomationPanel({
  activeRules,
  unreadAlerts,
  recentExecutions,
  warningLevel,
  virtualReserve,
  loading,
}: AutomationPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Automation</CardTitle>
        <Zap className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" /> Active rules
              </span>
              <Badge variant="secondary">{activeRules}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4" /> Unread alerts
              </span>
              <Badge variant={unreadAlerts > 0 ? "destructive" : "secondary"}>
                {unreadAlerts}
              </Badge>
            </div>
            {warningLevel != null && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Risk escalation</span>
                <Badge
                  variant={
                    warningLevel === 3
                      ? "destructive"
                      : warningLevel === 2
                        ? "outline"
                        : "secondary"
                  }
                >
                  L{warningLevel} · {warningLabel(warningLevel)}
                </Badge>
              </div>
            )}
            {virtualReserve != null && virtualReserve > 0 && (
              <p className="text-xs text-muted-foreground">
                Virtual reserve: GHS {virtualReserve.toLocaleString()}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {recentExecutions} rule runs in the last 7 days
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/rules">Manage rules</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
