import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || 'APPROVED'
    const skip = (page - 1) * limit

    const { id } = await params
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { realtorProfileId: id, status: status as any },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, image: true } },
          photos: { select: { id: true, url: true, caption: true } },
        },
      }),
      prisma.review.count({ where: { realtorProfileId: id, status: status as any } }),
    ])

    return NextResponse.json({ reviews, total, page, limit })
  } catch (error) {
    console.error('[REALTOR_REVIEWS_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
