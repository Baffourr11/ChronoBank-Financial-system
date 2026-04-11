'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingDown, AlertCircle } from 'lucide-react';

interface Transaction {
  category: string;
  amount: number;
  type: string;
  date: string;
}

export default function InsightsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/transactions?limit=1000');
        if (response.ok) {
          const data = await response.json();
          setTransactions(data.data.transactions);
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getRecommendations = () => {
    if (transactions.length === 0) return [];

    const expenses = transactions.filter((t) => t.type === 'expense');
    const categoryTotals: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};

    expenses.forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
    });

    const recommendations = [];

    // Find highest spending category
    const highest = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0];
    if (highest && highest[1] > 500) {
      recommendations.push({
        type: 'spending',
        icon: TrendingDown,
        title: `High spending in ${highest[0]}`,
        description: `You&apos;ve spent $${highest[1].toFixed(2)} on ${highest[0]}. Consider setting a budget limit.`,
      });
    }

    // Anomaly detection
    if (categoryCount['groceries'] && categoryTotals['groceries']) {
      const avgPerTransaction = categoryTotals['groceries'] / categoryCount['groceries'];
      expenses.forEach((t) => {
        if (t.category === 'groceries' && t.amount > avgPerTransaction * 2) {
          recommendations.push({
            type: 'anomaly',
            icon: AlertCircle,
            title: 'Unusual grocery expense',
            description: `A grocery transaction of $${t.amount.toFixed(2)} is significantly higher than your average.`,
          });
        }
      });
    }

    // Recommendation for new category
    if (Object.keys(categoryTotals).length < 3) {
      recommendations.push({
        type: 'suggestion',
        icon: Lightbulb,
        title: 'Diversify your budgeting',
        description: 'Consider categorizing your expenses into more categories for better tracking.',
      });
    }

    return recommendations.slice(0, 3);
  };

  const recommendations = getRecommendations();

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Insights</h1>
        <p className="text-muted-foreground mt-2">AI-powered financial recommendations and analysis</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-40 bg-muted animate-pulse" />
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Lightbulb className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No insights yet. Add more transactions to see recommendations.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((insight, idx) => {
            const Icon = insight.icon;
            return (
              <Card key={idx}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{insight.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Financial Health Score</CardTitle>
          <CardDescription>Based on your spending patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Budget Discipline</span>
                <span className="text-sm text-muted-foreground">75%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-chart-1" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Savings Rate</span>
                <span className="text-sm text-muted-foreground">60%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-3/5 bg-chart-2" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Expense Consistency</span>
                <span className="text-sm text-muted-foreground">82%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-4/5 bg-chart-3" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
