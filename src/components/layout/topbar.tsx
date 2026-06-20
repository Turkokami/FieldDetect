"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Search } from "lucide-react";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-5 gap-4 shrink-0 shadow-sm">
      {title && (
        <h1 className="text-base font-semibold text-foreground mr-4">{title}</h1>
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
        <button className="relative h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell className="h-4.5 w-4.5" />
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
