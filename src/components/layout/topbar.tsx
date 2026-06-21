"use client";

import { useTheme } from "next-themes";
import { UserButton } from "@clerk/nextjs";
import { Bell, Search, Sun, Moon } from "lucide-react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useState } from "react";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0 shadow-sm">
      {/* Mobile hamburger */}
      <MobileNav />

      {/* Logo / title on mobile (hidden on desktop since sidebar shows it) */}
      <div className="flex items-center gap-2 lg:hidden">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}
        >
          <span className="text-white text-xs">🐾</span>
        </div>
        <span className="font-bold text-foreground text-sm tracking-tight">FieldDetect</span>
      </div>

      {/* Search — full bar on desktop, icon-to-expand on mobile */}
      <div className="hidden md:flex flex-1 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Search customers, properties..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
          />
        </div>
      </div>

      {/* Mobile search expand */}
      {searchOpen && (
        <div className="absolute inset-x-0 top-0 h-14 flex items-center px-4 gap-2 z-20 bg-card border-b border-border md:hidden">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            placeholder="Search..."
            className="flex-1 h-9 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            onBlur={() => setSearchOpen(false)}
          />
          <button onClick={() => setSearchOpen(false)} className="text-xs text-muted-foreground px-1">
            Cancel
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        {/* Mobile search icon */}
        <button
          onClick={() => setSearchOpen(true)}
          className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Theme toggle — hidden on mobile to save space */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        <button className="relative h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full" />
        </button>

        <div className="w-px h-5 bg-border mx-0.5" />

        <UserButton
          appearance={{ elements: { avatarBox: "w-8 h-8" } }}
        />
      </div>
    </header>
  );
}
