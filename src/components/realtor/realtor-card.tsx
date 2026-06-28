'use client'

import * as React from 'react'
import Link from 'next/link'
import { MapPin, Heart, BadgeCheck, Clock, MessageSquarePlus, Eye, Star as StarIcon } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/ui/star-rating'
import type { RealtorSearchResult } from '@/types'

interface RealtorCardProps {
  realtor: RealtorSearchResult
  onFavorite?: (id: string, isFavorited: boolean) => void
  isFavorited?: boolean
  className?: string
}

export function RealtorCard({ realtor, onFavorite, isFavorited = false, className }: RealtorCardProps) {
  const [favorited, setFavorited] = React.useState(isFavorited)

  const fullName = `${realtor.firstName} ${realtor.lastName}`
  const displaySpecialties = realtor.specialties.slice(0, 3)
  const hasMoreSpecialties = realtor.specialties.length > 3

  function handleFavorite(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = !favorited
    setFavorited(next)
    onFavorite?.(realtor.id, next)
  }

  return (
    <article
      className={cn(
        'realtor-card bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col',
        realtor.isFeatured && 'ring-2 ring-gold-400',
        className
      )}
    >
      {/* Featured / Sponsored banner */}
      {realtor.isFeatured && (
        <div className="bg-gold-500 text-white text-xs font-semibold px-3 py-1 flex items-center gap-1.5">
          <StarIcon size={11} className="fill-white" />
          Sponsored
        </div>
      )}

      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Header row */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <Avatar
              src={realtor.profilePhoto}
              name={fullName}
              size="lg"
            />
            {realtor.isVerified && (
              <span
                className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5"
                aria-label="Verified realtor"
                title="Verified realtor"
              >
                <BadgeCheck size={14} className="text-white fill-white" />
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">
                  {fullName}
                </h3>
                {realtor.brokerageName && (
                  <p className="text-sm text-gray-500 truncate mt-0.5">{realtor.brokerageName}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleFavorite}
                aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                aria-pressed={favorited}
                className={cn(
                  'p-1.5 rounded-lg transition-colors shrink-0',
                  favorited
                    ? 'text-red-500 hover:text-red-600 bg-red-50'
                    : 'text-gray-300 hover:text-red-400 hover:bg-red-50'
                )}
              >
                <Heart size={18} className={favorited ? 'fill-current' : ''} />
              </button>
            </div>

            {/* Location */}
            {(realtor.city || realtor.state) && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                <MapPin size={12} aria-hidden="true" />
                <span>{[realtor.city, realtor.state].filter(Boolean).join(', ')}</span>
              </div>
            )}

            {/* Rating row */}
            <div className="flex items-center gap-2 mt-2">
              <StarRating rating={realtor.averageRating} size="sm" readonly />
              <span className="text-sm font-semibold text-gray-800">
                {realtor.averageRating > 0 ? realtor.averageRating.toFixed(1) : 'New'}
              </span>
              {realtor.reviewCount > 0 && (
                <span className="text-xs text-gray-500">
                  ({formatNumber(realtor.reviewCount)} review{realtor.reviewCount !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5">
          {realtor.isVerified && (
            <Badge variant="verified">
              <BadgeCheck size={11} />
              Verified
            </Badge>
          )}
          {realtor.yearsInBusiness !== null && realtor.yearsInBusiness > 0 && (
            <Badge variant="gray">
              <Clock size={11} />
              {realtor.yearsInBusiness} yr{realtor.yearsInBusiness !== 1 ? 's' : ''} exp.
            </Badge>
          )}
        </div>

        {/* Specialties */}
        {displaySpecialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {displaySpecialties.map((specialty) => (
              <Badge key={specialty} variant="default" size="sm">
                {specialty}
              </Badge>
            ))}
            {hasMoreSpecialties && (
              <Badge variant="gray" size="sm">
                +{realtor.specialties.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex gap-2 mt-auto pt-2">
          <Link href={`/realtors/${realtor.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <Eye size={14} />
              View Profile
            </Button>
          </Link>
          <Link href={`/realtors/${realtor.id}#review`} className="flex-1">
            <Button variant="default" size="sm" className="w-full">
              <MessageSquarePlus size={14} />
              Leave a Review
            </Button>
          </Link>
        </div>
      </div>
    </article>
  )
}
