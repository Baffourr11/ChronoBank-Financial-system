'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';

interface ForecastData {
  date: string;
  predicted: number;
  minRange: number;
  maxRange: number;
  actual?: number;
}

interface CashFlowData {
  date: string;
  income: number;
  expenses: number;
  netCashFlow: number;
  balance: number;
  confidence: number;
}

interface PredictiveChartsProps {
  forecasts: ForecastData[];
  cashFlowData: CashFlowData[];
  isLoading?: boolean;
}

export default function PredictiveCharts({ forecasts, cashFlowData, isLoading }: PredictiveChartsProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending Forecast</CardTitle>
            <CardDescription>AI-powered predictions for your spending patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Projection</CardTitle>
            <CardDescription>90-day cash flow analysis with confidence intervals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate key metrics
  const totalPredicted = forecasts.reduce((sum, f) => sum + f.predicted, 0);
  const avgConfidence = cashFlowData.reduce((sum, f) => sum + f.confidence, 0) / cashFlowData.length;
  const negativeCashFlowDays = cashFlowData.filter(d => d.netCashFlow < 0).length;
  const lowestBalance = Math.min(...cashFlowData.map(d => d.balance));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-chart-1" />
              <div>
                <p className="text-sm text-muted-foreground">90-Day Forecast</p>
                <p className="text-lg font-semibold">
                  GHS {totalPredicted.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-chart-2" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-lg font-semibold">
                  {(avgConfidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {negativeCashFlowDays > 0 ? (
                <AlertTriangle className="w-4 h-4 text-chart-4" />
              ) : (
                <TrendingUp className="w-4 h-4 text-chart-1" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Negative Days</p>
                <p className="text-lg font-semibold">
                  {negativeCashFlowDays}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {lowestBalance < 0 ? (
                <TrendingDown className="w-4 h-4 text-chart-4" />
              ) : (
                <TrendingUp className="w-4 h-4 text-chart-1" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Lowest Balance</p>
                <p className="text-lg font-semibold">
                  GHS {lowestBalance.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spending Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Spending Forecast</CardTitle>
          <CardDescription>
            AI-powered predictions with confidence intervals (min-max range)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={forecasts}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--color-muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="hsl(var(--color-muted-foreground))"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `GHS ${value}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--color-card))',
                  border: '1px solid hsl(var(--color-border))',
                  borderRadius: '8px',
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'predicted') return [`GHS ${value.toFixed(2)}`, 'Predicted'];
                  if (name === 'minRange') return [`GHS ${value.toFixed(2)}`, 'Min Range'];
                  if (name === 'maxRange') return [`GHS ${value.toFixed(2)}`, 'Max Range'];
                  return [value, name];
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="maxRange"
                stackId="1"
                stroke="none"
                fill="hsl(var(--color-chart-1))"
                fillOpacity={0.1}
                name="Max Range"
              />
              <Area
                type="monotone"
                dataKey="minRange"
                stackId="2"
                stroke="none"
                fill="hsl(var(--color-chart-1))"
                fillOpacity={0.2}
                name="Min Range"
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="hsl(var(--color-chart-1))"
                strokeWidth={2}
                fill="none"
                name="Predicted"
              />
              {forecasts.some(f => f.actual) && (
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="hsl(var(--color-chart-2))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--color-chart-2))' }}
                  name="Actual"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cash Flow Projection */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Projection</CardTitle>
          <CardDescription>
            Daily income vs expenses with projected balance over 90 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--color-muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="hsl(var(--color-muted-foreground))"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `GHS ${value}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--color-card))',
                  border: '1px solid hsl(var(--color-border))',
                  borderRadius: '8px',
                }}
                formatter={(value: any, name: string) => {
                  const formatter = (val: number) => `GHS ${val.toFixed(2)}`;
                  switch (name) {
                    case 'income': return [formatter(value), 'Income'];
                    case 'expenses': return [formatter(value), 'Expenses'];
                    case 'netCashFlow': return [formatter(value), 'Net Cash Flow'];
                    case 'balance': return [formatter(value), 'Balance'];
                    case 'confidence': return [`${(value * 100).toFixed(0)}%`, 'Confidence'];
                    default: return [value, name];
                  }
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                stroke="hsl(var(--color-chart-1))"
                strokeWidth={2}
                dot={false}
                name="Income"
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="hsl(var(--color-chart-4))"
                strokeWidth={2}
                dot={false}
                name="Expenses"
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--color-chart-2))"
                strokeWidth={3}
                dot={false}
                name="Balance"
              />
              <Line
                type="monotone"
                dataKey="netCashFlow"
                stroke="hsl(var(--color-chart-3))"
                strokeWidth={1}
                dot={false}
                strokeDasharray="5 5"
                name="Net Cash Flow"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Confidence Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Prediction Confidence Analysis</CardTitle>
          <CardDescription>
            Understanding the reliability of our AI predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">High Confidence Period</h4>
                <p className="text-sm text-muted-foreground">
                  First 30 days have {(avgConfidence * 100).toFixed(0)}% average confidence
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-chart-1">Reliable</div>
                <div className="text-xs text-muted-foreground">Based on recent patterns</div>
              </div>
            </div>

            {negativeCashFlowDays > 0 && (
              <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                <div>
                  <h4 className="font-medium text-orange-800">Cash Flow Concern</h4>
                  <p className="text-sm text-orange-600">
                    {negativeCashFlowDays} days with negative cash flow projected
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-orange-800">Action Required</div>
                  <div className="text-xs text-orange-600">Review spending patterns</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Seasonal Patterns</h4>
                <p className="text-sm text-muted-foreground">
                  AI has detected seasonal spending patterns in your data
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-chart-2">Accounted For</div>
                <div className="text-xs text-muted-foreground">Improves accuracy</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
