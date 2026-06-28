import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StarRating } from '@/components/ui/star-rating'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Star, Users, Eye, TrendingUp, MessageSquare, Settings, BadgeCheck } from 'lucide-react'
import { formatCurrency, formatRelativeDate } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Realtor Dashboard' }

async function getRealtorDashboardData(userId: string) {
  const realtorProfile = await prisma.realtorProfile.findUnique({
    where: { userId },
    include: {
      reviews: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          author: { select: { id: true, name: true, image: true } },
          photos: true,
        },
      },
      leads: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: {
        select: {
          reviews: { where: { status: 'APPROVED' } },
          leads: true,
        },
      },
    },
  })

  if (!realtorProfile) return null

  const allRatings = await prisma.review.findMany({
    where: { realtorProfileId: realtorProfile.id, status: 'APPROVED' },
    select: { overallRating: true },
  })

  const avgRating =
    allRatings.length > 0
      ? Math.round(
          (allRatings.reduce((s, r) => s + r.overallRating, 0) / allRatings.length) * 10
        ) / 10
      : 0

  return { realtorProfile, avgRating }
}

export default async function RealtorDashboardPage() {
  const session = await getAuthSession()
  if (!session?.user) redirect('/login')

  const data = await getRealtorDashboardData(session.user.id)

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-4">No realtor profile found.</p>
            <Link
              href="/claim-profile"
              className="text-blue-900 font-medium hover:underline"
            >
              Claim or create your profile &rarr;
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const { realtorProfile, avgRating } = data
  const fullName = `${realtorProfile.firstName} ${realtorProfile.lastName}`

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {realtorProfile.firstName}!</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage your profile and leads</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/realtors/${realtorProfile.id}`}
              className="flex items-center gap-2 text-sm font-medium border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              <Eye className="h-4 w-4" />
              View Public Profile
            </Link>
            <Link
              href="/dashboard/realtor/settings"
              className="flex items-center gap-2 text-sm font-medium bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800"
            >
              <Settings className="h-4 w-4" />
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Status Alerts */}
        {!realtorProfile.isVerified && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="font-medium text-yellow-800 text-sm">Profile Not Verified</p>
              <p className="text-yellow-700 text-xs mt-0.5">
                Verify your license to unlock the verified badge and build more trust.
              </p>
            </div>
            <Link
              href="/dashboard/realtor/verify"
              className="text-sm font-medium text-yellow-800 bg-yellow-200 px-3 py-1.5 rounded-lg hover:bg-yellow-300 transition-colors"
            >
              Get Verified
            </Link>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Avg Rating', value: avgRating.toFixed(1), icon: Star, sub: `${realtorProfile._count.reviews} reviews` },
            { label: 'Profile Views', value: realtorProfile.profileViews.toLocaleString(), icon: Eye, sub: 'All time' },
            { label: 'Total Leads', value: realtorProfile._count.leads.toLocaleString(), icon: Users, sub: 'Received' },
            { label: 'Subscription', value: realtorProfile.subscriptionTier, icon: TrendingUp, sub: 'Current plan' },
          ].map(({ label, value, icon: Icon, sub }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <Icon className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Reviews */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Recent Reviews</h2>
              <span className="text-sm text-gray-400">{realtorProfile._count.reviews} total</span>
            </div>

            {realtorProfile.reviews.length === 0 ? (
              <Card className="text-center py-8">
                <Star className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No reviews yet</p>
                <p className="text-sm text-gray-400 mt-1">Share your profile link to collect reviews</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {realtorProfile.reviews.map((review: any) => (
                  <Card key={review.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-sm text-gray-900">
                          {review.author.name || 'Anonymous'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatRelativeDate(review.createdAt)}</p>
                      </div>
                      <StarRating rating={review.overallRating} size="sm" showValue />
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-3">{review.content}</p>
                    {!review.realtorResponse && (
                      <Link
                        href={`/dashboard/realtor/reviews/${review.id}/respond`}
                        className="text-xs text-blue-700 font-medium mt-2 inline-block hover:text-blue-900"
                      >
                        Reply to review &rarr;
                      </Link>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Leads Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Leads</CardTitle>
              </CardHeader>
              <CardContent>
                {realtorProfile.leads.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">No leads yet</p>
                ) : (
                  <div className="space-y-3">
                    {realtorProfile.leads.slice(0, 5).map((lead: any) => (
                      <div key={lead.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                          {!lead.isContacted && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">New</span>
                          )}
                        </div>
                        {lead.email && <p className="text-xs text-gray-400">{lead.email}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{formatRelativeDate(lead.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscription Upgrade */}
            {realtorProfile.subscriptionTier === 'FREE' && (
              <Card className="bg-gradient-to-br from-blue-900 to-blue-700 text-white border-0">
                <p className="font-semibold mb-2">Upgrade to Pro</p>
                <p className="text-xs text-blue-200 mb-4 leading-relaxed">
                  Get featured placement, unlimited leads, and advanced analytics.
                </p>
                <Link
                  href="/pricing"
                  className="block text-center text-sm font-medium bg-yellow-400 text-blue-900 px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
                >
                  See Plans
                </Link>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
