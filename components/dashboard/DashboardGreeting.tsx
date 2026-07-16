"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getFirstName(fullName?: string | null): string {
  if (!fullName?.trim()) return "there";
  return fullName.trim().split(/\s+/)[0] ?? "there";
}

export default function DashboardGreeting() {
  const { user } = useAuth();

  const greeting = useMemo(() => getTimeGreeting(), []);
  const firstName = getFirstName(user?.fullName);

  return (
    <div className="min-w-0">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
        {greeting}, {firstName}
      </h1>
    </div>
  );
}
