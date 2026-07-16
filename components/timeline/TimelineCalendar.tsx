"use client";

import { Suspense } from "react";
import CalendarGrid from "@/components/timeline/CalendarGrid";

function CalendarFallback() {
  return (
    <div className="h-64 flex items-center justify-center text-sm text-muted-foreground rounded-lg border">
      Loading timeline…
    </div>
  );
}

export default function TimelineCalendar() {
  return (
    <Suspense fallback={<CalendarFallback />}>
      <CalendarGrid />
    </Suspense>
  );
}
