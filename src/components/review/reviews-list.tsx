import { ReviewCard } from './review-card'
import type { ReviewWithDetails } from '@/types'

interface ReviewsListProps {
  reviews: ReviewWithDetails[]
}

export function ReviewsList({ reviews }: ReviewsListProps) {
  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500 font-medium">No reviews yet</p>
        <p className="text-gray-400 text-sm mt-1">Be the first to share your experience!</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Reviews ({reviews.length})
      </h2>
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  )
}
