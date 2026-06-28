import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const realtor = await prisma.realtorProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
        brokerage: true,
        reviews: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, name: true, image: true } },
            photos: true,
          },
        },
        teamPhotos: { orderBy: { order: 'asc' } },
        soldProperties: { orderBy: { saleDate: 'desc' }, take: 10 },
        reputationSummaries: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        externalSources: {
          where: { isApproved: true },
        },
      },
    })

    if (!realtor) {
      return NextResponse.json({ error: 'Realtor not found' }, { status: 404 })
    }

    // Increment profile views (non-blocking)
    prisma.realtorProfile.update({
      where: { id },
      data: { profileViews: { increment: 1 } },
    }).catch(console.error)

    const ratings = realtor.reviews.map((r) => r.overallRating)
    const averageRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : 0

    return NextResponse.json({
      ...realtor,
      averageRating,
      reviewCount: realtor.reviews.length,
    })
  } catch (err) {
    console.error('Realtor fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
