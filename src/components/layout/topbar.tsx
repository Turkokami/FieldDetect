"use client";

import { useTheme } from "next-themes";
import { UserButton } from "@clerk/nextjs";
import { Bell, Search, Sun, Moon } from "lucide-react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/components/search/command-palette";
import { useEffect, useState } from "react";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

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

        {/* Search bar — opens command palette on click */}
        <div className="hidden md:flex flex-1 max-w-sm">
          <button
            onClick={() => setPaletteOpen(true)}
            className="relative w-full h-9 flex items-center gap-2 pl-9 pr-3 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground hover:border-primary/40 hover:bg-muted transition-all text-left"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <span className="flex-1">Search customers, properties...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border text-[10px] font-mono text-muted-foreground shrink-0">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Mobile search icon */}
          <button
            onClick={() => setPaletteOpen(true)}
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
    </>
  );
}
