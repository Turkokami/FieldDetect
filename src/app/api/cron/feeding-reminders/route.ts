import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called by a cron job every 15 minutes.
// Sends IN_APP notifications to techs assigned to dogs that have feeding times
// coming up in the next 30 minutes, and at the exact feeding time.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const dogs = await prisma.k9Dog.findMany({
    where: { isActive: true, feedingSchedule: { isNot: null } },
    include: {
      feedingSchedule: true,
      k9Team: {
        include: {
          members: { include: { user: true } },
        },
      },
      feedingRemindersSent: {
        where: { sentDate: todayStr },
      },
    },
  });

  let notificationsSent = 0;

  for (const dog of dogs) {
    const schedule = dog.feedingSchedule;
    if (!schedule) continue;

    const meals: Array<{
      meal: "MORNING" | "AFTERNOON" | "EVENING";
      enabled: boolean;
      time: string | null;
    }> = [
      { meal: "MORNING",   enabled: schedule.morningEnabled,   time: schedule.morningTime },
      { meal: "AFTERNOON", enabled: schedule.afternoonEnabled, time: schedule.afternoonTime },
      { meal: "EVENING",   enabled: schedule.eveningEnabled,   time: schedule.eveningTime },
    ];

    const teamMembers = dog.k9Team.members.map((m) => m.user);

    for (const { meal, enabled, time } of meals) {
      if (!enabled || !time) continue;

      const [hStr, mStr] = time.split(":");
      const mealMinutes = parseInt(hStr) * 60 + parseInt(mStr);

      const diffFromNow = mealMinutes - nowMinutes;

      const alreadySentAtTime   = dog.feedingRemindersSent.some((r) => r.meal === meal && r.reminderType === "at_time"    && r.sentDate === todayStr);
      const alreadySent30Min    = dog.feedingRemindersSent.some((r) => r.meal === meal && r.reminderType === "thirty_min" && r.sentDate === todayStr);

      const shouldSendAtTime  = diffFromNow >= 0 && diffFromNow < 15 && !alreadySentAtTime;
      const shouldSend30Min   = diffFromNow >= 15 && diffFromNow < 45 && !alreadySent30Min;

      if (!shouldSendAtTime && !shouldSend30Min) continue;

      const reminderType = shouldSendAtTime ? "at_time" : "thirty_min";
      const mealLabel = meal.charAt(0) + meal.slice(1).toLowerCase();
      const body = shouldSendAtTime
        ? `Time to feed ${dog.name} — ${mealLabel} feeding now.`
        : `${dog.name}'s ${mealLabel} feeding in ~30 minutes (${time}).`;

      for (const member of teamMembers) {
        await prisma.notification.create({
          data: {
            userId: member.id,
            type: "FEEDING_REMINDER",
            channel: "IN_APP",
            subject: `${mealLabel} Feeding: ${dog.name}`,
            body,
            link: `/k9teams/${dog.k9TeamId}/dogs/${dog.id}?tab=feeding`,
          },
        });
        notificationsSent++;
      }

      await prisma.feedingReminderSent.create({
        data: { dogId: dog.id, meal, reminderType, sentDate: todayStr },
      }).catch(() => {
        // unique constraint violation means it was already sent — safe to ignore
      });
    }
  }

  return NextResponse.json({ sent: notificationsSent });
}
