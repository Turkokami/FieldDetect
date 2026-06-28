import { notFound } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { RealtorProfileHeader } from '@/components/realtor/realtor-profile-header'
import { ReviewsList } from '@/components/review/reviews-list'
import { WriteReviewSection } from '@/components/review/write-review-section'
import type { Metadata } from 'next'

interface RealtorPageProps {
  params: { id: string }
}

async function getRealtorProfile(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/realtors/${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export async function generateMetadata({ params }: RealtorPageProps): Promise<Metadata> {
  const realtor = await getRealtorProfile(params.id)
  if (!realtor) return { title: 'Realtor Not Found' }

  return {
    title: `${realtor.firstName} ${realtor.lastName} - Real Estate Agent Reviews`,
    description: `Read verified reviews for ${realtor.firstName} ${realtor.lastName}. Average rating: ${realtor.averageRating}/5 from ${realtor.reviewCount} reviews.`,
  }
}

export default async function RealtorProfilePage({ params }: RealtorPageProps) {
  const realtor = await getRealtorProfile(params.id)
  if (!realtor) notFound()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1">
        <RealtorProfileHeader profile={realtor} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* About */}
              {realtor.bio && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
                  <p className="text-gray-600 leading-relaxed text-sm">{realtor.bio}</p>
                </div>
              )}

              {/* Write a Review */}
              <WriteReviewSection realtorId={realtor.id} realtorName={`${realtor.firstName} ${realtor.lastName}`} />

              {/* Reviews */}
              <ReviewsList reviews={realtor.reviews} />
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Specialties */}
              {realtor.specialties.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {realtor.specialties.map((s: string) => (
                      <span key={s} className="text-xs bg-blue-50 text-blue-800 px-2.5 py-1 rounded-full font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Areas */}
              {realtor.serviceAreas.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Service Areas</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {realtor.serviceAreas.map((area: string) => (
                      <span key={area} className="text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {realtor.languages.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Languages</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {realtor.languages.map((lang: string) => (
                      <span key={lang} className="text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              {(realtor.numberOfTransactions || realtor.totalSalesVolume) && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Track Record</h3>
                  <div className="space-y-2">
                    {realtor.numberOfTransactions && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Transactions</span>
                        <span className="font-semibold text-gray-900">{realtor.numberOfTransactions}</span>
                      </div>
                    )}
                    {realtor.totalSalesVolume && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total Sales Volume</span>
                        <span className="font-semibold text-gray-900">
                          ${(realtor.totalSalesVolume / 1_000_000).toFixed(1)}M
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
