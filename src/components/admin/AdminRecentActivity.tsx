import { prisma } from '@/lib/db'
import { formatRelativeDate } from '@/lib/utils'
import Link from 'next/link'

async function getRecentActivity() {
  const [recentReviews, recentUsers, recentRealtors] = await Promise.all([
    prisma.review.findMany({
      where: { status: 'PENDING' },
      include: {
        author: { select: { name: true, email: true } },
        realtorProfile: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.realtorProfile.findMany({
      where: { verificationStatus: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, firstName: true, lastName: true, createdAt: true, verificationStatus: true },
    }),
  ])

  return { recentReviews, recentUsers, recentRealtors }
}

export async function AdminRecentActivity() {
  const { recentReviews, recentUsers, recentRealtors } = await getRecentActivity()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Pending Reviews */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">Pending Reviews</h3>
          <Link href="/admin/reviews" className="text-xs text-blue-700 hover:text-blue-900">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentReviews.length === 0 ? (
            <p className="p-4 text-sm text-gray-400 text-center">No pending reviews</p>
          ) : (
            recentReviews.map((review) => (
              <div key={review.id} className="p-4">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {review.author.name} &rarr; {review.realtorProfile.firstName}{' '}
                  {review.realtorProfile.lastName}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-yellow-600 font-medium">
                    {review.overallRating}/5 stars
                  </span>
                  <span className="text-xs text-gray-400">{formatRelativeDate(review.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">New Users</h3>
          <Link href="/admin/users" className="text-xs text-blue-700 hover:text-blue-900">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentUsers.map((user) => (
            <div key={user.id} className="p-4">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name || user.email}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {user.role}
                </span>
                <span className="text-xs text-gray-400">{formatRelativeDate(user.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Verifications */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">Pending Verifications</h3>
          <Link href="/admin/realtors" className="text-xs text-blue-700 hover:text-blue-900">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentRealtors.length === 0 ? (
            <p className="p-4 text-sm text-gray-400 text-center">No pending verifications</p>
          ) : (
            recentRealtors.map((realtor) => (
              <div key={realtor.id} className="p-4">
                <Link
                  href={`/admin/realtors/${realtor.id}`}
                  className="text-sm font-medium text-gray-900 hover:text-blue-900"
                >
                  {realtor.firstName} {realtor.lastName}
                </Link>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                    {realtor.verificationStatus}
                  </span>
                  <span className="text-xs text-gray-400">{formatRelativeDate(realtor.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
