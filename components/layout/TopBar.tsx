"use client";



import { useState, useEffect, useCallback } from "react";

import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

import { Button } from "@/components/ui/button";

import {

  DropdownMenu,

  DropdownMenuContent,

  DropdownMenuItem,

  DropdownMenuSeparator,

  DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu";

import { Bell, Database, LogOut, User } from "lucide-react";

import { useDataset } from "@/lib/contexts/DatasetContext";

import { Badge } from "@/components/ui/badge";

import { ThemeToggle } from "@/components/theme-toggle";

import { buildTimelineHref } from "@/lib/alerts/navigation";



interface AlertItem {

  id: string;

  title: string;

  message: string;

  severity: string;

  isRead: boolean;

  createdAt: string;

  type?: string;

  data?: Record<string, unknown>;

}



export default function TopBar() {

  const { selectedDataset } = useDataset();

  const { user, logout } = useAuth();

  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const [alertsOpen, setAlertsOpen] = useState(false);



  const fetchAlerts = useCallback(async () => {

    if (!selectedDataset?._id) {

      setAlerts([]);

      return;

    }

    try {

      const res = await fetch(

        `/api/alerts?unreadOnly=true&limit=10&datasetId=${selectedDataset._id}`,

      );

      if (res.ok) {

        const data = await res.json();

        setAlerts(data.data?.alerts ?? []);

      }

    } catch {

      /* ignore */

    }

  }, [selectedDataset?._id]);



  useEffect(() => {

    fetchAlerts();

    const interval = setInterval(fetchAlerts, 60000);

    return () => clearInterval(interval);

  }, [fetchAlerts]);



  const unreadCount = alerts.filter((a) => !a.isRead).length;



  const markRead = async (id: string) => {

    await fetch("/api/alerts", {

      method: "PATCH",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ alertId: id, isRead: true }),

    });

    setAlerts((prev) => prev.filter((a) => a.id !== id));

  };



  const handleAlertClick = async (alert: AlertItem) => {

    await markRead(alert.id);

    setAlertsOpen(false);



    const href = buildTimelineHref({

      type: alert.type,

      data: alert.data,

    });

    if (href) {

      router.push(href);

    }

  };



  const handleLogout = async () => {

    setIsLoading(true);

    try {

      await logout();

      router.push("/login");

    } finally {

      setIsLoading(false);

    }

  };



  return (

    <header className="h-14 md:h-16 bg-background border-b border-border flex items-center justify-between px-4 md:px-6">

      <div className="flex items-center gap-2 min-w-0">

        {selectedDataset ? (

          <Badge variant="secondary" className="gap-1 max-w-[200px] truncate">

            <Database className="w-3 h-3 shrink-0" />

            <span className="truncate">{selectedDataset.name}</span>

          </Badge>

        ) : (

          <span className="text-sm text-muted-foreground hidden sm:inline">

            No dataset selected

          </span>

        )}

      </div>



      <div className="flex items-center gap-2 sm:gap-3">

        <ThemeToggle />

        <DropdownMenu open={alertsOpen} onOpenChange={setAlertsOpen}>

          <DropdownMenuTrigger asChild>

            <Button variant="ghost" size="icon" className="relative">

              <Bell className="w-5 h-5" />

              {unreadCount > 0 && (

                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">

                  {unreadCount > 9 ? "9+" : unreadCount}

                </span>

              )}

            </Button>

          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">

            {alerts.length === 0 ? (

              <DropdownMenuItem disabled>No unread alerts</DropdownMenuItem>

            ) : (

              alerts.map((alert) => {

                const timelineHref = buildTimelineHref({

                  type: alert.type,

                  data: alert.data,

                });

                return (

                  <DropdownMenuItem

                    key={alert.id}

                    className="flex flex-col items-start gap-1 cursor-pointer"

                    onClick={() => handleAlertClick(alert)}

                  >

                    <span className="font-medium text-sm">{alert.title}</span>

                    <span className="text-xs text-muted-foreground line-clamp-2">

                      {alert.message}

                    </span>

                    {timelineHref && (

                      <span className="text-xs text-primary">

                        View on timeline →

                      </span>

                    )}

                  </DropdownMenuItem>

                );

              })

            )}

          </DropdownMenuContent>

        </DropdownMenu>



        <DropdownMenu>

          <DropdownMenuTrigger asChild>

            <Button variant="ghost" className="gap-2">

              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">

                {user?.fullName?.[0]?.toUpperCase() || "U"}

              </div>

              <div className="hidden sm:flex flex-col items-start">

                <p className="text-sm font-medium">{user?.fullName}</p>

                <p className="text-xs text-muted-foreground">{user?.email}</p>

              </div>

            </Button>

          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">

            <DropdownMenuItem onClick={() => router.push("/profile")}>

              <User className="w-4 h-4 mr-2" />

              <span>Profile</span>

            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem

              onClick={handleLogout}

              disabled={isLoading}

              className="text-destructive"

            >

              <LogOut className="w-4 h-4 mr-2" />

              <span>{isLoading ? "Signing out..." : "Sign Out"}</span>

            </DropdownMenuItem>

          </DropdownMenuContent>

        </DropdownMenu>

      </div>

    </header>

  );

}

