import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 })
    }

    const review = await prisma.review.findUnique({
      where: { verificationToken: token },
    })

    if (!review) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 404 })
    }

    if (review.isVerified) {
      return NextResponse.json({ message: 'Review already verified' })
    }

    await prisma.review.update({
      where: { id: review.id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        status: 'APPROVED',
      },
    })

    return NextResponse.redirect(
      new URL(`/realtors/${review.realtorProfileId}?verified=true`, req.url)
    )
  } catch (err) {
    console.error('Review verification error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
