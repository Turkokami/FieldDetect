import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ReviewCard } from '@/components/review/review-card'
import Link from 'next/link'
import { Search, Star, Home, MessageSquare } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard - Homeowner' }

async function getHomeownerData(userId: string) {
  const [reviews, listings, favoriteRealtors] = await Promise.all([
    prisma.review.findMany({
      where: { authorId: userId },
      include: {
        realtorProfile: { select: { id: true, firstName: true, lastName: true } },
        photos: true,
        author: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.homeListing.findMany({
      where: { homeownerId: userId },
      include: { _count: { select: { proposals: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.favoriteRealtor.findMany({
      where: { userId },
      include: {
        realtor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            isVerified: true,
          },
        },
      },
      take: 5,
    }),
  ])

  return { reviews, listings, favoriteRealtors }
}

export default async function HomeownerDashboardPage() {
  const session = await getAuthSession()
  if (!session?.user) redirect('/login')

  const { reviews, listings, favoriteRealtors } = await getHomeownerData(session.user.id)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session.user.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Manage your reviews and listings</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { href: '/realtors', icon: Search, label: 'Find Realtors', color: 'bg-blue-50 text-blue-900 border-blue-100' },
            { href: '/listings/new', icon: Home, label: 'List Your Home', color: 'bg-green-50 text-green-900 border-green-100' },
            { href: '/messages', icon: MessageSquare, label: 'Messages', color: 'bg-purple-50 text-purple-900 border-purple-100' },
            { href: '#favorites', icon: Star, label: 'Saved Realtors', color: 'bg-yellow-50 text-yellow-900 border-yellow-100' },
          ].map(({ href, icon: Icon, label, color }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center hover:shadow-sm transition-shadow ${color}`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reviews */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Your Reviews</h2>
              <span className="text-sm text-gray-400">{reviews.length} total</span>
            </div>

            {reviews.length === 0 ? (
              <Card className="text-center py-8">
                <Star className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No reviews yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Find a realtor and share your experience
                </p>
                <Link
                  href="/realtors"
                  className="mt-4 inline-block text-sm text-blue-700 font-medium hover:text-blue-900"
                >
                  Browse Realtors &rarr;
                </Link>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviews.slice(0, 5).map((review: any) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Listings */}
            <Card>
              <CardHeader>
                <CardTitle>Your Listings</CardTitle>
              </CardHeader>
              <CardContent>
                {listings.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400">No listings yet</p>
                    <Link
                      href="/listings/new"
                      className="mt-2 inline-block text-sm text-blue-700 font-medium"
                    >
                      Create a listing &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {listings.map((listing: any) => (
                      <div key={listing.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {listing.city}, {listing.state}
                          </p>
                          <p className="text-xs text-gray-400">{listing._count.proposals} proposals</p>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            listing.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {listing.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saved Realtors */}
            <Card id="favorites">
              <CardHeader>
                <CardTitle>Saved Realtors</CardTitle>
              </CardHeader>
              <CardContent>
                {favoriteRealtors.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">No saved realtors</p>
                ) : (
                  <div className="space-y-3">
                    {favoriteRealtors.map((fav: any) => (
                      <Link
                        key={fav.id}
                        href={`/realtors/${fav.realtor.id}`}
                        className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1 -mx-1 transition-colors"
                      >
                        <div className="h-8 w-8 bg-blue-900 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {fav.realtor.firstName[0]}{fav.realtor.lastName[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {fav.realtor.firstName} {fav.realtor.lastName}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
