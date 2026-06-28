import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getAuthSession } from '@/lib/auth'

const messageSchema = z.object({
  receiverId: z.string().min(1),
  content: z.string().min(1).max(5000),
  subject: z.string().max(200).optional(),
  threadId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const data = messageSchema.parse(body)

    let thread
    if (data.threadId) {
      thread = await prisma.messageThread.findUnique({
        where: { id: data.threadId },
        include: { participants: true },
      })
      if (!thread) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
      }
    } else {
      thread = await prisma.messageThread.create({
        data: {
          subject: data.subject,
          participants: {
            connect: [{ id: session.user.id }, { id: data.receiverId }],
          },
        },
      })
    }

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        senderId: session.user.id,
        receiverId: data.receiverId,
        content: data.content,
      },
    })

    await prisma.messageThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    })

    return NextResponse.json({ message, threadId: thread.id }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    }
    console.error('Message send error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const threads = await prisma.messageThread.findMany({
      where: {
        participants: { some: { id: session.user.id } },
      },
      include: {
        participants: { select: { id: true, name: true, image: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    return NextResponse.json({ threads })
  } catch (err) {
    console.error('Messages fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
