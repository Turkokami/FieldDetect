import { Suspense } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { RealtorSearchResults } from '@/components/realtor/realtor-search-results'
import { SearchFiltersPanel } from '@/components/search/search-filters-panel'

interface SearchPageProps {
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

export default function RealtorsSearchPage({ searchParams }: SearchPageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Find a Realtor</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Search and compare verified real estate agents in your area
          </p>
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <Suspense fallback={<div className="bg-white rounded-xl border border-gray-200 h-96 animate-pulse" />}>
              <SearchFiltersPanel />
            </Suspense>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            <Suspense
              fallback={
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 h-48 animate-pulse" />
                  ))}
                </div>
              }
            >
              <RealtorSearchResults searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
