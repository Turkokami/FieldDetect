import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export async function GET() {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const favorites = await prisma.favoriteRealtor.findMany({
      where: { userId: session.user.id },
      include: {
        realtor: {
          include: { brokerage: { select: { name: true } }, reviews: { where: { status: 'APPROVED' }, select: { overallRating: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ favorites })
  } catch (error) {
    console.error('[FAVORITES_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const favoriteSchema = z.object({ realtorId: z.string() })

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { realtorId } = favoriteSchema.parse(body)

    const favorite = await prisma.favoriteRealtor.create({
      data: { userId: session.user.id, realtorId },
    })

    return NextResponse.json({ favorite }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('[FAVORITES_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const realtorId = searchParams.get('realtorId')
    if (!realtorId) {
      return NextResponse.json({ error: 'realtorId required' }, { status: 400 })
    }

    await prisma.favoriteRealtor.deleteMany({
      where: { userId: session.user.id, realtorId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[FAVORITES_DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
