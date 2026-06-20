import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import { FileText, Download, Eye, AlertTriangle, CheckCircle } from "lucide-react";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const inspections = await prisma.inspection.findMany({
    where: {
      organizationId: user.organizationId,
      endTime: { not: null },
    },
    include: {
      property: {
        include: {
          customer: { select: { firstName: true, lastName: true, companyName: true } },
        },
      },
      technician: { select: { firstName: true, lastName: true } },
      k9Dog: { select: { name: true } },
      _count: { select: { inspectionUnits: true } },
    },
    orderBy: { startTime: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Generate and view inspection reports</p>
      </div>

      <div className="space-y-3">
        {inspections.map((insp) => (
          <Card key={insp.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-slate-100 flex-shrink-0">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {insp.property.customer.companyName ??
                        `${insp.property.customer.firstName} ${insp.property.customer.lastName}`}
                    </p>
                    <p className="text-sm text-slate-500">{insp.property.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-400 font-mono">{insp.inspectionNumber}</span>
                      <span className="text-xs text-slate-400">{formatDate(insp.startTime)}</span>
                      <span className="text-xs text-slate-500">{insp._count.inspectionUnits} units</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {insp.totalPositive > 0 ? (
                    <Badge variant="positive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {insp.totalPositive} Positive
                    </Badge>
                  ) : (
                    <Badge variant="negative">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      All Clear
                    </Badge>
                  )}

                  {insp.reportUrl ? (
                    <Badge variant="success">Report Ready</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}

                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/reports/${insp.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/api/reports/${insp.id}/pdf`} target="_blank">
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {inspections.length === 0 && (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No completed inspections yet</p>
        </div>
      )}
    </div>
  );
}
