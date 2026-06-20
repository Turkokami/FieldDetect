"use client";

import { useTheme } from "next-themes";
import { UserButton } from "@clerk/nextjs";
import { Bell, Search, Sun, Moon } from "lucide-react";
import { MobileNav } from "@/components/layout/mobile-nav";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0 shadow-sm">
      <MobileNav />
      {title && (
        <h1 className="text-base font-semibold text-foreground hidden sm:block">{title}</h1>
      )}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Search customers, properties..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>
        <button className="relative h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full" />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
            },
          }}
        />
      </div>
    </header>
  );
}
