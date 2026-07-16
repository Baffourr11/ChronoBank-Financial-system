"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  description?: string;
  date: string;
}

interface RecentTransactionsProps {
  datasetId?: string;
  limit?: number;
}

export default function RecentTransactions({
  datasetId,
  limit = 8,
}: RecentTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!datasetId) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/transactions?limit=${limit}&datasetId=${datasetId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.data?.transactions ?? []);
        }
      } catch {
        /* ignore */
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [datasetId, limit]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent transactions</CardTitle>
        <CardDescription>Latest activity in this dataset</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingRows />
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No transactions yet. Import data to see activity.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between py-3 gap-3"
              >
                <TransactionRow tx={tx} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const isIncome = tx.type === "income";

  return (
    <>
      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
        {isIncome ? (
          <ArrowUpRight className="w-4 h-4 text-chart-2" />
        ) : (
          <ArrowDownLeft className="w-4 h-4 text-chart-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {tx.description || tx.category || tx.type}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(tx.date).toLocaleDateString()} · {tx.category}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p
          className={`text-sm font-semibold ${
            isIncome ? "text-chart-2" : "text-chart-4"
          }`}
        >
          {isIncome ? "+" : "-"}GHS {Number(tx.amount).toFixed(2)}
        </p>
        <Badge variant="outline" className="text-xs mt-1">
          {tx.type}
        </Badge>
      </div>
    </>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-12 bg-muted rounded animate-pulse" />
      ))}
    </div>
  );
}
