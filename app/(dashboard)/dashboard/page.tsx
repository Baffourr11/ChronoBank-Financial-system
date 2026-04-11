'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AccountsList from '@/components/dashboard/AccountsList';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import SpendingOverview from '@/components/dashboard/SpendingOverview';
import BalanceTrend from '@/components/dashboard/BalanceTrend';
import { Plus } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [totalBalance, setTotalBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch('/api/accounts');
        if (response.ok) {
          const data = await response.json();
          const total = data.data.reduce((sum: number, acc: any) => sum + acc.balance, 0);
          setTotalBalance(total);
        }
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.username}</h1>
        <p className="text-muted-foreground mt-2">Here&apos;s your financial overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              ${isLoading ? '—' : totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Across all accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-chart-4">$0.00</div>
            <p className="text-xs text-muted-foreground mt-2">Total spent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-chart-1">$0.00</div>
            <p className="text-xs text-muted-foreground mt-2">Of monthly budget</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <BalanceTrend />
          <SpendingOverview />
        </div>
        <div>
          <AccountsList />
        </div>
      </div>

      {/* Recent Transactions */}
      <RecentTransactions />

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Transaction
        </Button>
        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          New Account
        </Button>
      </div>
    </div>
  );
}
