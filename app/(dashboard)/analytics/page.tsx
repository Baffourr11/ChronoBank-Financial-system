'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = [
  'hsl(var(--color-chart-1))',
  'hsl(var(--color-chart-2))',
  'hsl(var(--color-chart-3))',
  'hsl(var(--color-chart-4))',
  'hsl(var(--color-chart-5))',
];

export default function AnalyticsPage() {
  const [incomeVsExpense, setIncomeVsExpense] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/transactions?limit=1000');
        if (response.ok) {
          const data = await response.json();
          const transactions = data.data.transactions as any[];

          // Income vs Expense by month
          const monthlyData: Record<string, { income: number; expense: number }> = {};
          transactions.forEach((tx) => {
            const date = new Date(tx.date);
            const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = { income: 0, expense: 0 };
            }

            if (tx.type === 'income') {
              monthlyData[monthKey].income += tx.amount;
            } else if (tx.type === 'expense') {
              monthlyData[monthKey].expense += tx.amount;
            }
          });

          const incomeExpenseChart = Object.entries(monthlyData)
            .slice(-6)
            .map(([month, data]) => ({
              month,
              Income: parseFloat(data.income.toFixed(2)),
              Expense: parseFloat(data.expense.toFixed(2)),
            }));

          setIncomeVsExpense(incomeExpenseChart);

          // Category breakdown
          const categoryTotals: Record<string, number> = {};
          transactions.forEach((tx) => {
            if (tx.type === 'expense') {
              categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
            }
          });

          const categoryChart = Object.entries(categoryTotals).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value: parseFloat((value as number).toFixed(2)),
          }));

          setCategoryBreakdown(categoryChart.length > 0 ? categoryChart : [{ name: 'No Data', value: 100 }]);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-2">Spending trends and financial insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expense</CardTitle>
            <CardDescription>Monthly comparison over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 bg-muted rounded animate-pulse" />
            ) : incomeVsExpense.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incomeVsExpense}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--color-muted-foreground))" />
                  <YAxis stroke="hsl(var(--color-muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--color-card))',
                      border: '1px solid hsl(var(--color-border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any) => `$${value.toFixed(2)}`}
                  />
                  <Legend />
                  <Bar dataKey="Income" fill="hsl(var(--color-chart-1))" />
                  <Bar dataKey="Expense" fill="hsl(var(--color-chart-4))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Distribution of your expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 bg-muted rounded animate-pulse" />
            ) : categoryBreakdown.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
