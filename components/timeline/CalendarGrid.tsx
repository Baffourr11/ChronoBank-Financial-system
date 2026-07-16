'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useDataset } from '@/lib/contexts/DatasetContext';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  date: string;
  type: string;
  amount: number;
  description: string;
  category?: string;
}

interface DayEvents {
  [key: number]: Transaction[];
}

function formatDayTitle(year: number, month: number, day: number): string {
  const d = new Date(year, month, day);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function parseDateParam(value: string | null): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const probe = new Date(year, month, day);
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month ||
    probe.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function TransactionList({
  title,
  items,
  type,
  highlightId,
}: {
  title: string;
  items: Transaction[];
  type: 'income' | 'expense';
  highlightId?: string | null;
}) {
  const total = items.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
  const accent =
    type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className={cn('text-sm font-medium tabular-nums', accent)}>
          GHS {total.toFixed(2)}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {type} on this day</p>
      ) : (
        <ul className="space-y-2">
          {items.map((tx) => (
            <li
              key={tx.id}
              className={cn(
                'flex flex-col gap-0.5 rounded-lg border p-3 text-sm min-w-0',
                highlightId && tx.id === highlightId && 'ring-2 ring-primary border-primary',
              )}
            >
              <div className="flex justify-between gap-2 min-w-0">
                <span className="font-medium truncate">
                  {tx.description || 'No description'}
                </span>
                <span className={cn('shrink-0 tabular-nums font-medium', accent)}>
                  GHS {Math.abs(Number(tx.amount)).toFixed(2)}
                </span>
              </div>
              {tx.category && (
                <span className="text-xs text-muted-foreground truncate">
                  {tx.category}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CalendarGrid() {
  const { selectedDataset } = useDataset();
  const datasetId = selectedDataset?._id;
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const highlightParam = searchParams.get('highlight');

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<DayEvents>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [pendingOpenDate, setPendingOpenDate] = useState<string | null>(null);

  const openDayForDate = useCallback((year: number, month: number, day: number) => {
    setCurrentDate(new Date(year, month, 1));
    setSelectedDay(day);
    setSheetOpen(true);
  }, []);

  useEffect(() => {
    const parsed = parseDateParam(dateParam);
    if (!parsed) return;
    setHighlightId(highlightParam);
    openDayForDate(parsed.year, parsed.month, parsed.day);
    setPendingOpenDate(dateParam);
  }, [dateParam, highlightParam, openDayForDate]);

  useEffect(() => {
    if (!datasetId) {
      setEvents({});
      setIsLoading(false);
      return;
    }
    fetchTransactions();
  }, [currentDate, datasetId]);

  const fetchTransactions = async () => {
    if (!datasetId) return;
    setIsLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const response = await fetch(
        `/api/transactions?datasetId=${datasetId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=1000`
      );

      if (response.ok) {
        const data = await response.json();
        const dayMap: DayEvents = {};

        data.data.transactions.forEach((tx: Transaction) => {
          const day = new Date(tx.date).getDate();
          if (!dayMap[day]) {
            dayMap[day] = [];
          }
          dayMap[day].push(tx);
        });

        setEvents(dayMap);

        if (pendingOpenDate) {
          const parsed = parseDateParam(pendingOpenDate);
          if (
            parsed &&
            parsed.year === year &&
            parsed.month === month
          ) {
            setSelectedDay(parsed.day);
            setSheetOpen(true);
            setPendingOpenDate(null);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const days = [];

  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handlePrevMonth = () => {
    setSelectedDay(null);
    setSheetOpen(false);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
    setSheetOpen(false);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const openDay = (day: number) => {
    setSelectedDay(day);
    setSheetOpen(true);
  };

  const dayTransactions = selectedDay != null ? events[selectedDay] ?? [] : [];

  const { incomeItems, expenseItems, totalIncome, totalExpenses } = useMemo(() => {
    const income = dayTransactions.filter((t) => t.type === 'income');
    const expense = dayTransactions.filter((t) => t.type === 'expense');
    const ti = income.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
    const te = expense.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
    return {
      incomeItems: income,
      expenseItems: expense,
      totalIncome: ti,
      totalExpenses: te,
    };
  }, [dayTransactions]);

  const getTransactionColor = (type: string) => {
    if (type === 'income') return 'bg-chart-1';
    if (type === 'expense') return 'bg-chart-4';
    return 'bg-chart-2';
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Financial Timeline</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-lg font-semibold w-48 text-center">{monthName}</div>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              Loading calendar…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center font-semibold text-sm text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => (
                  <div
                    key={index}
                    role={day !== null ? 'button' : undefined}
                    tabIndex={day !== null ? 0 : undefined}
                    onClick={day !== null ? () => openDay(day) : undefined}
                    onKeyDown={
                      day !== null
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openDay(day);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      'aspect-square p-2 rounded-lg border min-h-[4.5rem] sm:min-h-0',
                      day === null
                        ? 'bg-muted/30 border-transparent'
                        : 'border-border hover:border-primary/50 cursor-pointer transition-colors',
                      day !== null &&
                        selectedDay === day &&
                        sheetOpen &&
                        'ring-2 ring-primary border-primary',
                    )}
                  >
                    {day !== null && (
                      <div className="h-full flex flex-col">
                        <div className="text-sm font-semibold text-foreground">{day}</div>
                        {events[day] && events[day].length > 0 && (
                          <div className="flex-1 flex flex-col gap-1 mt-1 min-h-0">
                            {events[day].slice(0, 2).map((tx, i) => (
                              <div
                                key={tx.id ?? i}
                                className={`text-xs px-1.5 py-0.5 rounded text-white truncate ${getTransactionColor(tx.type)}`}
                                title={`${tx.type}: GHS ${tx.amount.toFixed(2)}`}
                              >
                                GHS {tx.amount.toFixed(0)}
                              </div>
                            ))}
                            {events[day].length > 2 && (
                              <button
                                type="button"
                                className="text-xs text-primary hover:underline px-1.5 text-left"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDay(day);
                                }}
                              >
                                +{events[day].length - 2} more
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-chart-1" />
                  <span className="text-muted-foreground">Income</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-chart-4" />
                  <span className="text-muted-foreground">Expense</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-chart-2" />
                  <span className="text-muted-foreground">Transfer</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedDay != null
                ? formatDayTitle(year, month, selectedDay)
                : 'Day details'}
            </SheetTitle>
            <SheetDescription>
              Income and expenses for this day
            </SheetDescription>
          </SheetHeader>

          {selectedDay != null && (
            <div className="mt-6 space-y-6 px-1">
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg border p-2">
                  <p className="text-muted-foreground text-xs">Income</p>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    GHS {totalIncome.toFixed(0)}
                  </p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-muted-foreground text-xs">Expenses</p>
                  <p className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                    GHS {totalExpenses.toFixed(0)}
                  </p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-muted-foreground text-xs">Net</p>
                  <p className="font-semibold tabular-nums">
                    GHS {(totalIncome - totalExpenses).toFixed(0)}
                  </p>
                </div>
              </div>

              <TransactionList
                title="Income"
                items={incomeItems}
                type="income"
                highlightId={highlightId}
              />
              <TransactionList
                title="Expenses"
                items={expenseItems}
                type="expense"
                highlightId={highlightId}
              />

              {dayTransactions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No transactions on this day
                </p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
