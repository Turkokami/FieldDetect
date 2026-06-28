'use client'

import * as React from 'react'
import {
  BadgeCheck, MapPin, Building2, Award, TrendingUp, Hash,
  Globe, MessageSquarePlus, Phone, Bookmark, Share2, Flag, Languages,
} from 'lucide-react'

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18} aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}
function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}
function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18} aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/ui/star-rating'
import type { FullRealtorProfile } from '@/types'

interface RealtorProfileHeaderProps {
  profile: FullRealtorProfile
  onLeaveReview?: () => void
  onContact?: () => void
  onSave?: () => void
  onShare?: () => void
  onReport?: () => void
  isSaved?: boolean
}

const socialIcons: Record<string, React.ElementType> = {
  website: Globe,
  linkedin: LinkedinIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  twitter: TwitterIcon,
  youtube: YoutubeIcon,
}

export function RealtorProfileHeader({
  profile,
  onLeaveReview,
  onContact,
  onSave,
  onShare,
  onReport,
  isSaved = false,
}: RealtorProfileHeaderProps) {
  const [saved, setSaved] = React.useState(isSaved)
  const fullName = `${profile.firstName} ${profile.lastName}`

  const socialLinks = [
    profile.website && { key: 'website', href: profile.website, label: 'Website' },
    profile.linkedinUrl && { key: 'linkedin', href: profile.linkedinUrl, label: 'LinkedIn' },
    profile.facebookUrl && { key: 'facebook', href: profile.facebookUrl, label: 'Facebook' },
    profile.instagramUrl && { key: 'instagram', href: profile.instagramUrl, label: 'Instagram' },
    profile.twitterUrl && { key: 'twitter', href: profile.twitterUrl, label: 'Twitter' },
    profile.youtubeUrl && { key: 'youtube', href: profile.youtubeUrl, label: 'YouTube' },
  ].filter(Boolean) as Array<{ key: string; href: string; label: string }>

  function handleSave() {
    setSaved((v) => !v)
    onSave?.()
  }

  return (
    <div className="bg-white">
      {/* Cover photo */}
      <div
        className="h-40 sm:h-56 w-full relative overflow-hidden"
        style={
          profile.coverPhoto
            ? { backgroundImage: `url(${profile.coverPhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
        }
      >
        {!profile.coverPhoto && (
          <div className="absolute inset-0 hero-gradient" />
        )}
      </div>

      {/* Profile section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Avatar + quick info */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-16 pb-6 border-b border-gray-100">
          <div className="relative shrink-0">
            <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full ring-4 ring-white overflow-hidden bg-white shadow-md">
              <Avatar
                src={profile.profilePhoto}
                name={fullName}
                size="2xl"
                className="h-full w-full"
              />
            </div>
            {profile.isVerified && (
              <span
                className="absolute bottom-1 right-1 bg-emerald-500 rounded-full p-1.5 ring-2 ring-white"
                aria-label="Verified realtor"
                title="Verified"
              >
                <BadgeCheck size={16} className="text-white" />
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{fullName}</h1>
                  {profile.isVerified && (
                    <Badge variant="verified">
                      <BadgeCheck size={11} />
                      Verified
                    </Badge>
                  )}
                  {profile.isFeatured && (
                    <Badge variant="featured">Sponsored</Badge>
                  )}
                </div>

                {profile.tagline && (
                  <p className="text-base text-gray-600 italic mb-2">&ldquo;{profile.tagline}&rdquo;</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  {profile.brokerage && (
                    <span className="flex items-center gap-1">
                      <Building2 size={14} aria-hidden="true" />
                      {profile.brokerage.name}
                    </span>
                  )}
                  {(profile.licenseState || profile.licenseNumber) && (
                    <span className="flex items-center gap-1">
                      <Hash size={14} aria-hidden="true" />
                      License:{' '}
                      {[profile.licenseState, profile.licenseNumber].filter(Boolean).join(' ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Rating summary */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 shrink-0">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">
                    {profile.averageRating > 0 ? profile.averageRating.toFixed(1) : '—'}
                  </p>
                  <StarRating rating={profile.averageRating} size="sm" readonly className="justify-center mt-0.5" />
                  <p className="text-xs text-gray-500 mt-1">
                    {formatNumber(profile.reviewCount)} review{profile.reviewCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details row */}
        <div className="py-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Left: specialties, service areas, languages */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {profile.specialties.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Specialties
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.specialties.map((s) => (
                    <Badge key={s} variant="default" size="sm">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.serviceAreas.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Service Areas
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.serviceAreas.map((area) => (
                    <span key={area} className="flex items-center gap-1 text-xs text-gray-600">
                      <MapPin size={11} aria-hidden="true" />
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.languages.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Languages
                </h3>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Languages size={13} aria-hidden="true" />
                  <span>{profile.languages.join(', ')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: stats */}
          <div className="flex flex-wrap sm:flex-nowrap gap-4 lg:gap-6 shrink-0">
            {profile.yearsInBusiness !== null && (
              <div className="text-center bg-navy-50 rounded-xl px-4 py-3">
                <Award size={20} className="text-navy-600 mx-auto mb-1" aria-hidden="true" />
                <p className="text-xl font-bold text-navy-700">{profile.yearsInBusiness}</p>
                <p className="text-xs text-gray-500">Years Exp.</p>
              </div>
            )}
            {profile.numberOfTransactions !== null && (
              <div className="text-center bg-navy-50 rounded-xl px-4 py-3">
                <TrendingUp size={20} className="text-navy-600 mx-auto mb-1" aria-hidden="true" />
                <p className="text-xl font-bold text-navy-700">
                  {formatNumber(profile.numberOfTransactions)}
                </p>
                <p className="text-xs text-gray-500">Transactions</p>
              </div>
            )}
            {profile.totalSalesVolume !== null && (
              <div className="text-center bg-navy-50 rounded-xl px-4 py-3">
                <Building2 size={20} className="text-navy-600 mx-auto mb-1" aria-hidden="true" />
                <p className="text-xl font-bold text-navy-700">
                  {formatCurrency(profile.totalSalesVolume / 1_000_000)}M+
                </p>
                <p className="text-xs text-gray-500">Sales Volume</p>
              </div>
            )}
          </div>
        </div>

        {/* Social links + Action buttons */}
        <div className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Social icons */}
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {socialLinks.map(({ key, href, label }) => {
                const Icon = socialIcons[key] || Globe
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${fullName} on ${label} (opens in new tab)`}
                    className="p-2 rounded-lg text-gray-400 hover:text-navy-600 hover:bg-navy-50 transition-colors"
                  >
                    <Icon size={18} aria-hidden="true" />
                  </a>
                )
              })}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm" onClick={onLeaveReview}>
              <MessageSquarePlus size={15} />
              Leave a Review
            </Button>
            <Button variant="outline" size="sm" onClick={onContact}>
              <Phone size={15} />
              Contact
            </Button>
            <Button
              variant={saved ? 'default' : 'ghost'}
              size="sm"
              onClick={handleSave}
              aria-pressed={saved}
            >
              <Bookmark size={15} className={saved ? 'fill-current' : ''} />
              {saved ? 'Saved' : 'Save'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onShare}>
              <Share2 size={15} />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReport}
              className="text-gray-400 hover:text-red-500 hover:bg-red-50"
            >
              <Flag size={15} />
              Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
