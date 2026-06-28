import { RealtorCard } from './realtor-card'
import type { RealtorSearchResult } from '@/types'

interface RealtorSearchResultsProps {
  searchParams: {
    query?: string
    city?: string
    state?: string
    specialty?: string
    minRating?: string
    verifiedOnly?: string
    sortBy?: string
    page?: string
  }
}

async function fetchRealtors(searchParams: RealtorSearchResultsProps['searchParams']) {
  const params = new URLSearchParams()
  if (searchParams.query) params.set('query', searchParams.query)
  if (searchParams.city) params.set('city', searchParams.city)
  if (searchParams.state) params.set('state', searchParams.state)
  if (searchParams.specialty) params.set('specialty', searchParams.specialty)
  if (searchParams.minRating) params.set('minRating', searchParams.minRating)
  if (searchParams.verifiedOnly) params.set('verifiedOnly', searchParams.verifiedOnly)
  if (searchParams.sortBy) params.set('sortBy', searchParams.sortBy)
  if (searchParams.page) params.set('page', searchParams.page)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/realtors?${params.toString()}`, {
    cache: 'no-store',
  })

  if (!res.ok) return { realtors: [], total: 0, page: 1, totalPages: 0 }
  return res.json()
}

export async function RealtorSearchResults({ searchParams }: RealtorSearchResultsProps) {
  const data = await fetchRealtors(searchParams)
  const { realtors, total, page, totalPages } = data

  if (realtors.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-500 text-lg font-medium">No realtors found</p>
        <p className="text-gray-400 text-sm mt-2">
          Try adjusting your search filters or expanding your search area.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Showing <span className="font-medium text-gray-900">{realtors.length}</span> of{' '}
        <span className="font-medium text-gray-900">{total}</span> realtors
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {realtors.map((realtor: RealtorSearchResult & { averageRating: number; reviewCount: number; brokerageName?: string | null }) => (
          <RealtorCard key={realtor.id} realtor={realtor} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }).map((_, i) => (
            <a
              key={i}
              href={`?${new URLSearchParams({ ...searchParams, page: String(i + 1) }).toString()}`}
              className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                page === i + 1
                  ? 'bg-blue-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-200'
              }`}
            >
              {i + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
