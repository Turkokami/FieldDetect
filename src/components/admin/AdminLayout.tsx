'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Star, Users, BadgeCheck, Flag, BarChart3, Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/realtors', label: 'Realtors', icon: BadgeCheck },
  { href: '/admin/verification', label: 'Verification', icon: BadgeCheck },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
]

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-[#0f172a] text-gray-300 flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-700/50">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
              <Home className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-white">
              Rate<span className="text-[#d4a017]">My</span>Realtor
            </span>
          </Link>
          <p className="text-xs text-gray-500 mt-1 ml-9">Admin Panel</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#1e3a5f] text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-gray-700/50">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-800"
          >
            ← Back to site
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
