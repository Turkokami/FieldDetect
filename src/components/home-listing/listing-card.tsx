import * as React from 'react'
import Link from 'next/link'
import { MapPin, Home, BedDouble, Bath, Ruler, Clock, Users, Calendar, TrendingUp } from 'lucide-react'
import { cn, formatCurrency, formatRelativeDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { HomeListingWithDetails } from '@/types'

interface ListingCardProps {
  listing: HomeListingWithDetails
  isRealtor?: boolean
  className?: string
}

const PROPERTY_TYPE_ICONS: Record<string, React.ElementType> = {
  default: Home,
}

const TIMELINE_LABELS: Record<string, string> = {
  ASAP: 'As Soon As Possible',
  '1_3_MONTHS': '1-3 Months',
  '3_6_MONTHS': '3-6 Months',
  '6_12_MONTHS': '6-12 Months',
  '12_PLUS_MONTHS': '12+ Months',
  FLEXIBLE: 'Flexible',
}

export function ListingCard({ listing, isRealtor = false, className }: ListingCardProps) {
  const locationStr = [listing.city, listing.state].filter(Boolean).join(', ')
  const daysListed = Math.floor(
    (Date.now() - new Date(listing.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  const timelineLabel = listing.desiredTimeline
    ? TIMELINE_LABELS[listing.desiredTimeline] || listing.desiredTimeline
    : null

  return (
    <article
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden',
        'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        className
      )}
    >
      {/* Header strip */}
      <div className="bg-navy-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Home size={16} aria-hidden="true" />
          <span className="text-sm font-semibold">{listing.propertyType}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="featured" size="sm">
            {listing.proposalCount} Proposal{listing.proposalCount !== 1 ? 's' : ''}
          </Badge>
          <span className="text-xs text-navy-200 flex items-center gap-1">
            <Calendar size={12} aria-hidden="true" />
            {daysListed === 0 ? 'Today' : `${daysListed}d ago`}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Location */}
        <div>
          <div className="flex items-center gap-1.5 text-gray-900 font-semibold text-lg">
            <MapPin size={16} className="text-navy-600 shrink-0" aria-hidden="true" />
            <span>{locationStr}</span>
          </div>
          {listing.zipCode && (
            <p className="text-sm text-gray-500 mt-0.5 ml-6">ZIP: {listing.zipCode}</p>
          )}
        </div>

        {/* Property details */}
        {(listing.bedrooms || listing.bathrooms || listing.sqFt) && (
          <div className="flex flex-wrap gap-3">
            {listing.bedrooms && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <BedDouble size={15} className="text-gray-400" aria-hidden="true" />
                <span>{listing.bedrooms} bed{listing.bedrooms !== 1 ? 's' : ''}</span>
              </div>
            )}
            {listing.bathrooms && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Bath size={15} className="text-gray-400" aria-hidden="true" />
                <span>{listing.bathrooms} bath{listing.bathrooms !== 1 ? 's' : ''}</span>
              </div>
            )}
            {listing.sqFt && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Ruler size={15} className="text-gray-400" aria-hidden="true" />
                <span>{listing.sqFt.toLocaleString()} sqft</span>
              </div>
            )}
          </div>
        )}

        {/* Estimated value */}
        {listing.estimatedValue && (
          <div className="flex items-center gap-1.5">
            <TrendingUp size={16} className="text-emerald-600 shrink-0" aria-hidden="true" />
            <span className="text-sm text-gray-600">Est. value: </span>
            <span className="text-sm font-semibold text-emerald-700">
              {formatCurrency(listing.estimatedValue * 0.9)} – {formatCurrency(listing.estimatedValue * 1.1)}
            </span>
          </div>
        )}

        {/* Timeline */}
        {timelineLabel && (
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-gray-400 shrink-0" aria-hidden="true" />
            <span className="text-sm text-gray-600">Timeline: </span>
            <span className="text-sm font-medium text-gray-800">{timelineLabel}</span>
          </div>
        )}

        {/* Description preview */}
        {listing.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{listing.description}</p>
        )}

        {/* Needs badges */}
        <div className="flex flex-wrap gap-1.5">
          {listing.needsRepairs && <Badge variant="pending">Needs Repairs</Badge>}
          {listing.needsStaging && <Badge variant="default">Needs Staging</Badge>}
          {listing.needsPhotography && <Badge variant="default">Needs Photography</Badge>}
        </div>

        {/* Proposals count */}
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Users size={14} aria-hidden="true" />
          <span>
            <strong className="text-gray-900">{listing.proposalCount}</strong> realtor
            {listing.proposalCount !== 1 ? 's have' : ' has'} submitted a proposal
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-2 pt-1">
          <Link href={`/listings/${listing.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
          {isRealtor && (
            <Link href={`/listings/${listing.id}/propose`} className="flex-1">
              <Button variant="default" size="sm" className="w-full">
                Submit Proposal
              </Button>
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
