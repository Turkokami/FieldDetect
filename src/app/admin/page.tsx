import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AdminStatsCards } from '@/components/admin/AdminStatsCards'
import { AdminRecentActivity } from '@/components/admin/AdminRecentActivity'
import { AdminLayout } from '@/components/admin/AdminLayout'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin Dashboard' }

async function getAdminStats() {
  const [
    totalUsers,
    totalRealtors,
    totalReviews,
    pendingReviews,
    pendingVerifications,
    totalListings,
    recentPayments,
    newUsersThisMonth,
    newReviewsThisMonth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.realtorProfile.count(),
    prisma.review.count(),
    prisma.review.count({ where: { status: 'PENDING' } }),
    prisma.verificationRequest.count({ where: { status: 'PENDING' } }),
    prisma.homeListing.count(),
    prisma.payment.findMany({
      where: { status: 'succeeded' },
      select: { amount: true },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.review.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ])

  const totalRevenue = recentPayments.reduce((sum, p) => sum + p.amount, 0)

  return {
    totalUsers,
    totalRealtors,
    totalReviews,
    pendingReviews,
    flaggedContent: 0,
    pendingVerifications,
    totalListings,
    totalRevenue,
    newUsersThisMonth,
    newReviewsThisMonth,
  }
}

export default async function AdminDashboardPage() {
  const session = await getAuthSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  const stats = await getAdminStats()

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">Welcome back. Here&apos;s what&apos;s happening.</p>
      </div>

      <AdminStatsCards stats={stats} />

      <div className="mt-8">
        <AdminRecentActivity />
      </div>
    </AdminLayout>
  )
}
