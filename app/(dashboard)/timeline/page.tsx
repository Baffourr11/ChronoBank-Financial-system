"use client";

import TimelineCalendar from "@/components/timeline/TimelineCalendar";
import { DatasetSelector } from "@/components/dataset/DatasetSelector";
import PageHeader from "@/components/layout/PageHeader";

export default function TimelinePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Timeline"
        description="Calendar view of transactions for your active dataset"
      />
      <DatasetSelector />
      <TimelineCalendar />
    </div>
  );
}
