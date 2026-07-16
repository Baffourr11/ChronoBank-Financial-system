import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  headerAction?: React.ReactNode;
}

export function ChartCard({
  title,
  description,
  children,
  className,
  contentClassName,
  icon: Icon,
  iconClassName,
  headerAction,
}: ChartCardProps) {
  return (
    <Card
      className={cn(
        "min-w-0 overflow-hidden border-border/80 shadow-sm",
        className,
      )}
    >
      <CardHeader className="pb-3 space-y-1">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {Icon ? (
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
                  iconClassName,
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-semibold leading-tight truncate">
                {title}
              </CardTitle>
              {description ? (
                <CardDescription className="mt-1 text-sm leading-relaxed line-clamp-2">
                  {description}
                </CardDescription>
              ) : null}
            </div>
          </div>
          {headerAction ? (
            <div className="shrink-0">{headerAction}</div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent
        className={cn("min-w-0 overflow-hidden pt-0 pb-5", contentClassName)}
      >
        {children}
      </CardContent>
    </Card>
  );
}
