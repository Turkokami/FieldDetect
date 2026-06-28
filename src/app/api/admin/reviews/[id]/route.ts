import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const moderateSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'FLAG']),
  adminNotes: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { action, adminNotes } = moderateSchema.parse(body)

    const statusMap = {
      APPROVE: 'APPROVED' as const,
      REJECT: 'REJECTED' as const,
      FLAG: 'FLAGGED' as const,
    }

    const { id } = await params
    const review = await prisma.review.update({
      where: { id },
      data: {
        status: statusMap[action],
        adminNotes: adminNotes ?? null,
        moderatedBy: session.user.id,
        moderatedAt: new Date(),
      },
    })

    await prisma.adminActionLog.create({
      data: {
        adminId: session.user.id,
        action: `REVIEW_${action}`,
        targetType: 'Review',
        targetId: id,
        details: { adminNotes },
      },
    })

    return NextResponse.json({ success: true, review })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('[ADMIN_REVIEW_MODERATE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
