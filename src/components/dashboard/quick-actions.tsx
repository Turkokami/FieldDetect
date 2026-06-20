"use client";

import Link from "next/link";
import { Plus, Calendar, ClipboardList, Receipt, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { label: "New Customer", href: "/customers/new", icon: Users, variant: "default" as const },
  { label: "Schedule Job", href: "/scheduling/new", icon: Calendar, variant: "outline" as const },
  { label: "Start Inspection", href: "/inspections/new", icon: ClipboardList, variant: "outline" as const },
  { label: "Create Invoice", href: "/invoices/new", icon: Receipt, variant: "outline" as const },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button key={action.href} variant={action.variant} asChild>
            <Link href={action.href}>
              <Icon className="h-4 w-4" />
              {action.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
