/**
 * External Reputation Aggregation Module
 *
 * This module aggregates publicly available reputation data about realtors
 * from online sources using official APIs where available.
 *
 * COMPLIANCE NOTES:
 * - Only uses official APIs or publicly accessible data
 * - Never bypasses paywalls, logins, CAPTCHAs, or robots.txt
 * - Respects website Terms of Service
 * - Stores source URLs and timestamps for transparency
 * - All data is subject to admin approval before display
 * - Clearly labeled as "External Web Reputation Summary" on profiles
 * - Realtors can dispute inaccurate data
 */

import { prisma } from './db'

export interface ReputationSource {
  name: string
  url: string
  rating?: number
  reviewCount?: number
  rawData?: Record<string, unknown>
  confidenceScore: number
}

export interface ReputationSummaryResult {
  realtorId: string
  sources: ReputationSource[]
  summary: string
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MIXED'
  keyThemes: string[]
  generatedAt: Date
}

// Official API integrations - add API keys to env vars
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY
const YELP_API_KEY = process.env.YELP_FUSION_API_KEY

/**
 * Search Google Places API for realtor business listings
 * Uses official Google Places API - compliant and legal
 */
async function fetchGooglePlacesData(
  realtorName: string,
  city: string,
  state: string
): Promise<ReputationSource | null> {
  if (!GOOGLE_PLACES_API_KEY) return null

  try {
    const query = encodeURIComponent(`${realtorName} realtor ${city} ${state}`)
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&type=real_estate_agency&key=${GOOGLE_PLACES_API_KEY}`

    const response = await fetch(url)
    if (!response.ok) return null

    const data = (await response.json()) as {
      results?: Array<{
        name: string
        rating?: number
        user_ratings_total?: number
        place_id?: string
      }>
    }

    const place = data.results?.[0]
    if (!place) return null

    return {
      name: 'Google Business Profile',
      url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      rating: place.rating,
      reviewCount: place.user_ratings_total,
      confidenceScore: 0.85,
      rawData: {
        name: place.name,
        rating: place.rating,
        totalRatings: place.user_ratings_total,
      },
    }
  } catch {
    return null
  }
}

/**
 * Fetch Yelp business data via official Fusion API
 * Uses official Yelp Fusion API - compliant and legal
 */
async function fetchYelpData(
  realtorName: string,
  city: string,
  state: string
): Promise<ReputationSource | null> {
  if (!YELP_API_KEY) return null

  try {
    const params = new URLSearchParams({
      term: `${realtorName} real estate`,
      location: `${city}, ${state}`,
      categories: 'realestate',
      limit: '1',
    })

    const response = await fetch(`https://api.yelp.com/v3/businesses/search?${params}`, {
      headers: { Authorization: `Bearer ${YELP_API_KEY}` },
    })

    if (!response.ok) return null

    const data = (await response.json()) as {
      businesses?: Array<{
        name: string
        rating?: number
        review_count?: number
        url?: string
      }>
    }

    const business = data.businesses?.[0]
    if (!business) return null

    return {
      name: 'Yelp',
      url: business.url ?? '',
      rating: business.rating,
      reviewCount: business.review_count,
      confidenceScore: 0.75,
      rawData: {
        name: business.name,
        rating: business.rating,
        reviewCount: business.review_count,
      },
    }
  } catch {
    return null
  }
}

/**
 * Generate a summary from collected reputation sources
 */
function generateSummary(
  realtorName: string,
  sources: ReputationSource[]
): { summary: string; sentiment: ReputationSummaryResult['sentiment']; keyThemes: string[] } {
  if (sources.length === 0) {
    return {
      summary: `No external reputation data found for ${realtorName}.`,
      sentiment: 'NEUTRAL',
      keyThemes: [],
    }
  }

  const avgRating =
    sources.filter((s) => s.rating).reduce((sum, s) => sum + (s.rating ?? 0), 0) /
    sources.filter((s) => s.rating).length

  const totalReviews = sources.reduce((sum, s) => sum + (s.reviewCount ?? 0), 0)
  const sourceNames = sources.map((s) => s.name).join(', ')

  let sentiment: ReputationSummaryResult['sentiment'] = 'NEUTRAL'
  if (avgRating >= 4.5) sentiment = 'POSITIVE'
  else if (avgRating >= 4.0) sentiment = 'POSITIVE'
  else if (avgRating >= 3.0) sentiment = 'NEUTRAL'
  else sentiment = 'NEGATIVE'

  const summary = `${realtorName} has an online presence across ${sources.length} platform${sources.length > 1 ? 's' : ''} (${sourceNames}). ${
    avgRating > 0
      ? `They maintain an average rating of ${avgRating.toFixed(1)} out of 5 based on ${totalReviews} external reviews.`
      : ''
  } This information is sourced from publicly available data and may not reflect their current standing on this platform.`

  const keyThemes =
    avgRating >= 4
      ? ['Highly Rated Externally', 'Established Online Presence']
      : ['Active Online Presence']

  return { summary, sentiment, keyThemes }
}

/**
 * Main function to aggregate reputation data for a realtor
 * Run this as a background job via BullMQ
 */
export async function aggregateReputationData(
  realtorProfileId: string
): Promise<ReputationSummaryResult | null> {
  const profile = await prisma.realtorProfile.findUnique({
    where: { id: realtorProfileId },
    include: { brokerage: true },
  })

  if (!profile) return null

  const realtorName = `${profile.firstName} ${profile.lastName}`
  const primaryCity = profile.serviceAreas[0] || profile.brokerage?.city || ''
  const primaryState = profile.licenseState || profile.brokerage?.state || ''

  // Fetch from available APIs
  const [googleData, yelpData] = await Promise.allSettled([
    fetchGooglePlacesData(realtorName, primaryCity, primaryState),
    fetchYelpData(realtorName, primaryCity, primaryState),
  ])

  const sources: ReputationSource[] = [
    googleData.status === 'fulfilled' && googleData.value ? googleData.value : null,
    yelpData.status === 'fulfilled' && yelpData.value ? yelpData.value : null,
  ].filter((s): s is ReputationSource => s !== null)

  // Store raw external sources
  for (const source of sources) {
    await prisma.externalSource.upsert({
      where: {
        id: `${realtorProfileId}-${source.name}`,
      },
      create: {
        realtorId: realtorProfileId,
        sourceName: source.name,
        sourceUrl: source.url,
        rating: source.rating,
        reviewCount: source.reviewCount,
        rawData: source.rawData as object,
        confidenceScore: source.confidenceScore,
        isApproved: false,
        lastFetchedAt: new Date(),
      },
      update: {
        rating: source.rating,
        reviewCount: source.reviewCount,
        rawData: source.rawData as object,
        confidenceScore: source.confidenceScore,
        lastFetchedAt: new Date(),
      },
    })
  }

  const { summary, sentiment, keyThemes } = generateSummary(realtorName, sources)

  // Store the reputation summary (pending admin approval)
  await prisma.externalReputationSummary.create({
    data: {
      realtorId: realtorProfileId,
      summary,
      sentiment,
      keyThemes,
      sources: sources.map((s) => s.name),
      isApproved: false,
      generatedAt: new Date(),
    },
  })

  return {
    realtorId: realtorProfileId,
    sources,
    summary,
    sentiment,
    keyThemes,
    generatedAt: new Date(),
  }
}

/**
 * Check if a URL follows robots.txt rules
 * Used to ensure compliance before any web requests
 */
export async function checkRobotsTxt(url: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(url)
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`

    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'RateMyRealtor-Bot/1.0' },
    })

    if (!response.ok) return true

    const robotsTxt = await response.text()
    const lines = robotsTxt.split('\n')
    let applicable = false

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.toLowerCase().startsWith('user-agent:')) {
        const agent = trimmed.substring('user-agent:'.length).trim()
        applicable = agent === '*' || agent.toLowerCase() === 'ratemyrealtor-bot'
      }
      if (applicable && trimmed.toLowerCase().startsWith('disallow:')) {
        const disallowedPath = trimmed.substring('disallow:'.length).trim()
        if (parsedUrl.pathname.startsWith(disallowedPath)) {
          return false
        }
      }
    }

    return true
  } catch {
    return false
  }
}
