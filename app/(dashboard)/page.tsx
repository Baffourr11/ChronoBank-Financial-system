'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BalanceTrend from '@/components/dashboard/BalanceTrend';
import SpendingOverview from '@/components/dashboard/SpendingOverview';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import SmartInsights from '@/components/dashboard/SmartInsights';
import PredictiveCharts from '@/components/analytics/PredictiveCharts';
import PatternHeatmap from '@/components/analytics/PatternHeatmap';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Shield,
  Upload,
  Play,
  Settings,
  Calendar,
  DollarSign,
  Activity,
  Zap
} from 'lucide-react';

interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  transactionCount: number;
  accountsCount: number;
  activeRules: number;
  dataQuality: {
    hasEnoughData: boolean;
    dataRange: { start: string; end: string; totalDays: number };
    recommendations: any;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patterns, setPatterns] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch basic statistics
        const [accountsResponse, transactionsResponse, rulesResponse, importStatsResponse] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/transactions?limit=100'),
          fetch('/api/rules'),
          fetch('/api/data/import')
        ]);

        if (accountsResponse.ok && transactionsResponse.ok && rulesResponse.ok && importStatsResponse.ok) {
          const accountsData = await accountsResponse.json();
          const transactionsData = await transactionsResponse.json();
          const rulesData = await rulesResponse.json();
          const importStats = await importStatsResponse.json();

          const accounts = accountsData.data || [];
          const transactions = transactionsData.data?.transactions || [];
          const rules = rulesData.data || [];

          // Calculate statistics
          const totalBalance = accounts.reduce((sum: number, acc: any) => sum + acc.balance, 0);
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();
          
          const monthlyTransactions = transactions.filter((tx: any) => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
          });

          const monthlyIncome = monthlyTransactions
            .filter((tx: any) => tx.type === 'income')
            .reduce((sum: number, tx: any) => sum + tx.amount, 0);
          
          const monthlyExpenses = monthlyTransactions
            .filter((tx: any) => tx.type === 'expense')
            .reduce((sum: number, tx: any) => sum + tx.amount, 0);

          setStats({
            totalBalance,
            monthlyIncome,
            monthlyExpenses,
            transactionCount: transactions.length,
            accountsCount: accounts.length,
            activeRules: rules.filter((rule: any) => rule.isActive).length,
            dataQuality: importStats.data.statistics
          });
        }

        // Fetch analytics data
        const [patternsResponse, forecastResponse] = await Promise.all([
          fetch('/api/analytics/patterns'),
          fetch('/api/analytics/forecast?days=90')
        ]);

        if (patternsResponse.ok) {
          const patternsData = await patternsResponse.json();
          setPatterns(patternsData.data);
        }

        if (forecastResponse.ok) {
          const forecastData = await forecastResponse.json();
          setForecast(forecastData.data);
        }

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleDataImport = () => {
    // Navigate to data import page or open import modal
    window.location.href = '/data/import';
  };

  const handleRunAnalysis = async () => {
    try {
      // Trigger pattern analysis
      const response = await fetch('/api/analytics/patterns');
      if (response.ok) {
        const data = await response.json();
        setPatterns(data.data);
      }
    } catch (error) {
      console.error('Failed to run analysis:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2 animate-pulse" />
                <div className="h-8 bg-muted rounded w-1/2 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-80 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-80 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Dashboard</h1>
          <p className="text-muted-foreground">
            AI-powered financial management for Ghana's informal sector
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDataImport}>
            <Upload className="w-4 h-4 mr-2" />
            Import Data
          </Button>
          <Button onClick={handleRunAnalysis}>
            <Brain className="w-4 h-4 mr-2" />
            Run Analysis
          </Button>
        </div>
      </div>

      {/* Data Quality Alert */}
      {stats && !stats.dataQuality.hasEnoughData && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Need more transaction data for accurate AI analysis. 
                Currently have {stats.transactionCount} transactions, 
                need at least {stats.dataQuality.recommendations.recommendedMinTransactions} transactions.
              </span>
              <Button size="sm" onClick={handleDataImport}>
                Import Historical Data
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-chart-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-2xl font-bold">GHS {stats.totalBalance.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-chart-2" />
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Income</p>
                  <p className="text-2xl font-bold">GHS {stats.monthlyIncome.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-chart-4" />
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Expenses</p>
                  <p className="text-2xl font-bold">GHS {stats.monthlyExpenses.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-chart-3" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Rules</p>
                  <p className="text-2xl font-bold">{stats.activeRules}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BalanceTrend />
            <SpendingOverview />
          </div>
          <RecentTransactions />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {forecast && (
            <>
              <PredictiveCharts 
                forecasts={forecast.spendingForecasts || []}
                cashFlowData={forecast.cashFlowForecast || []}
              />
              
              {forecast.cashFlowIssues?.hasIssues && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span>
                        {forecast.cashFlowIssues.issues.length} potential cash flow issues detected in the next 90 days.
                      </span>
                      <Button size="sm" variant="outline">
                        <Shield className="w-4 h-4 mr-2" />
                        Run Scenarios
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          {patterns && (
            <PatternHeatmap 
              patterns={patterns.patterns || []}
              anomalies={patterns.anomalies || []}
            />
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <SmartInsights />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common tasks to manage your finances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <Brain className="w-6 h-6 mb-2" />
              <span>Create Rule</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Calendar className="w-6 h-6 mb-2" />
              <span>View Forecast</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Shield className="w-6 h-6 mb-2" />
              <span>Test Scenarios</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Settings className="w-6 h-6 mb-2" />
              <span>Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
