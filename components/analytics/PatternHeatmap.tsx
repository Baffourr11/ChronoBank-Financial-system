'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SpendingPattern, Anomaly } from '@/lib/analytics/PatternDetector';
import { Calendar, TrendingUp, AlertTriangle, Activity } from 'lucide-react';

interface PatternHeatmapProps {
  patterns: SpendingPattern[];
  anomalies: Anomaly[];
  isLoading?: boolean;
}

interface MonthData {
  month: string;
  spending: number;
  intensity: number;
}

export default function PatternHeatmap({ patterns, anomalies, isLoading }: PatternHeatmapProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Pattern Analysis</CardTitle>
          <CardDescription>AI-detected patterns and anomalies in your spending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // Generate monthly heatmap data
  const monthlyData: MonthData[] = [
    { month: 'Jan', spending: 0, intensity: 0 },
    { month: 'Feb', spending: 0, intensity: 0 },
    { month: 'Mar', spending: 0, intensity: 0 },
    { month: 'Apr', spending: 0, intensity: 0 },
    { month: 'May', spending: 0, intensity: 0 },
    { month: 'Jun', spending: 0, intensity: 0 },
    { month: 'Jul', spending: 0, intensity: 0 },
    { month: 'Aug', spending: 0, intensity: 0 },
    { month: 'Sep', spending: 0, intensity: 0 },
    { month: 'Oct', spending: 0, intensity: 0 },
    { month: 'Nov', spending: 0, intensity: 0 },
    { month: 'Dec', spending: 0, intensity: 0 },
  ];

  // Aggregate pattern data by month
  patterns.forEach(pattern => {
    pattern.seasonality.monthly.forEach((spending, index) => {
      monthlyData[index].spending += spending;
      monthlyData[index].intensity += spending * pattern.confidence;
    });
  });

  // Normalize intensity for heatmap
  const maxIntensity = Math.max(...monthlyData.map(d => d.intensity));
  monthlyData.forEach(data => {
    data.intensity = maxIntensity > 0 ? (data.intensity / maxIntensity) * 100 : 0;
  });

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get heatmap cell color
  const getHeatmapColor = (intensity: number) => {
    if (intensity >= 80) return 'bg-red-100 border-red-300';
    if (intensity >= 60) return 'bg-orange-100 border-orange-300';
    if (intensity >= 40) return 'bg-yellow-100 border-yellow-300';
    if (intensity >= 20) return 'bg-blue-100 border-blue-300';
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* Pattern Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-chart-1" />
              <div>
                <p className="text-sm text-muted-foreground">Detected Patterns</p>
                <p className="text-lg font-semibold">{patterns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-chart-4" />
              <div>
                <p className="text-sm text-muted-foreground">Anomalies Found</p>
                <p className="text-lg font-semibold">{anomalies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-chart-2" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-lg font-semibold">
                  {patterns.length > 0 
                    ? `${(patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length * 100).toFixed(0)}%`
                    : '0%'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Spending Heatmap</CardTitle>
          <CardDescription>
            Monthly spending intensity based on detected patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-2 mb-4">
            {monthlyData.map((data, index) => (
              <div key={data.month} className="text-center">
                <div 
                  className={`h-16 rounded border-2 flex items-center justify-center text-xs font-medium transition-colors ${getHeatmapColor(data.intensity)}`}
                  title={`${data.month}: GHS ${data.spending.toFixed(0)}`}
                >
                  {data.spending > 0 ? 'GHS' : ''}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{data.month}</div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded"></div>
              <span>Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
              <span>Very High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
              <span>Peak</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Detected Spending Patterns</CardTitle>
          <CardDescription>
            AI-identified patterns in your financial behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patterns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No spending patterns detected yet</p>
                <p className="text-sm">Continue tracking transactions to enable pattern detection</p>
              </div>
            ) : (
              patterns.map((pattern, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{pattern.category}</h4>
                      <p className="text-sm text-muted-foreground">
                        Avg: GHS {pattern.averageAmount.toFixed(2)} | 
                        Frequency: {pattern.frequency.toFixed(1)}/month
                      </p>
                    </div>
                    <Badge variant={pattern.confidence >= 0.8 ? 'default' : 'secondary'}>
                      {(pattern.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Trend: </span>
                      <span className={pattern.trend.direction === 'increasing' ? 'text-red-600' : 
                                    pattern.trend.direction === 'decreasing' ? 'text-green-600' : 'text-gray-600'}>
                        {pattern.trend.direction === 'increasing' ? 'Rising' : 
                         pattern.trend.direction === 'decreasing' ? 'Falling' : 'Stable'}
                      </span>
                    </div>
                    
                    {pattern.seasonality.hasSeasonalPattern && (
                      <div>
                        <span className="font-medium">Seasonal: </span>
                        <span>
                          Peak: {pattern.seasonality.peakSeason} | 
                          Low: {pattern.seasonality.lowSeason}
                        </span>
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium">Volatility: </span>
                      <span className={pattern.trend.volatility > 0.3 ? 'text-orange-600' : 'text-green-600'}>
                        {pattern.trend.volatility > 0.3 ? 'High' : 'Normal'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Anomalies</CardTitle>
            <CardDescription>
              Unusual transactions that deviate from your normal patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {anomalies.map((anomaly, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(anomaly.severity)}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{anomaly.description}</h4>
                      <Badge variant={anomaly.severity === 'high' ? 'destructive' : 'secondary'}>
                        {anomaly.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Expected: GHS {anomaly.expectedValue.toFixed(2)} | 
                      Actual: GHS {anomaly.actualValue.toFixed(2)} | 
                      Confidence: {(anomaly.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
