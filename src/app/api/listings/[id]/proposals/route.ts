import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const listing = await prisma.homeListing.findUnique({ where: { id } })
    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (listing.homeownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const proposals = await prisma.realtorProposal.findMany({
      where: { listingId: id },
      include: {
        realtor: {
          include: {
            brokerage: { select: { name: true } },
            reviews: { where: { status: 'APPROVED' }, select: { overallRating: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ proposals })
  } catch (error) {
    console.error('[PROPOSALS_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const proposalSchema = z.object({
  coverLetter: z.string().min(50, 'Cover letter must be at least 50 characters'),
  proposedRate: z.number().min(0).max(100).optional(),
  marketingPlan: z.string().optional(),
  timeline: z.string().optional(),
  whyChooseMe: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'REALTOR') {
      return NextResponse.json({ error: 'Only realtors can submit proposals' }, { status: 403 })
    }

    const realtorProfile = await prisma.realtorProfile.findUnique({ where: { userId: session.user.id } })
    if (!realtorProfile) {
      return NextResponse.json({ error: 'Realtor profile not found' }, { status: 404 })
    }

    const { id } = await params
    const existing = await prisma.realtorProposal.findUnique({
      where: { listingId_realtorId: { listingId: id, realtorId: realtorProfile.id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'You have already submitted a proposal for this listing' }, { status: 409 })
    }

    const body = await req.json()
    const data = proposalSchema.parse(body)

    const proposal = await prisma.realtorProposal.create({
      data: { ...data, listingId: id, realtorId: realtorProfile.id },
    })

    return NextResponse.json({ proposal }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('[PROPOSALS_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
