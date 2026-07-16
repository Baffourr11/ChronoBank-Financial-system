// Path: app/(dashboard)/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DatasetProvider } from "@/lib/contexts/DatasetContext";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import MobileNav from "@/components/layout/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DatasetProvider>
      <div className="flex h-screen bg-background">
        <div className="hidden md:flex shrink-0">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <MobileNav />
          <TopBar />
          <main className="flex-1 overflow-auto p-4 md:p-8 min-w-0">
            <div className="mx-auto w-full max-w-7xl min-w-0">{children}</div>
          </main>
        </div>
      </div>
    </DatasetProvider>
  );
}
