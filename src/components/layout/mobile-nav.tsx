"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Menu, X, LayoutDashboard, Users, Building2, Calendar,
  ClipboardList, FileText, Receipt, Settings, Dog, MapPin, TrendingUp,
  FileCheck, Bell, Smartphone,
} from "lucide-react";

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

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Hamburger trigger — only visible on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 h-full flex flex-col transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ width: "min(256px, 80vw)", background: "linear-gradient(180deg, #0A0F1A 0%, #0D1A1F 100%)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between h-14 px-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(10,186,181,0.15)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}
            >
              <span className="text-white text-sm">🐾</span>
            </div>
            <div>
              <div className="font-bold text-white text-sm">FieldDetect</div>
              <div className="text-xs" style={{ color: "#0ABAB5" }}>K9 Command Center</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-white transition-colors p-1"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
                style={isActive ? {
                  background: "linear-gradient(90deg, rgba(10,186,181,0.22) 0%, rgba(10,186,181,0.08) 100%)",
                  borderLeft: "2px solid #0ABAB5",
                  color: "#0ABAB5",
                } : {
                  borderLeft: "2px solid transparent",
                  color: "#94A3B8",
                }}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" style={{ color: isActive ? "#0ABAB5" : undefined }} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {/* Field View divider + link */}
          <div className="pt-2 mt-1" style={{ borderTop: "1px solid rgba(10,186,181,0.15)" }}>
            <Link
              href="/field"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
              style={{ borderLeft: "2px solid #0ABAB5", background: "rgba(10,186,181,0.08)", color: "#0ABAB5" }}
            >
              <Smartphone className="h-4.5 w-4.5 shrink-0" style={{ color: "#0ABAB5" }} />
              <span>Field View</span>
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
