import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  ClipboardList,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Calendar,
  FileText,
  RefreshCw,
} from "lucide-react";

interface StatsCardsProps {
  totalInspectionsThisMonth: number;
  positiveDetectionRate: number;
  revenueThisMonth: number;
  unpaidInvoicesTotal: number;
  upcomingAppointmentsCount: number;
  pendingReportsCount: number;
  followUpJobsCount: number;
}

const stats = (data: StatsCardsProps) => [
  {
    label: "Inspections This Month",
    value: data.totalInspectionsThisMonth.toString(),
    icon: ClipboardList,
    iconColor: "#0ABAB5",
    iconBg: "rgba(10,186,181,0.12)",
    accent: true,
  },
  {
    label: "Detection Rate",
    value: `${data.positiveDetectionRate}%`,
    icon: TrendingUp,
    iconColor: "#EF4444",
    iconBg: "rgba(239,68,68,0.1)",
    accent: false,
  },
  {
    label: "Revenue This Month",
    value: formatCurrency(data.revenueThisMonth),
    icon: DollarSign,
    iconColor: "#10B981",
    iconBg: "rgba(16,185,129,0.1)",
    accent: false,
  },
  {
    label: "Unpaid Invoices",
    value: formatCurrency(data.unpaidInvoicesTotal),
    icon: AlertCircle,
    iconColor: "#F59E0B",
    iconBg: "rgba(245,158,11,0.1)",
    accent: false,
  },
  {
    label: "Upcoming Jobs",
    value: data.upcomingAppointmentsCount.toString(),
    icon: Calendar,
    iconColor: "#0D9488",
    iconBg: "rgba(13,148,136,0.1)",
    accent: false,
  },
  {
    label: "Pending Reports",
    value: data.pendingReportsCount.toString(),
    icon: FileText,
    iconColor: "#6366F1",
    iconBg: "rgba(99,102,241,0.1)",
    accent: false,
  },
  {
    label: "Follow-Up Jobs",
    value: data.followUpJobsCount.toString(),
    icon: RefreshCw,
    iconColor: "#F97316",
    iconBg: "rgba(249,115,22,0.1)",
    accent: false,
  },
];

export function DashboardStats(props: StatsCardsProps) {
  const items = stats(props);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {items.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            className="hover:shadow-md transition-all hover:-translate-y-0.5 duration-200 border-border"
            style={stat.accent ? { borderTop: "2px solid #0ABAB5" } : {}}
          >
            <CardContent className="p-4">
              <div
                className="inline-flex p-2 rounded-lg mb-3"
                style={{ backgroundColor: stat.iconBg }}
              >
                <Icon className="h-4.5 w-4.5" style={{ color: stat.iconColor }} />
              </div>
              <p className="text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-tight">{stat.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
