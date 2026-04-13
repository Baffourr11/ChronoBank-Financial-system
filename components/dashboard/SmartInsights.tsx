'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Target, 
  Shield,
  Zap,
  ChevronRight
} from 'lucide-react';

interface Insight {
  id: string;
  type: 'pattern' | 'anomaly' | 'forecast' | 'recommendation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  actionable: boolean;
  action?: {
    type: string;
    label: string;
    url?: string;
  };
}

interface SmartInsightsProps {
  userId?: string;
}

export default function SmartInsights({ userId }: SmartInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [patterns, setPatterns] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        // Fetch patterns and forecast data
        const [patternsResponse, forecastResponse] = await Promise.all([
          fetch('/api/analytics/patterns'),
          fetch('/api/analytics/forecast?days=90')
        ]);

        if (patternsResponse.ok) {
          const patternsData = await patternsResponse.json();
          setPatterns(patternsData.data);
          generateInsights(patternsData.data, null);
        }

        if (forecastResponse.ok) {
          const forecastData = await forecastResponse.json();
          setForecast(forecastData.data);
          generateInsights(patterns, forecastData.data);
        }
      } catch (error) {
        console.error('Failed to fetch insights:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, [userId]);

  const generateInsights = (patternsData: any, forecastData: any) => {
    const newInsights: Insight[] = [];

    // Pattern-based insights
    if (patternsData) {
      // High confidence patterns
      patternsData.patterns?.forEach((pattern: any, index: number) => {
        if (pattern.confidence > 0.8) {
          newInsights.push({
            id: `pattern-${index}`,
            type: 'pattern',
            title: `Strong ${pattern.category} Pattern Detected`,
            description: `Your ${pattern.category} spending follows a predictable pattern with ${(pattern.confidence * 100).toFixed(0)}% confidence. ${pattern.seasonality.hasSeasonalPattern ? `Peak spending in ${pattern.seasonality.peakSeason}.` : ''}`,
            severity: pattern.trend.direction === 'increasing' ? 'medium' : 'low',
            confidence: pattern.confidence,
            actionable: true,
            action: {
              type: 'view_patterns',
              label: 'View Details',
              url: '/analytics/patterns'
            }
          });
        }
      });

      // Anomaly insights
      patternsData.anomalies?.forEach((anomaly: any, index: number) => {
        if (anomaly.severity === 'high') {
          newInsights.push({
            id: `anomaly-${index}`,
            type: 'anomaly',
            title: `Unusual ${anomaly.type} Detected`,
            description: anomaly.description,
            severity: 'high',
            confidence: anomaly.confidence,
            actionable: true,
            action: {
              type: 'review_transaction',
              label: 'Review Transaction',
              url: '/transactions'
            }
          });
        }
      });

      // Ghanaian-specific insights
      if (patternsData.ghanaianPatterns?.paydaySpending) {
        newInsights.push({
          id: 'payday-pattern',
          type: 'pattern',
          title: 'Payday Spending Pattern',
          description: 'We detect increased spending around payday periods. Consider budgeting for this cycle.',
          severity: 'medium',
          confidence: 0.75,
          actionable: true,
          action: {
            type: 'create_budget',
            label: 'Create Budget',
            url: '/budgets'
          }
        });
      }
    }

    // Forecast-based insights
    if (forecastData) {
      // Cash flow issues
      if (forecastData.cashFlowIssues?.hasIssues) {
        newInsights.push({
          id: 'cash-flow-warning',
          type: 'forecast',
          title: 'Cash Flow Concerns Detected',
          description: `${forecastData.cashFlowIssues.issues.length} potential cash flow issues identified in the next 90 days.`,
          severity: 'high',
          confidence: 0.8,
          actionable: true,
          action: {
            type: 'run_scenario',
            label: 'Run Scenarios',
            url: '/analytics/scenarios'
          }
        });
      }

      // Positive forecast
      const finalBalance = forecastData.cashFlowForecast[forecastData.cashFlowForecast.length - 1]?.balance || 0;
      const currentBalance = forecastData.cashFlowForecast[0]?.balance || 0;
      
      if (finalBalance > currentBalance * 1.1) {
        newInsights.push({
          id: 'positive-growth',
          type: 'forecast',
          title: 'Positive Growth Forecast',
          description: `Your balance is projected to grow by ${((finalBalance - currentBalance) / currentBalance * 100).toFixed(0)}% over the next 90 days.`,
          severity: 'low',
          confidence: forecastData.cashFlowForecast.reduce((sum: number, item: any) => sum + item.confidence, 0) / forecastData.cashFlowForecast.length,
          actionable: true,
          action: {
            type: 'investment_opportunities',
            label: 'Explore Options',
            url: '/analytics/investments'
          }
        });
      }
    }

    // Recommendation insights
    newInsights.push({
      id: 'automation-tip',
      type: 'recommendation',
      title: 'Automate Your Finances',
      description: 'Set up rules to automatically handle recurring transactions and savings goals.',
      severity: 'low',
      confidence: 0.9,
      actionable: true,
      action: {
        type: 'create_rule',
        label: 'Create Rule',
        url: '/rules'
      }
    });

    // Sort by severity and confidence
    newInsights.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });

    setInsights(newInsights);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern': return <Brain className="w-4 h-4" />;
      case 'anomaly': return <AlertTriangle className="w-4 h-4" />;
      case 'forecast': return <TrendingUp className="w-4 h-4" />;
      case 'recommendation': return <Lightbulb className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-200 bg-red-50 text-red-800';
      case 'medium': return 'border-orange-200 bg-orange-50 text-orange-800';
      case 'low': return 'border-blue-200 bg-blue-50 text-blue-800';
      default: return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Insights
          </CardTitle>
          <CardDescription>Personalized financial intelligence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="h-4 bg-muted rounded w-3/4 mb-2 animate-pulse" />
                <div className="h-3 bg-muted rounded w-full mb-2 animate-pulse" />
                <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          AI Insights
          <Badge variant="secondary" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            {insights.length} Active
          </Badge>
        </CardTitle>
        <CardDescription>
          Personalized financial intelligence based on your patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No insights available yet</p>
            <p className="text-sm">Continue using the app to enable AI analysis</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.slice(0, 5).map((insight) => (
              <div 
                key={insight.id} 
                className={`p-4 border rounded-lg ${getSeverityColor(insight.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      <Badge variant={getSeverityBadgeColor(insight.severity)} className="text-xs">
                        {insight.severity}
                      </Badge>
                    </div>
                    <p className="text-sm opacity-90 mb-2">{insight.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs opacity-75">
                        {(insight.confidence * 100).toFixed(0)}% confidence
                      </span>
                      {insight.actionable && insight.action && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs h-6"
                          onClick={() => {
                            // Navigate to action URL
                            window.location.href = insight.action?.url || '#';
                          }}
                        >
                          {insight.action.label}
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {insights.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm">
                  View All Insights ({insights.length - 5} more)
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4" />
            <span className="text-sm font-medium">Quick Actions</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button variant="outline" size="sm" className="text-xs">
              <Brain className="w-3 h-3 mr-1" />
              Run Analysis
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              View Forecast
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Test Scenarios
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Lightbulb className="w-3 h-3 mr-1" />
              Get Tips
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
