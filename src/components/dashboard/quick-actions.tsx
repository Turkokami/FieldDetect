"use client";

import Link from "next/link";
import { Calendar, ClipboardList, Receipt, Users, Plus } from "lucide-react";

const actions = [
  {
    label: "New Customer",
    href: "/customers/new",
    icon: Users,
    primary: true,
  },
  {
    label: "Schedule Job",
    href: "/scheduling/new",
    icon: Calendar,
    primary: false,
  },
  {
    label: "New Inspection",
    href: "/inspections/new",
    icon: ClipboardList,
    primary: false,
  },
  {
    label: "Create Invoice",
    href: "/invoices/new",
    icon: Receipt,
    primary: false,
  },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2.5">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-medium transition-all duration-150 hover:-translate-y-px"
            style={action.primary ? {
              background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)",
              color: "#fff",
              boxShadow: "0 2px 8px rgba(10,186,181,0.35)",
            } : {
              background: "#fff",
              color: "#0A0F1A",
              border: "1px solid #C8E8E6",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            {action.primary
              ? <Plus className="h-4 w-4" />
              : <Icon className="h-4 w-4" style={{ color: "#0ABAB5" }} />
            }
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}
