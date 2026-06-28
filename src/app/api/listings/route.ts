import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const city = searchParams.get('city') || undefined
    const state = searchParams.get('state') || undefined
    const propertyType = searchParams.get('propertyType') || undefined
    const skip = (page - 1) * limit

    const where = {
      status: 'ACTIVE' as const,
      isPublic: true,
      ...(city && { city: { contains: city, mode: 'insensitive' as const } }),
      ...(state && { state }),
      ...(propertyType && { propertyType }),
    }

    const [listings, total] = await Promise.all([
      prisma.homeListing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          homeowner: { select: { id: true, name: true, image: true } },
          photos: { take: 1, orderBy: { order: 'asc' } },
          _count: { select: { proposals: true } },
        },
      }),
      prisma.homeListing.count({ where }),
    ])

    return NextResponse.json({ listings, total, page, limit })
  } catch (error) {
    console.error('[LISTINGS_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const createListingSchema = z.object({
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  zipCode: z.string().min(5),
  propertyType: z.string().min(1),
  estimatedValue: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  sqFt: z.number().optional(),
  lotSize: z.number().optional(),
  yearBuilt: z.number().optional(),
  description: z.string().optional(),
  desiredTimeline: z.string().optional(),
  commissionPreference: z.string().optional(),
  needsRepairs: z.boolean().default(false),
  needsStaging: z.boolean().default(false),
  needsPhotography: z.boolean().default(false),
  specialNotes: z.string().optional(),
  isPublic: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = createListingSchema.parse(body)

    const listing = await prisma.homeListing.create({
      data: {
        ...data,
        homeownerId: session.user.id,
        status: data.isPublic ? 'ACTIVE' : 'DRAFT',
      },
    })

    return NextResponse.json({ listing }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('[LISTINGS_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
