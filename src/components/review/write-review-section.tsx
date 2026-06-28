'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Star, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { StarRating } from '@/components/ui/star-rating'

const reviewSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(50, 'Please write at least 50 characters'),
  overallRating: z.number().min(1, 'Please provide an overall rating').max(5),
  communicationRating: z.number().min(1).max(5).optional(),
  negotiationRating: z.number().min(1).max(5).optional(),
  marketKnowledgeRating: z.number().min(1).max(5).optional(),
  responsivenessRating: z.number().min(1).max(5).optional(),
  professionalismRating: z.number().min(1).max(5).optional(),
  honestyRating: z.number().min(1).max(5).optional(),
  wouldRecommend: z.boolean(),
  transactionType: z.enum(['BUYER', 'SELLER', 'RENTER', 'INVESTOR', 'LANDLORD']),
  transactionDate: z.string().optional(),
  propertyCity: z.string().optional(),
  propertyState: z.string().optional(),
})

type ReviewFormData = z.infer<typeof reviewSchema>

interface WriteReviewSectionProps {
  realtorId: string
  realtorName: string
}

export function WriteReviewSection({ realtorId, realtorName }: WriteReviewSectionProps) {
  const { data: session } = useSession()
  const [isExpanded, setIsExpanded] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      overallRating: 0,
      wouldRecommend: true,
      transactionType: 'BUYER',
    },
  })

  const overallRating = watch('overallRating')
  const wouldRecommend = watch('wouldRecommend')

  const onSubmit = async (data: ReviewFormData) => {
    setError(null)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, realtorProfileId: realtorId }),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Failed to submit review')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (!session?.user) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <Star className="h-8 w-8 text-yellow-400 fill-yellow-400 mx-auto mb-3" />
        <h3 className="font-semibold text-gray-900 mb-2">Share Your Experience</h3>
        <p className="text-sm text-gray-500 mb-4">
          Have you worked with {realtorName}? Sign in to write a review.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-6 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          Sign In to Review
        </Link>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="text-green-600 font-semibold mb-2">Review Submitted!</div>
        <p className="text-sm text-green-700">
          Thank you! We&apos;ve sent a verification email. Please check your inbox to verify your
          review.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
          <span className="font-semibold text-gray-900">Write a Review</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit(onSubmit)} className="border-t border-gray-100 p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Overall Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Rating <span className="text-red-500">*</span>
            </label>
            <StarRating
              rating={overallRating}
              size="lg"
              readonly={false}
              onChange={(r) => setValue('overallRating', r)}
            />
            {errors.overallRating && (
              <p className="text-xs text-red-600 mt-1">{errors.overallRating.message}</p>
            )}
          </div>

          {/* Sub-ratings */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { field: 'communicationRating', label: 'Communication' },
              { field: 'negotiationRating', label: 'Negotiation' },
              { field: 'marketKnowledgeRating', label: 'Market Knowledge' },
              { field: 'responsivenessRating', label: 'Responsiveness' },
              { field: 'professionalismRating', label: 'Professionalism' },
              { field: 'honestyRating', label: 'Honesty' },
            ].map(({ field, label }) => {
              const rating = watch(field as any) || 0
              return (
                <div key={field} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1.5">{label}</p>
                  <StarRating
                    rating={rating}
                    size="sm"
                    readonly={false}
                    onChange={(r) => setValue(field as any, r)}
                  />
                </div>
              )
            })}
          </div>

          {/* Review Title */}
          <Input
            label="Review Title (optional)"
            placeholder="Summarize your experience..."
            {...register('title')}
          />

          {/* Review Content */}
          <Textarea
            label="Your Review"
            placeholder="Tell others about your experience working with this realtor. What did they do well? What could be improved?"
            rows={5}
            error={errors.content?.message}
            {...register('content')}
          />

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I was a... <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(['BUYER', 'SELLER', 'RENTER', 'INVESTOR', 'LANDLORD'] as const).map((type) => (
                <label key={type} className="cursor-pointer">
                  <input
                    type="radio"
                    value={type}
                    {...register('transactionType')}
                    className="sr-only peer"
                  />
                  <span className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 peer-checked:border-blue-900 peer-checked:bg-blue-900 peer-checked:text-white transition-colors">
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Location & Date */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Property City (optional)"
              placeholder="e.g. Austin"
              {...register('propertyCity')}
            />
            <Input
              label="Transaction Year (optional)"
              type="number"
              placeholder="e.g. 2024"
              {...register('transactionDate')}
            />
          </div>

          {/* Would Recommend */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Would you recommend this realtor?
            </label>
            <div className="flex gap-3">
              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="radio"
                  value="true"
                  checked={wouldRecommend}
                  onChange={() => setValue('wouldRecommend', true)}
                  className="text-blue-900"
                />
                <span className="text-sm text-green-700 font-medium">Yes, I would</span>
              </label>
              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="radio"
                  value="false"
                  checked={!wouldRecommend}
                  onChange={() => setValue('wouldRecommend', false)}
                  className="text-blue-900"
                />
                <span className="text-sm text-red-600 font-medium">No, I would not</span>
              </label>
            </div>
          </div>

          <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
            Submit Review
          </Button>
        </form>
      )}
    </div>
  )
}
