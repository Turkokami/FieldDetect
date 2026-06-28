import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateRealtorSchema = z.object({
  action: z.enum(['VERIFY', 'UNVERIFY', 'FEATURE', 'UNFEATURE', 'DEACTIVATE', 'ACTIVATE', 'APPROVE_CLAIM', 'REJECT_CLAIM']),
  adminNotes: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { action, adminNotes } = updateRealtorSchema.parse(body)

    const updates: Record<string, unknown> = { adminNotes: adminNotes ?? null }

    switch (action) {
      case 'VERIFY':
        updates.isVerified = true
        updates.verificationStatus = 'VERIFIED'
        updates.verifiedAt = new Date()
        break
      case 'UNVERIFY':
        updates.isVerified = false
        updates.verificationStatus = 'UNVERIFIED'
        break
      case 'FEATURE':
        updates.isFeatured = true
        break
      case 'UNFEATURE':
        updates.isFeatured = false
        break
      case 'DEACTIVATE':
        updates.isActive = false
        break
      case 'ACTIVATE':
        updates.isActive = true
        break
    }

    const { id } = await params
    const realtor = await prisma.realtorProfile.update({
      where: { id },
      data: updates,
    })

    await prisma.adminActionLog.create({
      data: {
        adminId: session.user.id,
        action: `REALTOR_${action}`,
        targetType: 'RealtorProfile',
        targetId: id,
        details: { adminNotes },
      },
    })

    return NextResponse.json({ success: true, realtor })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('[ADMIN_REALTOR_UPDATE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
