'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface Budget {
  id: string;
  category: string;
  limitAmount: number;
  period: string;
  alertThreshold: number;
  spent?: number;
}

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const response = await fetch('/api/budgets');
        if (response.ok) {
          const data = await response.json();
          setBudgets(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch budgets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBudgets();
  }, []);

  const getProgressPercentage = (spent: number, limit: number) => {
    return Math.min((spent / limit) * 100, 100);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budget</h1>
          <p className="text-muted-foreground mt-2">Set and track your spending budgets</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Budget
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-32 bg-muted animate-pulse" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">No budgets yet</p>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => {
            const spent = budget.spent || 0;
            const percentage = getProgressPercentage(spent, budget.limitAmount);
            const isOverThreshold = percentage >= budget.alertThreshold;

            return (
              <Card key={budget.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="capitalize">{budget.category}</CardTitle>
                  <CardDescription>{budget.period}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        ${spent.toFixed(2)} of ${budget.limitAmount.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isOverThreshold ? 'bg-chart-4' : 'bg-chart-1'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  {isOverThreshold && (
                    <div className="text-xs text-chart-4 font-medium">
                      Alert: {percentage.toFixed(0)}% of budget spent
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
