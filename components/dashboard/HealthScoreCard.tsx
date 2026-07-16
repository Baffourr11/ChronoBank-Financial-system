"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield } from "lucide-react";

interface HealthScoreCardProps {
  score: number;
  label: string;
  loading?: boolean;
}

export default function HealthScoreCard({
  score,
  label,
  loading,
}: HealthScoreCardProps) {
  const color =
    score >= 80
      ? "text-emerald-600"
      : score >= 65
        ? "text-blue-600"
        : score >= 45
          ? "text-amber-600"
          : "text-red-600";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Financial Health</CardTitle>
        <Shield className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Calculating…</p>
        ) : (
          <>
            <div className={`text-3xl font-bold ${color}`}>{score}</div>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
            <Progress value={score} className="mt-3 h-2" />
          </>
        )}
      </CardContent>
    </Card>
  );
}
