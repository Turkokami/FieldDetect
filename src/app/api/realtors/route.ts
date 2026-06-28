import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseSearchParams } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const filters = parseSearchParams(searchParams)

    const where: any = {
      isActive: true,
    }

    if (filters.query) {
      where.OR = [
        { firstName: { contains: filters.query, mode: 'insensitive' } },
        { lastName: { contains: filters.query, mode: 'insensitive' } },
        { tagline: { contains: filters.query, mode: 'insensitive' } },
        { bio: { contains: filters.query, mode: 'insensitive' } },
      ]
    }

    if (filters.city) {
      where.serviceAreas = { hasSome: [filters.city] }
    }

    if (filters.state) {
      if (!where.user) where.user = {}
      where.OR = where.OR || []
      where.serviceAreas = {
        ...(where.serviceAreas || {}),
      }
    }

    if (filters.specialty) {
      where.specialties = { hasSome: [filters.specialty] }
    }

    if (filters.verifiedOnly) {
      where.isVerified = true
    }

    // Get realtors with review aggregation
    const realtors = await prisma.realtorProfile.findMany({
      where,
      include: {
        brokerage: { select: { id: true, name: true } },
        reviews: {
          where: { status: 'APPROVED' },
          select: { overallRating: true },
        },
        _count: {
          select: {
            reviews: { where: { status: 'APPROVED' } },
          },
        },
      },
      orderBy:
        filters.sortBy === 'featured'
          ? [{ isFeatured: 'desc' }, { isVerified: 'desc' }]
          : filters.sortBy === 'recent'
          ? { createdAt: 'desc' }
          : undefined,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    })

    const total = await prisma.realtorProfile.count({ where })

    const results = realtors
      .map((r) => {
        const ratings = r.reviews.map((rev) => rev.overallRating)
        const avgRating =
          ratings.length > 0
            ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
            : 0
        const reviewCount = r._count.reviews

        return {
          id: r.id,
          firstName: r.firstName,
          lastName: r.lastName,
          profilePhoto: r.profilePhoto,
          tagline: r.tagline,
          bio: r.bio,
          city: r.serviceAreas[0] || null,
          state: null,
          brokerageName: r.brokerage?.name || null,
          yearsInBusiness: r.yearsInBusiness,
          specialties: r.specialties,
          serviceAreas: r.serviceAreas,
          averageRating: avgRating,
          reviewCount,
          isVerified: r.isVerified,
          isFeatured: r.isFeatured,
          subscriptionTier: r.subscriptionTier,
          verificationStatus: r.verificationStatus,
        }
      })
      .filter((r) => !filters.minRating || r.averageRating >= filters.minRating)
      .sort((a, b) => {
        if (filters.sortBy === 'rating') return b.averageRating - a.averageRating
        if (filters.sortBy === 'reviews') return b.reviewCount - a.reviewCount
        return 0
      })

    return NextResponse.json({
      realtors: results,
      total,
      page: filters.page,
      totalPages: Math.ceil(total / filters.limit),
    })
  } catch (err) {
    console.error('Realtors search error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
