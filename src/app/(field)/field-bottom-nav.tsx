"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ClipboardList, UserCircle } from "lucide-react";

const NAV = [
  { href: "/field",         icon: CalendarDays,  label: "Jobs"    },
  { href: "/field/history", icon: ClipboardList, label: "History" },
  { href: "/field/profile", icon: UserCircle,    label: "Profile" },
];

export default function FieldBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: "rgba(10,15,26,0.97)",
        borderTop: "1px solid rgba(10,186,181,0.15)",
        backdropFilter: "blur(12px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
        paddingTop: "10px",
      }}
    >
      {NAV.map(({ href, icon: Icon, label }) => {
        const active = href === "/field" ? pathname === "/field" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-8 py-1 rounded-xl transition-all"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              style={active ? { background: "rgba(10,186,181,0.15)" } : {}}
            >
              <Icon
                className="h-5 w-5"
                style={{ color: active ? "#0ABAB5" : "#475569" }}
                strokeWidth={active ? 2.5 : 1.8}
              />
            </div>
            <span
              className="text-[10px] font-bold uppercase tracking-wide"
              style={{ color: active ? "#0ABAB5" : "#475569" }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
