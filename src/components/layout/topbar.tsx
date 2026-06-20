"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="h-16 border-b bg-white flex items-center px-6 gap-4 flex-shrink-0">
      {title && (
        <h1 className="text-lg font-semibold text-slate-900 mr-4">{title}</h1>
      )}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search customers, inspections..."
            className="pl-9 bg-slate-50 border-slate-200"
          />
        </div>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>
        <UserButton />
      </div>
    </header>
  );
}
