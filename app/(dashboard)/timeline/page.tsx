import CalendarGrid from '@/components/timeline/CalendarGrid';

export default function TimelinePage() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Timeline</h1>
        <p className="text-muted-foreground mt-2">Calendar view of all your transactions</p>
      </div>
      <CalendarGrid />
    </div>
  );
}
