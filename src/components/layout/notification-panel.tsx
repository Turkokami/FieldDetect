"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  type: string;
  subject: string | null;
  body: string;
  link: string | null;
  createdAt: string | Date;
  readAt: string | Date | null;
};

const TYPE_ICONS: Record<string, string> = {
  APPOINTMENT_REMINDER:    "📅",
  APPOINTMENT_CONFIRMATION:"✅",
  TECHNICIAN_EN_ROUTE:     "🚗",
  INSPECTION_COMPLETE:     "🔍",
  REPORT_READY:            "📄",
  INVOICE_SENT:            "💰",
  PAYMENT_RECEIVED:        "💳",
  FOLLOW_UP_NEEDED:        "🔔",
  APPOINTMENT_CANCELLED:   "❌",
  FEEDING_REMINDER:        "🐾",
};

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.readAt).length;

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/in-app");
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n))
    );
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date() })));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => { setOpen((v) => !v); if (!open) fetchNotifications(); }}
        className="relative h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] flex items-center justify-center bg-destructive rounded-full text-[9px] font-bold text-white px-0.5">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">
              Notifications {unread > 0 && <span className="text-xs text-muted-foreground font-normal">({unread} unread)</span>}
            </span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors flex items-center gap-1"
                  title="Mark all read"
                >
                  <CheckCheck className="h-3 w-3" />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading && notifications.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="py-10 text-center">
                <div className="text-2xl mb-2">🔔</div>
                <p className="text-sm text-muted-foreground">No new notifications</p>
              </div>
            )}
            {notifications.map((n) => {
              const icon = TYPE_ICONS[n.type] ?? "🔔";
              const isRead = !!n.readAt;
              const content = (
                <div
                  className={`flex gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors ${
                    isRead ? "opacity-60" : "bg-primary/5"
                  } hover:bg-muted/50 cursor-pointer`}
                  onClick={() => { if (!isRead) markRead(n.id); }}
                >
                  <span className="text-lg shrink-0 mt-0.5">{icon}</span>
                  <div className="flex-1 min-w-0">
                    {n.subject && (
                      <div className="text-xs font-semibold text-foreground truncate">{n.subject}</div>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                    <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  {!isRead && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                      className="shrink-0 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      title="Mark read"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );

              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => { markRead(n.id); setOpen(false); }}>
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
