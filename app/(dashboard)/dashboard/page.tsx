// Path: app/(dashboard)/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BalanceTrend from "@/components/dashboard/BalanceTrend";
import { Brain, Target, Shield, Database, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<{
    patterns: any;
    forecast: any;
    scenarios: null;
    rules: any;
  }>({
    patterns: null,
    forecast: null,
    scenarios: null,
    rules: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        // Fetch core analytics data
        const [patternsRes, forecastRes, rulesRes] = await Promise.all([
          fetch("/api/analytics/patterns"),
          fetch("/api/analytics/forecast"),
          fetch("/api/rules"),
        ]);

        const data = {
          patterns: patternsRes.ok ? await patternsRes.json() : null,
          forecast: forecastRes.ok ? await forecastRes.json() : null,
          scenarios: null, // Will be loaded when user visits scenarios page
          rules: rulesRes.ok ? await rulesRes.json() : null,
        };

        setAnalyticsData(data);
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user?.username}
        </h1>
        <p className="text-muted-foreground mt-2">
          Here&apos;s your financial analytics overview
        </p>
      </div>

      {/* Core Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/analytics/overview">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <CardTitle className="text-sm font-medium">
                  Pattern Analysis
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {isLoading
                  ? "---"
                  : analyticsData.patterns?.data?.patterns?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Spending patterns detected
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/analytics/scenarios">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle className="text-sm font-medium">
                  Scenario Testing
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {isLoading ? "---" : "Active"}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Stress testing available
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/rules">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <CardTitle className="text-sm font-medium">
                  Automation Rules
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {isLoading ? "---" : analyticsData.rules?.data?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Active rules</p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/data/import">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <CardTitle className="text-sm font-medium">
                  Data Import
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">Ready</div>
              <p className="text-xs text-muted-foreground mt-2">
                Import transaction data
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Analytics Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Balance Trend Analysis
            </CardTitle>
            <CardDescription>
              AI-powered financial trend analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BalanceTrend />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              90-Day Forecast
            </CardTitle>
            <CardDescription>ML-based financial predictions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-40 bg-muted rounded animate-pulse" />
            ) : analyticsData.forecast?.data?.forecast ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    Predicted Cash Flow
                  </span>
                  <span className="text-lg font-bold text-primary">
                    $
                    {analyticsData.forecast.data.forecast.next_90_days?.predicted_cash_flow?.toFixed(
                      2,
                    ) || "0.00"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Confidence</span>
                  <span className="text-lg font-bold text-chart-1">
                    {analyticsData.forecast.data.forecast.next_90_days
                      ?.confidence
                      ? `${(analyticsData.forecast.data.forecast.next_90_days.confidence * 100).toFixed(0)}%`
                      : "---"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Based on historical spending patterns and seasonal trends
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Import transaction data to see predictions
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Access core ChronoBank features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/analytics/overview">
              <Button className="w-full gap-2">
                <Brain className="w-4 h-4" />
                View Analytics
              </Button>
            </Link>
            <Link href="/analytics/scenarios">
              <Button variant="outline" className="w-full gap-2">
                <Shield className="w-4 h-4" />
                Run Scenarios
              </Button>
            </Link>
            <Link href="/rules">
              <Button variant="outline" className="w-full gap-2">
                <Target className="w-4 h-4" />
                Manage Rules
              </Button>
            </Link>
            <Link href="/data/import">
              <Button variant="outline" className="w-full gap-2">
                <Database className="w-4 h-4" />
                Import Data
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
