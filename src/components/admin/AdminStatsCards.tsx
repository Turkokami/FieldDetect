import { Users, Star, Flag, BadgeCheck, Home, DollarSign, TrendingUp, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { AdminStats } from '@/types'

interface AdminStatsCardsProps {
  stats: AdminStats
}

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  const cards = [
    {
      label: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      change: `+${stats.newUsersThisMonth} this month`,
      icon: Users,
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Total Realtors',
      value: stats.totalRealtors.toLocaleString(),
      change: `${stats.pendingVerifications} pending verification`,
      icon: BadgeCheck,
      color: 'bg-green-50 text-green-700',
    },
    {
      label: 'Total Reviews',
      value: stats.totalReviews.toLocaleString(),
      change: `+${stats.newReviewsThisMonth} this month`,
      icon: Star,
      color: 'bg-yellow-50 text-yellow-700',
    },
    {
      label: 'Pending Reviews',
      value: stats.pendingReviews.toLocaleString(),
      change: 'Awaiting moderation',
      icon: Clock,
      color: 'bg-orange-50 text-orange-700',
      urgent: stats.pendingReviews > 0,
    },
    {
      label: 'Flagged Content',
      value: stats.flaggedContent.toLocaleString(),
      change: 'Requires attention',
      icon: Flag,
      color: 'bg-red-50 text-red-700',
      urgent: stats.flaggedContent > 0,
    },
    {
      label: 'Active Listings',
      value: stats.totalListings.toLocaleString(),
      change: 'Home listings',
      icon: Home,
      color: 'bg-purple-50 text-purple-700',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      change: 'All-time subscription revenue',
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Verifications',
      value: stats.pendingVerifications.toLocaleString(),
      change: 'Pending review',
      icon: TrendingUp,
      color: 'bg-indigo-50 text-indigo-700',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, change, icon: Icon, color, urgent }) => (
        <div
          key={label}
          className={`bg-white rounded-xl border p-5 shadow-sm ${
            urgent ? 'border-red-200' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <div className={`rounded-lg p-2 ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className={`text-xs mt-1 ${urgent ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
            {change}
          </p>
        </div>
      ))}
    </div>
  )
}
