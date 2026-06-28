'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { US_STATES, SPECIALTIES } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function SearchFiltersPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('query') || '')
  const [city, setCity] = useState(searchParams.get('city') || '')
  const [state, setState] = useState(searchParams.get('state') || '')
  const [specialty, setSpecialty] = useState(searchParams.get('specialty') || '')
  const [minRating, setMinRating] = useState(searchParams.get('minRating') || '')
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verifiedOnly') === 'true')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'featured')

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams()
    if (query) params.set('query', query)
    if (city) params.set('city', city)
    if (state) params.set('state', state)
    if (specialty) params.set('specialty', specialty)
    if (minRating) params.set('minRating', minRating)
    if (verifiedOnly) params.set('verifiedOnly', 'true')
    if (sortBy !== 'featured') params.set('sortBy', sortBy)
    router.push(`/realtors?${params.toString()}`)
  }, [query, city, state, specialty, minRating, verifiedOnly, sortBy, router])

  const clearFilters = useCallback(() => {
    setQuery('')
    setCity('')
    setState('')
    setSpecialty('')
    setMinRating('')
    setVerifiedOnly(false)
    setSortBy('featured')
    router.push('/realtors')
  }, [router])

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sticky top-20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Filters</h3>
        </div>
        <button
          onClick={clearFilters}
          className="text-xs text-blue-700 hover:text-blue-900"
        >
          Clear all
        </button>
      </div>

      <div className="space-y-4">
        {/* Search */}
        <Input
          placeholder="Name or keyword..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          className="text-sm"
        />

        {/* City */}
        <Input
          placeholder="City..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="text-sm"
        />

        {/* State */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">State</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All States</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Specialty */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Specialty</label>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Specialties</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Min Rating */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Minimum Rating</label>
          <div className="flex gap-1.5">
            {[3, 3.5, 4, 4.5].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setMinRating(minRating === String(r) ? '' : String(r))}
                className={cn(
                  'flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                  minRating === String(r)
                    ? 'border-blue-900 bg-blue-900 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                {r}+
              </button>
            ))}
          </div>
        </div>

        {/* Verified Only */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-900 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Verified agents only</span>
        </label>

        {/* Sort */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Sort by</label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { value: 'featured', label: 'Featured' },
              { value: 'rating', label: 'Rating' },
              { value: 'reviews', label: 'Reviews' },
              { value: 'recent', label: 'Newest' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSortBy(value)}
                className={cn(
                  'py-1.5 text-xs font-medium rounded-lg border transition-colors',
                  sortBy === value
                    ? 'border-blue-900 bg-blue-900 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={applyFilters}>
          Apply Filters
        </Button>
      </div>
    </div>
  )
}
