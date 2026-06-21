"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/field", icon: "🗓️", label: "Jobs" },
  { href: "/field/history", icon: "📋", label: "History" },
  { href: "/field/profile", icon: "👤", label: "Profile" },
];

export default function FieldBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2"
      style={{
        background: "linear-gradient(0deg, #0A0F1A 80%, transparent)",
        borderTop: "1px solid rgba(10,186,181,0.15)",
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
        paddingTop: "12px",
      }}
    >
      {NAV.map(({ href, icon, label }) => {
        const active = href === "/field" ? pathname === "/field" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-5 py-1 rounded-xl transition-colors"
            style={{ color: active ? "#0ABAB5" : "#94a3b8" }}
          >
            <span className="text-xl">{icon}</span>
            <span
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={active ? { color: "#0ABAB5" } : {}}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
