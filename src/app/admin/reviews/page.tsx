import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminReviewsTable } from '@/components/admin/AdminReviewsTable'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Manage Reviews - Admin' }

export default async function AdminReviewsPage() {
  const session = await getAuthSession()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')

  const reviews = await prisma.review.findMany({
    include: {
      author: { select: { id: true, name: true, email: true } },
      realtorProfile: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  })

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Reviews</h1>
        <p className="text-gray-500 text-sm mt-1">
          {reviews.filter((r) => r.status === 'PENDING').length} reviews pending moderation
        </p>
      </div>

      <AdminReviewsTable reviews={reviews} />
    </AdminLayout>
  )
}
