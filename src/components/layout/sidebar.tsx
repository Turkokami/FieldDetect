"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  Receipt,
  Settings,
  Dog,
  ChevronLeft,
  ChevronRight,
  MapPin,
  TrendingUp,
  FileCheck,
  Bell,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Dashboard",   href: "/dashboard",   icon: LayoutDashboard },
  { label: "Customers",   href: "/customers",   icon: Users },
  { label: "Properties",  href: "/properties",  icon: Building2 },
  { label: "Scheduling",  href: "/scheduling",  icon: Calendar },
  { label: "Inspections", href: "/inspections", icon: ClipboardList },
  { label: "Follow-Ups",  href: "/follow-ups",  icon: Bell },
  { label: "Reports",     href: "/reports",     icon: FileText },
  { label: "Estimates",   href: "/estimates",   icon: FileCheck },
  { label: "Invoices",    href: "/invoices",    icon: Receipt },
  { label: "Routes",      href: "/routes",      icon: MapPin },
  { label: "Analytics",   href: "/analytics",   icon: TrendingUp },
  { label: "K9 Teams",    href: "/k9teams",     icon: Dog },
  { label: "Settings",    href: "/settings",    icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-full transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
      style={{ background: "linear-gradient(180deg, #0A0F1A 0%, #0D1A1F 100%)" }}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-4 shrink-0",
        collapsed ? "justify-center" : "gap-3"
      )}
        style={{ borderBottom: "1px solid rgba(10,186,181,0.15)" }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}
        >
          <span className="text-white text-base">🐾</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-bold text-white text-sm tracking-tight">FieldDetect</div>
            <div className="text-xs font-medium" style={{ color: "#0ABAB5" }}>K9 Command Center</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "text-white"
                  : "text-slate-400 hover:text-white",
                collapsed && "justify-center px-2"
              )}
              style={isActive ? {
                background: "linear-gradient(90deg, rgba(10,186,181,0.22) 0%, rgba(10,186,181,0.08) 100%)",
                borderLeft: "2px solid #0ABAB5",
                color: "#0ABAB5",
              } : {
                borderLeft: "2px solid transparent",
              }}
            >
              <Icon
                className="h-4.5 w-4.5 shrink-0"
                style={{ color: isActive ? "#0ABAB5" : undefined }}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 shrink-0" style={{ borderTop: "1px solid rgba(10,186,181,0.1)" }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-white transition-colors"
          style={{ background: "rgba(10,186,181,0.05)" }}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
