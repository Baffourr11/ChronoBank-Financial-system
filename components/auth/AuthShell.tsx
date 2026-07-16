"use client";

import Image from "next/image";
import Link from "next/link";
import { Brain } from "lucide-react";

interface AuthShellProps {
  children: React.ReactNode;
  /** Left panel image (desktop). Defaults to sign-in artwork. */
  panelImage?: string;
  panelImageAlt?: string;
}

export function AuthShell({
  children,
  panelImage = "/sign-in.avif",
  panelImageAlt = "ChronoBank financial management for small businesses",
}: AuthShellProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      <aside className="relative hidden lg:block lg:w-1/2 min-h-screen overflow-hidden bg-muted">
        <Image
          src={panelImage}
          alt={panelImageAlt}
          fill
          priority
          className="object-cover object-center"
          sizes="50vw"
        />
      </aside>

      <main className="relative flex flex-1 flex-col min-h-screen lg:w-1/2 bg-auth-panel">
        <div
          className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/8 via-transparent to-secondary/30 dark:from-primary/12 dark:to-secondary/20"
          aria-hidden
        />
        <header className="relative z-10 flex items-center justify-between gap-4 px-4 py-4 sm:px-6 border-b border-auth-border/60">
          <Link
            href="/"
            className="inline-flex items-center gap-2 lg:hidden text-foreground font-semibold"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Brain className="h-5 w-5" />
            </div>
            ChronoBank
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to home
            </Link>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-8 sm:px-6">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
