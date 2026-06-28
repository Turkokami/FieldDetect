'use client'

import { useState } from 'react'
import { formatRelativeDate } from '@/lib/utils'
import { StarRating } from '@/components/ui/star-rating'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Flag, Eye } from 'lucide-react'
import Link from 'next/link'
import type { ReviewStatus } from '@/types'

interface Review {
  id: string
  overallRating: number
  content: string
  status: ReviewStatus
  isVerified: boolean
  createdAt: Date
  author: { id: string; name: string | null; email: string }
  realtorProfile: { id: string; firstName: string; lastName: string }
}

interface AdminReviewsTableProps {
  reviews: Review[]
}

const statusVariant: Record<ReviewStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'destructive',
  FLAGGED: 'destructive',
}

export function AdminReviewsTable({ reviews: initialReviews }: AdminReviewsTableProps) {
  const [reviews, setReviews] = useState(initialReviews)
  const [filter, setFilter] = useState<ReviewStatus | 'ALL'>('PENDING')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const updateReviewStatus = async (id: string, status: ReviewStatus) => {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        )
      }
    } finally {
      setLoadingId(null)
    }
  }

  const filtered = filter === 'ALL' ? reviews : reviews.filter((r) => r.status === filter)

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === status
                ? 'bg-blue-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            <span className="ml-1.5 text-xs opacity-70">
              ({status === 'ALL' ? reviews.length : reviews.filter((r) => r.status === status).length})
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reviewer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Realtor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Content</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400 text-sm">
                    No reviews found
                  </td>
                </tr>
              ) : (
                filtered.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-xs">{review.author.name || 'Unknown'}</p>
                      <p className="text-gray-400 text-xs">{review.author.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/realtors/${review.realtorProfile.id}`}
                        className="text-blue-700 hover:text-blue-900 text-xs font-medium"
                      >
                        {review.realtorProfile.firstName} {review.realtorProfile.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StarRating rating={review.overallRating} size="sm" showValue />
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-gray-600 line-clamp-2">{review.content}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[review.status]}>
                        {review.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatRelativeDate(review.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {review.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => updateReviewStatus(review.id, 'APPROVED')}
                              disabled={loadingId === review.id}
                              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => updateReviewStatus(review.id, 'REJECTED')}
                              disabled={loadingId === review.id}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => updateReviewStatus(review.id, 'FLAGGED')}
                              disabled={loadingId === review.id}
                              className="p-1.5 rounded-lg text-yellow-600 hover:bg-yellow-50 transition-colors"
                              title="Flag"
                            >
                              <Flag className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
