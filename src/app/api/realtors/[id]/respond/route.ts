import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const respondSchema = z.object({
  reviewId: z.string(),
  response: z.string().min(10, 'Response must be at least 10 characters').max(2000),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const realtorProfile = await prisma.realtorProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!realtorProfile || realtorProfile.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { reviewId, response } = respondSchema.parse(body)

    const review = await prisma.review.findFirst({
      where: { id: reviewId, realtorProfileId: id },
    })

    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    if (review.realtorResponse) {
      return NextResponse.json({ error: 'Response already submitted' }, { status: 409 })
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { realtorResponse: response, respondedAt: new Date() },
    })

    return NextResponse.json({ review: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('[REALTOR_RESPOND]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
