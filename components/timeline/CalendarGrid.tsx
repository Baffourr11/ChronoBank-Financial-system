'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Transaction {
  id: string;
  date: string;
  type: string;
  amount: number;
  description: string;
}

interface DayEvents {
  [key: number]: Transaction[];
}

export default function CalendarGrid() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<DayEvents>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [currentDate]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const response = await fetch(
        `/api/transactions?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=1000`
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
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getTransactionColor = (type: string) => {
    if (type === 'income') return 'bg-chart-1';
    if (type === 'expense') return 'bg-chart-4';
    return 'bg-chart-2';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Financial Timeline</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-lg font-semibold w-48 text-center">{monthName}</div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => (
            <div
              key={index}
              className={`aspect-square p-2 rounded-lg border ${
                day === null
                  ? 'bg-muted/30 border-transparent'
                  : 'border-border hover:border-primary cursor-pointer'
              }`}
            >
              {day !== null && (
                <div className="h-full flex flex-col">
                  <div className="text-sm font-semibold text-foreground">{day}</div>
                  {events[day] && events[day].length > 0 && (
                    <div className="flex-1 flex flex-col gap-1 mt-1 min-h-0">
                      {events[day].slice(0, 2).map((tx, i) => (
                        <div
                          key={i}
                          className={`text-xs px-1.5 py-0.5 rounded text-white truncate ${getTransactionColor(tx.type)}`}
                          title={`${tx.type}: $${tx.amount.toFixed(2)}`}
                        >
                          ${tx.amount.toFixed(0)}
                        </div>
                      ))}
                      {events[day].length > 2 && (
                        <div className="text-xs text-muted-foreground px-1.5">
                          +{events[day].length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 flex gap-6 text-sm">
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
      </CardContent>
    </Card>
  );
}
