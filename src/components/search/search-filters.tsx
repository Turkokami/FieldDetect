'use client'

import * as React from 'react'
import { Filter, X, ChevronDown, ChevronUp, BadgeCheck } from 'lucide-react'
import { cn, US_STATES, SPECIALTIES } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StarRating } from '@/components/ui/star-rating'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import type { SearchFilters } from '@/types'

interface SearchFiltersProps {
  filters: SearchFilters
  onChange: (filters: Partial<SearchFilters>) => void
  onApply: () => void
  onClear: () => void
  className?: string
}

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'reviews', label: 'Most Reviews' },
  { value: 'recent', label: 'Recently Active' },
] as const

export function SearchFilters({ filters, onChange, onApply, onClear, className }: SearchFiltersProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [selectedSpecialties, setSelectedSpecialties] = React.useState<string[]>(
    filters.specialty ? [filters.specialty] : []
  )
  const [minRating, setMinRating] = React.useState(filters.minRating ?? 0)

  function handleSpecialtyToggle(specialty: string) {
    setSelectedSpecialties((prev) => {
      const next = prev.includes(specialty)
        ? prev.filter((s) => s !== specialty)
        : [...prev, specialty]
      onChange({ specialty: next[0] })
      return next
    })
  }

  function handleRatingChange(rating: number) {
    const next = rating === minRating ? 0 : rating
    setMinRating(next)
    onChange({ minRating: next || undefined })
  }

  function handleClear() {
    setSelectedSpecialties([])
    setMinRating(0)
    onClear()
  }

  const activeFilterCount = [
    filters.city,
    filters.state,
    filters.zipCode,
    filters.specialty,
    filters.minRating,
    filters.verifiedOnly,
  ].filter(Boolean).length

  const panelContent = (
    <div className="space-y-6">
      {/* Sort by */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Sort By</h3>
        <Select
          value={filters.sortBy || 'featured'}
          onValueChange={(value) => onChange({ sortBy: value as SearchFilters['sortBy'] })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Location</h3>
        <div className="space-y-3">
          <Input
            label="City"
            placeholder="e.g. Austin"
            value={filters.city || ''}
            onChange={(e) => onChange({ city: e.target.value || undefined })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
            <Select
              value={filters.state || ''}
              onValueChange={(value) => onChange({ state: value || undefined })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any State</SelectItem>
                {US_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            label="ZIP Code"
            placeholder="e.g. 78701"
            value={filters.zipCode || ''}
            onChange={(e) => onChange({ zipCode: e.target.value || undefined })}
            maxLength={5}
          />
        </div>
      </div>

      {/* Min Rating */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Minimum Rating</h3>
        <div className="space-y-2">
          {[4, 3, 2, 1].map((r) => (
            <label
              key={r}
              className={cn(
                'flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors',
                minRating === r ? 'bg-navy-50 text-navy-700' : 'hover:bg-gray-50'
              )}
            >
              <input
                type="radio"
                name="minRating"
                value={r}
                checked={minRating === r}
                onChange={() => handleRatingChange(r)}
                className="sr-only"
              />
              <StarRating rating={r} size="sm" readonly />
              <span className="text-sm text-gray-700">{r}+ stars</span>
            </label>
          ))}
          {minRating > 0 && (
            <button
              type="button"
              onClick={() => handleRatingChange(0)}
              className="text-xs text-gray-500 hover:text-navy-600 transition-colors mt-1"
            >
              Clear rating filter
            </button>
          )}
        </div>
      </div>

      {/* Verified Only */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
          <div
            role="checkbox"
            aria-checked={!!filters.verifiedOnly}
            tabIndex={0}
            onClick={() => onChange({ verifiedOnly: !filters.verifiedOnly })}
            onKeyDown={(e) => e.key === ' ' || e.key === 'Enter' ? onChange({ verifiedOnly: !filters.verifiedOnly }) : undefined}
            className={cn(
              'h-5 w-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer',
              filters.verifiedOnly
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-gray-300 hover:border-emerald-400'
            )}
          >
            {filters.verifiedOnly && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <BadgeCheck size={16} className="text-emerald-500" />
            <span className="text-sm font-medium text-gray-700">Verified Realtors Only</span>
          </div>
        </label>
      </div>

      {/* Specialties */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Specialties</h3>
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
          {SPECIALTIES.map((specialty) => {
            const isSelected = selectedSpecialties.includes(specialty)
            return (
              <button
                key={specialty}
                type="button"
                onClick={() => handleSpecialtyToggle(specialty)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  isSelected
                    ? 'bg-navy-600 text-white border-navy-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-navy-300 hover:text-navy-600'
                )}
                aria-pressed={isSelected}
              >
                {specialty}
              </button>
            )
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
        <Button variant="default" className="w-full" onClick={onApply}>
          Apply Filters
          {activeFilterCount > 0 && (
            <span className="ml-1.5 bg-white/20 rounded-full px-1.5 text-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" className="w-full text-gray-500" onClick={handleClear}>
            <X size={15} />
            Clear All Filters
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn('hidden lg:block w-72 shrink-0', className)}>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sticky top-24">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Filter size={16} className="text-navy-600" />
              Filters
            </h2>
            {activeFilterCount > 0 && (
              <span className="text-xs bg-navy-600 text-white rounded-full px-2 py-0.5">
                {activeFilterCount} active
              </span>
            )}
          </div>
          {panelContent}
        </div>
      </aside>

      {/* Mobile filter toggle */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          aria-expanded={mobileOpen}
        >
          <Filter size={16} className="text-navy-600" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-navy-600 text-white rounded-full px-2 py-0.5 text-xs">
              {activeFilterCount}
            </span>
          )}
          {mobileOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {mobileOpen && (
          <div className="mt-3 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            {panelContent}
          </div>
        )}
      </div>
    </>
  )
}
