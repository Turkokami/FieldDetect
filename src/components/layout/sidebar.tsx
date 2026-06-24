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
  Smartphone,
  MessageSquare,
  UsersRound,
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
  { label: "Messages",    href: "/messages",    icon: MessageSquare },
  { label: "Analytics",   href: "/analytics",   icon: TrendingUp },
  { label: "K9 Teams",    href: "/k9teams",     icon: Dog },
  { label: "Team",        href: "/team",        icon: UsersRound },
  { label: "Settings",    href: "/settings",    icon: Settings },
];

export function Sidebar({ unreadMessages = 0 }: { unreadMessages?: number }) {
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
              <span className="relative shrink-0">
                <Icon
                  className="h-4.5 w-4.5"
                  style={{ color: isActive ? "#0ABAB5" : undefined }}
                />
                {collapsed && item.href === "/messages" && unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
              </span>
              {!collapsed && (
                <span className="flex-1 flex items-center justify-between gap-2">
                  {item.label}
                  {item.href === "/messages" && unreadMessages > 0 && (
                    <span
                      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white leading-none"
                      style={{ background: "#dc2626" }}
                    >
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Field View switch */}
      <div className="px-2 py-2 shrink-0" style={{ borderTop: "1px solid rgba(10,186,181,0.1)" }}>
        <Link
          href="/field"
          title={collapsed ? "Field View" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 text-slate-400 hover:text-white",
            collapsed && "justify-center px-2"
          )}
          style={{ borderLeft: "2px solid transparent", background: "rgba(10,186,181,0.06)" }}
        >
          <Smartphone className="h-4 w-4 shrink-0" style={{ color: "#0ABAB5" }} />
          {!collapsed && <span style={{ color: "#0ABAB5" }}>Field View</span>}
        </Link>
      </div>

      {/* Legal links */}
      {!collapsed && (
        <div className="px-4 pb-2 shrink-0 flex items-center gap-3">
          <Link href="/terms" className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">Terms</Link>
          <span className="text-slate-700 text-[10px]">·</span>
          <Link href="/privacy" className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">Privacy</Link>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="p-2 shrink-0">
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
