'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = [
  'hsl(var(--color-chart-1))',
  'hsl(var(--color-chart-2))',
  'hsl(var(--color-chart-3))',
  'hsl(var(--color-chart-4))',
  'hsl(var(--color-chart-5))',
];

export default function SpendingOverview() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/transactions?limit=1000');
        if (response.ok) {
          const result = await response.json();
          const transactions = result.data.transactions as any[];
          
          const categoryTotals: Record<string, number> = {};
          transactions.forEach((t) => {
            if (t.type === 'expense') {
              categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            }
          });

          const chartData = Object.entries(categoryTotals).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value: parseFloat((value as number).toFixed(2)),
          }));

          setData(chartData.length > 0 ? chartData : [{ name: 'No Data', value: 100 }]);
        }
      } catch (error) {
        console.error('Failed to fetch spending data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription>Your expenses breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-80 bg-muted rounded animate-pulse" />
        ) : data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No spending data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: $${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
