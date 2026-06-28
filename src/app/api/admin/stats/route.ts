import { NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getAuthSession()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalUsers,
      totalRealtors,
      totalReviews,
      pendingReviews,
      flaggedReviews,
      pendingVerifications,
      totalListings,
      newUsersThisMonth,
      newReviewsThisMonth,
      recentActions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.realtorProfile.count(),
      prisma.review.count(),
      prisma.review.count({ where: { status: 'PENDING' } }),
      prisma.review.count({ where: { status: 'FLAGGED' } }),
      prisma.verificationRequest.count({ where: { status: 'PENDING' } }),
      prisma.homeListing.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.review.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.adminActionLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { name: true, email: true } } },
      }),
    ])

    const flaggedReports = await prisma.report.count({ where: { status: 'PENDING' } })

    return NextResponse.json({
      totalUsers,
      totalRealtors,
      totalReviews,
      pendingReviews,
      flaggedContent: flaggedReviews + flaggedReports,
      pendingVerifications,
      totalListings,
      newUsersThisMonth,
      newReviewsThisMonth,
      recentActions,
    })
  } catch (error) {
    console.error('[ADMIN_STATS]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
