'use client'

import * as React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
  onChange?: (rating: number) => void
  showValue?: boolean
  className?: string
  label?: string
}

const sizeMap = {
  sm: { star: 12, gap: 'gap-0.5', text: 'text-xs' },
  md: { star: 18, gap: 'gap-1', text: 'text-sm' },
  lg: { star: 24, gap: 'gap-1.5', text: 'text-base' },
}

export function StarRating({
  rating,
  size = 'md',
  readonly = true,
  onChange,
  showValue = false,
  className,
  label,
}: StarRatingProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const { star: starSize, gap, text } = sizeMap[size]

  const displayRating = hovered !== null ? hovered : rating

  function handleClick(value: number) {
    if (!readonly && onChange) {
      onChange(value)
    }
  }

  function getStarFill(starIndex: number): 'full' | 'half' | 'empty' {
    const effective = displayRating
    if (effective >= starIndex) return 'full'
    if (effective >= starIndex - 0.5) return 'half'
    return 'empty'
  }

  return (
    <div
      className={cn('flex items-center', gap, className)}
      role={readonly ? 'img' : 'radiogroup'}
      aria-label={label || `Rating: ${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = getStarFill(star)
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(null)}
            className={cn(
              'focus:outline-none relative',
              !readonly && 'cursor-pointer hover:scale-110 transition-transform duration-100',
              readonly && 'cursor-default pointer-events-none'
            )}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            role={readonly ? undefined : 'radio'}
            aria-checked={readonly ? undefined : rating === star}
          >
            {fill === 'half' ? (
              <span className="relative inline-block" style={{ width: starSize, height: starSize }}>
                <Star
                  size={starSize}
                  className="text-gray-200 fill-gray-200 absolute inset-0"
                />
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: '50%' }}
                >
                  <Star size={starSize} className="text-gold-500 fill-gold-500" />
                </span>
              </span>
            ) : (
              <Star
                size={starSize}
                className={cn(
                  'transition-colors duration-100',
                  fill === 'full'
                    ? 'text-gold-500 fill-gold-500'
                    : 'text-gray-200 fill-gray-200'
                )}
              />
            )}
          </button>
        )
      })}
      {showValue && (
        <span className={cn('font-semibold text-gray-700 ml-1', text)}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
