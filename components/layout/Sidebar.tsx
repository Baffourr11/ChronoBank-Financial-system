// Path: components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  LogOut,
  Brain,
  BookMarked,
  PiggyBank,
  Database,
  Calendar,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rules", label: "Automation Rules", icon: BookMarked },
  { href: "/budgets", label: "Smart Budget", icon: PiggyBank },
  { href: "/timeline", label: "Timeline", icon: Calendar },
  { href: "/analytics/overview", label: "Analytics", icon: Brain },
  { href: "/data/import", label: "Data Import", icon: Database },
];

export default function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <aside
      className={`w-64 bg-sidebar border-r border-sidebar-border flex flex-col ${className}`}
    >
      {/* Logo / Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Brain className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">
              ChronoBank
            </h1>
            <p className="text-xs text-sidebar-foreground/60">
              Financial Manager
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/20"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
