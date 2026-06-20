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
    color: "text-blue-600",
    bg: "bg-blue-50",
    change: null,
  },
  {
    label: "Positive Detection Rate",
    value: `${data.positiveDetectionRate}%`,
    icon: TrendingUp,
    color: "text-red-600",
    bg: "bg-red-50",
    change: null,
  },
  {
    label: "Revenue This Month",
    value: formatCurrency(data.revenueThisMonth),
    icon: DollarSign,
    color: "text-green-600",
    bg: "bg-green-50",
    change: null,
  },
  {
    label: "Unpaid Invoices",
    value: formatCurrency(data.unpaidInvoicesTotal),
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    change: null,
  },
  {
    label: "Upcoming Appointments",
    value: data.upcomingAppointmentsCount.toString(),
    icon: Calendar,
    color: "text-purple-600",
    bg: "bg-purple-50",
    change: null,
  },
  {
    label: "Pending Reports",
    value: data.pendingReportsCount.toString(),
    icon: FileText,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    change: null,
  },
  {
    label: "Follow-Up Jobs",
    value: data.followUpJobsCount.toString(),
    icon: RefreshCw,
    color: "text-orange-600",
    bg: "bg-orange-50",
    change: null,
  },
];

export function DashboardStats(props: StatsCardsProps) {
  const items = stats(props);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {items.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${stat.bg} mb-3`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1 leading-tight">{stat.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
