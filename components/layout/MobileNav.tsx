"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Sidebar from "@/components/layout/Sidebar";

export default function MobileNav() {
  return (
    <div className="md:hidden flex items-center gap-3 px-4 h-16 border-b border-border bg-background">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Sidebar className="w-full border-0 h-full" />
        </SheetContent>
      </Sheet>
      <Link href="/dashboard" className="font-semibold truncate">
        ChronoBank
      </Link>
    </div>
  );
}
