import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatDate } from "@/lib/utils";
import {
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  MinusCircle,
  Clock,
  Dog,
  ChevronRight,
} from "lucide-react";

export const metadata = { title: "Inspections" };

function DetectionBadge({ positive, negative, inconclusive, inaccessible }: {
  positive: number; negative: number; inconclusive: number; inaccessible: number;
}) {
  if (positive > 0) return <Badge variant="positive">{positive} Positive</Badge>;
  if (inconclusive > 0) return <Badge variant="inconclusive">{inconclusive} Inconclusive</Badge>;
  if (negative > 0) return <Badge variant="negative">All Clear</Badge>;
  return <Badge variant="secondary">No Data</Badge>;
}

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const { page = "1" } = await searchParams;
  const pageNum = parseInt(page);
  const pageSize = 20;

  const where = {
    organizationId: user.organizationId,
    ...(user.role === "TECHNICIAN" && { technicianId: user.id }),
  };

  const [inspections, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      include: {
        property: {
          include: {
            customer: { select: { firstName: true, lastName: true, companyName: true } },
          },
        },
        technician: { select: { firstName: true, lastName: true } },
        k9Team: { select: { name: true } },
        k9Dog: { select: { name: true } },
        _count: { select: { inspectionUnits: true, photos: true } },
      },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      orderBy: { startTime: "desc" },
    }),
    prisma.inspection.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inspections</h1>
          <p className="text-slate-500 text-sm mt-1">{total} total inspections</p>
        </div>
      </div>

      <div className="space-y-3">
        {inspections.map((insp) => (
          <Link key={insp.id} href={`/inspections/${insp.id}`}>
            <Card className="hover:shadow-md transition-all cursor-pointer hover:border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-slate-100 flex-shrink-0">
                    <ClipboardList className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {insp.property.customer.companyName ??
                            `${insp.property.customer.firstName} ${insp.property.customer.lastName}`}
                        </p>
                        <p className="text-sm text-slate-500">{insp.property.name}</p>
                      </div>
                      <DetectionBadge
                        positive={insp.totalPositive}
                        negative={insp.totalNegative}
                        inconclusive={insp.totalInconclusive}
                        inaccessible={insp.totalInaccessible}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                      <span className="text-xs text-slate-500 font-mono">{insp.inspectionNumber}</span>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(insp.startTime)}
                      </span>
                      {insp.k9Dog && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Dog className="h-3 w-3" />
                          {insp.k9Dog.name}
                        </span>
                      )}
                      {insp.endTime ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Complete
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <Clock className="h-3 w-3" />
                          In Progress
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>{insp._count.inspectionUnits} units</span>
                      <span>{insp._count.photos} photos</span>
                      {insp.followUpRequired && (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          Follow-up needed
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {inspections.length === 0 && (
        <div className="text-center py-16">
          <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No inspections yet</p>
          <p className="text-slate-400 text-sm mt-1">Inspections are created from scheduled appointments</p>
        </div>
      )}
    </div>
  );
}
