"use client";

import { Search, Bell, User } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function Topbar() {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6">
      {/* Left: Logo */}
      <div className="h-10 w-36 overflow-hidden flex items-center justify-center">
        <img
          src="/Cournot_Black_Horizontal-01.png"
          alt="Cournot"
          className="h-[7rem] w-auto max-w-none dark:hidden"
        />
        <img
          src="/Cournot_Logo_White_Horizontal-01.png"
          alt="Cournot"
          className="h-[7rem] w-auto max-w-none hidden dark:block"
        />
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex max-w-md flex-1 mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search markets, IDs, hashes…"
            className="h-8 w-full rounded-lg border border-border bg-muted/30 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Bell className="h-4 w-4" />
        </button>
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
