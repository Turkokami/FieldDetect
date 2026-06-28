'use client'

import * as React from 'react'
import { ThumbsUp, Flag, ChevronDown, ChevronUp, CheckCircle2, Building2, MessageSquare } from 'lucide-react'
import { cn, formatRelativeDate, getTransactionTypeLabel, formatDate } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { StarRating } from '@/components/ui/star-rating'
import type { ReviewWithDetails } from '@/types'

interface SubRatingProps {
  label: string
  value: number | null
}

function SubRating({ label, value }: SubRatingProps) {
  if (!value) return null
  const percent = (value / 5) * 100
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-36 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gold-400"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={1}
          aria-valuemax={5}
          aria-label={`${label}: ${value} out of 5`}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 w-6 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

interface ReviewCardProps {
  review: ReviewWithDetails
  onHelpful?: (id: string) => void
  onReport?: (id: string) => void
  hasMarkedHelpful?: boolean
  className?: string
}

export function ReviewCard({ review, onHelpful, onReport, hasMarkedHelpful = false, className }: ReviewCardProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [helpfulMarked, setHelpfulMarked] = React.useState(hasMarkedHelpful)
  const [helpfulCount, setHelpfulCount] = React.useState(0)

  const TRUNCATE_LENGTH = 300
  const shouldTruncate = review.content.length > TRUNCATE_LENGTH
  const displayContent = shouldTruncate && !expanded
    ? review.content.slice(0, TRUNCATE_LENGTH) + '…'
    : review.content

  function handleHelpful() {
    const next = !helpfulMarked
    setHelpfulMarked(next)
    setHelpfulCount((c) => next ? c + 1 : c - 1)
    onHelpful?.(review.id)
  }

  const subRatings: Array<{ label: string; value: number | null }> = [
    { label: 'Communication', value: review.communicationRating },
    { label: 'Negotiation', value: review.negotiationRating },
    { label: 'Market Knowledge', value: review.marketKnowledgeRating },
    { label: 'Responsiveness', value: review.responsivenessRating },
    { label: 'Professionalism', value: review.professionalismRating },
    { label: 'Honesty', value: review.honestyRating },
  ].filter((r) => r.value !== null)

  return (
    <article
      className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6', className)}
      aria-label={`Review by ${review.author.name || 'Anonymous'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <Avatar
            src={review.author.image}
            name={review.author.name || 'Anonymous'}
            size="md"
            className="shrink-0"
          />
          <div>
            <p className="font-semibold text-gray-900">
              {review.author.name || 'Anonymous User'}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <Badge variant="blue" size="sm">
                {getTransactionTypeLabel(review.transactionType)}
              </Badge>
              {review.propertyCity && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Building2 size={11} aria-hidden="true" />
                  {[review.propertyCity, review.propertyState].filter(Boolean).join(', ')}
                </span>
              )}
              <span className="text-xs text-gray-400">
                {formatRelativeDate(review.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <StarRating rating={review.overallRating} size="md" readonly />
          <span className="text-lg font-bold text-gray-900">{review.overallRating.toFixed(1)}</span>
        </div>
      </div>

      {/* Review title + content */}
      {review.title && (
        <h3 className="font-semibold text-gray-900 mb-2">{review.title}</h3>
      )}
      <p className="text-sm text-gray-700 leading-relaxed">{displayContent}</p>
      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-sm font-medium text-navy-600 hover:text-navy-700 flex items-center gap-1 transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? (
            <><ChevronUp size={14} />Show less</>
          ) : (
            <><ChevronDown size={14} />Read more</>
          )}
        </button>
      )}

      {/* Sub-ratings */}
      {subRatings.length > 0 && (
        <div className="mt-4 space-y-2 bg-gray-50 rounded-lg p-3">
          {subRatings.map((r) => (
            <SubRating key={r.label} label={r.label} value={r.value} />
          ))}
        </div>
      )}

      {/* Would Recommend */}
      {review.wouldRecommend && (
        <div className="mt-4 flex items-center gap-2 text-emerald-700 text-sm font-medium">
          <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
          Would recommend this realtor
        </div>
      )}

      {/* Photos */}
      {review.photos.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {review.photos.map((photo) => (
            <div
              key={photo.id}
              className="h-16 w-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption || 'Review photo'}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {/* Realtor response */}
      {review.realtorResponse && (
        <div className="mt-4 ml-4 pl-4 border-l-2 border-navy-200 bg-navy-50 rounded-r-lg py-3 pr-3">
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare size={14} className="text-navy-600" aria-hidden="true" />
            <span className="text-xs font-semibold text-navy-700">Realtor Response</span>
            {review.respondedAt && (
              <span className="text-xs text-gray-400 ml-auto">
                {formatDate(review.respondedAt)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{review.realtorResponse}</p>
        </div>
      )}

      {/* Footer actions */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <button
          type="button"
          onClick={handleHelpful}
          aria-pressed={helpfulMarked}
          className={cn(
            'flex items-center gap-1.5 text-sm transition-colors',
            helpfulMarked
              ? 'text-navy-600 font-medium'
              : 'text-gray-500 hover:text-navy-600'
          )}
        >
          <ThumbsUp size={14} className={helpfulMarked ? 'fill-current' : ''} />
          Helpful{helpfulCount > 0 && ` (${helpfulCount})`}
        </button>

        <button
          type="button"
          onClick={() => onReport?.(review.id)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          <Flag size={12} />
          Report
        </button>
      </div>
    </article>
  )
}
