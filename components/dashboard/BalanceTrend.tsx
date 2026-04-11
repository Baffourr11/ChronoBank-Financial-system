'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Jan', balance: 5000 },
  { month: 'Feb', balance: 5500 },
  { month: 'Mar', balance: 5200 },
  { month: 'Apr', balance: 6000 },
  { month: 'May', balance: 6500 },
  { month: 'Jun', balance: 7000 },
];

export default function BalanceTrend() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Trend</CardTitle>
        <CardDescription>Your net worth over the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
            <XAxis dataKey="month" stroke="hsl(var(--color-muted-foreground))" />
            <YAxis stroke="hsl(var(--color-muted-foreground))" />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--color-card))',
                border: '1px solid hsl(var(--color-border))',
                borderRadius: '8px',
              }}
              formatter={(value: any) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="hsl(var(--color-chart-1))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--color-chart-1))', r: 4 }}
              name="Total Balance"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
