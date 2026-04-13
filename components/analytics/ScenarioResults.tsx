'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SimulationResult, Scenario } from '@/lib/simulator/ScenarioEngine';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { AlertTriangle, TrendingDown, TrendingUp, Shield, Lightbulb, Play } from 'lucide-react';

interface ScenarioResultsProps {
  result: SimulationResult;
  onRunNewScenario?: () => void;
  isLoading?: boolean;
}

export default function ScenarioResults({ result, onRunNewScenario, isLoading }: ScenarioResultsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scenario Simulation</CardTitle>
          <CardDescription>Running stress test on your financial resilience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // Prepare comparison data for charts
  const comparisonData = result.baseline.dailyProjections.map((baseline, index) => {
    const stressed = result.stressed.dailyProjections[index];
    return {
      date: baseline.date,
      baselineBalance: baseline.balance,
      stressedBalance: stressed.balance,
      baselineCashFlow: baseline.netCashFlow,
      stressedCashFlow: stressed.netCashFlow,
    };
  });

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Get risk level icon
  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <TrendingDown className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'low': return <Shield className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Scenario Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                {result.scenario.name}
              </CardTitle>
              <CardDescription>{result.scenario.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getRiskLevelColor(result.riskLevel)}>
                {getRiskLevelIcon(result.riskLevel)}
                <span className="ml-1">{result.riskLevel.toUpperCase()} RISK</span>
              </Badge>
              {onRunNewScenario && (
                <Button variant="outline" size="sm" onClick={onRunNewScenario}>
                  Run New Scenario
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Final Balance Impact</p>
              <p className={`text-lg font-semibold ${
                result.impact.balanceImpact < 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {result.impact.balanceImpact < 0 ? '-' : '+'}
                {formatCurrency(Math.abs(result.impact.balanceImpact))}
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Lowest Balance</p>
              <p className={`text-lg font-semibold ${
                result.stressed.lowestBalance < 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatCurrency(result.stressed.lowestBalance)}
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Negative Days</p>
              <p className={`text-lg font-semibold ${
                result.stressed.negativeDays > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {result.stressed.negativeDays}
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Liquidity Risk</p>
              <p className={`text-lg font-semibold ${
                result.impact.liquidityRisk > 0.5 ? 'text-red-600' : 
                result.impact.liquidityRisk > 0.3 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {(result.impact.liquidityRisk * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Projection Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Balance Projection Comparison</CardTitle>
          <CardDescription>
            How the scenario affects your account balance over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={comparisonData}>
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
                  if (name === 'baselineBalance') return [formatCurrency(value), 'Baseline'];
                  if (name === 'stressedBalance') return [formatCurrency(value), 'With Scenario'];
                  return [value, name];
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="baselineBalance"
                stroke="hsl(var(--color-chart-1))"
                strokeWidth={2}
                dot={false}
                name="Baseline"
              />
              <Line
                type="monotone"
                dataKey="stressedBalance"
                stroke="hsl(var(--color-chart-4))"
                strokeWidth={2}
                dot={false}
                name="With Scenario"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Cash Flow Impact</CardTitle>
          <CardDescription>
            Comparison of daily cash flow patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={comparisonData}>
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
                  if (name === 'baselineCashFlow') return [formatCurrency(value), 'Baseline'];
                  if (name === 'stressedCashFlow') return [formatCurrency(value), 'With Scenario'];
                  return [value, name];
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="baselineCashFlow"
                stroke="hsl(var(--color-chart-1))"
                fill="hsl(var(--color-chart-1))"
                fillOpacity={0.3}
                name="Baseline"
              />
              <Area
                type="monotone"
                dataKey="stressedCashFlow"
                stroke="hsl(var(--color-chart-4))"
                fill="hsl(var(--color-chart-4))"
                fillOpacity={0.3}
                name="With Scenario"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Impact Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Impact Analysis</CardTitle>
          <CardDescription>
            Detailed breakdown of how this scenario affects your finances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Financial Impact</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Balance Change</span>
                  <span className={`font-medium ${
                    result.impact.balanceImpact < 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {result.impact.balanceImpact < 0 ? '-' : '+'}
                    {formatCurrency(Math.abs(result.impact.balanceImpact))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Income Change</span>
                  <span className={`font-medium ${
                    result.impact.incomeImpact < 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {result.impact.incomeImpact < 0 ? '-' : '+'}
                    {formatCurrency(Math.abs(result.impact.incomeImpact))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Expense Change</span>
                  <span className={`font-medium ${
                    result.impact.expenseImpact < 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {result.impact.expenseImpact < 0 ? '-' : '+'}
                    {formatCurrency(Math.abs(result.impact.expenseImpact))}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Risk Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Liquidity Risk</span>
                  <span className={`font-medium ${
                    result.impact.liquidityRisk > 0.5 ? 'text-red-600' : 
                    result.impact.liquidityRisk > 0.3 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {(result.impact.liquidityRisk * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Solvency Risk</span>
                  <span className={`font-medium ${
                    result.impact.solvencyRisk > 0.3 ? 'text-red-600' : 
                    result.impact.solvencyRisk > 0.1 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {(result.impact.solvencyRisk * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cash Flow Volatility</span>
                  <span className="font-medium">
                    {formatCurrency(result.impact.cashFlowVolatility)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              AI Recommendations
            </CardTitle>
            <CardDescription>
              Personalized strategies to improve your financial resilience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.recommendations.map((recommendation, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium">{recommendation.description}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Potential impact: {formatCurrency(recommendation.potentialImpact)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={
                        recommendation.priority === 'high' ? 'destructive' :
                        recommendation.priority === 'medium' ? 'default' : 'secondary'
                      }>
                        {recommendation.priority}
                      </Badge>
                      <Badge variant="outline">
                        {recommendation.feasibility}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenario Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Scenario Parameters</CardTitle>
          <CardDescription>
            The specific conditions applied in this simulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(result.scenario.parameters).map(([key, value]) => {
              if (value === undefined || value === null) return null;
              
              let displayValue = '';
              let label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              
              if (typeof value === 'number') {
                if (key.includes('Change') || key.includes('Rate')) {
                  displayValue = `${value > 0 ? '+' : ''}${value}%`;
                } else {
                  displayValue = formatCurrency(value);
                }
              } else if (typeof value === 'object') {
                displayValue = `${formatCurrency(value.amount)} ${value.frequency}`;
              } else {
                displayValue = String(value);
              }
              
              return (
                <div key={key} className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="font-medium">{displayValue}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
