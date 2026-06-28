import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getAuthSession } from '@/lib/auth'
import { generateVerificationToken } from '@/lib/utils'
import { sendVerificationEmail } from '@/lib/email'

const reviewSchema = z.object({
  realtorProfileId: z.string().min(1),
  overallRating: z.number().min(1).max(5),
  communicationRating: z.number().min(1).max(5).optional(),
  negotiationRating: z.number().min(1).max(5).optional(),
  marketKnowledgeRating: z.number().min(1).max(5).optional(),
  responsivenessRating: z.number().min(1).max(5).optional(),
  professionalismRating: z.number().min(1).max(5).optional(),
  honestyRating: z.number().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  content: z.string().min(50, 'Review must be at least 50 characters').max(5000),
  wouldRecommend: z.boolean(),
  transactionType: z.enum(['BUYER', 'SELLER', 'RENTER', 'INVESTOR', 'LANDLORD']),
  transactionDate: z.string().optional(),
  propertyCity: z.string().optional(),
  propertyState: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const data = reviewSchema.parse(body)

    // Verify realtor profile exists
    const realtorProfile = await prisma.realtorProfile.findUnique({
      where: { id: data.realtorProfileId },
      include: { user: true },
    })

    if (!realtorProfile) {
      return NextResponse.json({ error: 'Realtor not found' }, { status: 404 })
    }

    // Check if user has already reviewed this realtor
    const existingReview = await prisma.review.findFirst({
      where: {
        authorId: session.user.id,
        realtorProfileId: data.realtorProfileId,
      },
    })

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this realtor' },
        { status: 409 }
      )
    }

    const verificationToken = generateVerificationToken()

    const review = await prisma.review.create({
      data: {
        authorId: session.user.id,
        realtorId: realtorProfile.userId || '',
        realtorProfileId: data.realtorProfileId,
        overallRating: data.overallRating,
        communicationRating: data.communicationRating,
        negotiationRating: data.negotiationRating,
        marketKnowledgeRating: data.marketKnowledgeRating,
        responsivenessRating: data.responsivenessRating,
        professionalismRating: data.professionalismRating,
        honestyRating: data.honestyRating,
        title: data.title,
        content: data.content,
        wouldRecommend: data.wouldRecommend,
        transactionType: data.transactionType,
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : null,
        propertyCity: data.propertyCity,
        propertyState: data.propertyState,
        verificationToken,
        status: 'PENDING',
      },
    })

    // Send verification email (non-blocking)
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (user?.email) {
      const realtorName = `${realtorProfile.firstName} ${realtorProfile.lastName}`
      sendVerificationEmail(user.email, verificationToken, realtorName).catch(console.error)
    }

    return NextResponse.json({ message: 'Review submitted successfully', reviewId: review.id }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    }
    console.error('Review submission error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const realtorProfileId = req.nextUrl.searchParams.get('realtorProfileId')
    const authorId = req.nextUrl.searchParams.get('authorId')

    const where: any = { status: 'APPROVED' }
    if (realtorProfileId) where.realtorProfileId = realtorProfileId
    if (authorId) where.authorId = authorId

    const reviews = await prisma.review.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, image: true } },
        photos: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ reviews })
  } catch (err) {
    console.error('Reviews fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
