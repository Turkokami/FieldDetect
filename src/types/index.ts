export type UserRole = 'HOMEOWNER' | 'REALTOR' | 'ADMIN'
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED'
export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED'
export type ProposalStatus = 'PENDING' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED'
export type TransactionType = 'BUYER' | 'SELLER' | 'RENTER' | 'INVESTOR' | 'LANDLORD'
export type SubscriptionTier = 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'PREMIUM'
export type AdStatus = 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'PENDING_REVIEW'
export type AdType = 'FEATURED_PROFILE' | 'CITY_SPONSOR' | 'ZIP_SPONSOR' | 'BANNER'
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED'
export type ReportType = 'FAKE_REVIEW' | 'SPAM' | 'INAPPROPRIATE_CONTENT' | 'WRONG_INFORMATION' | 'HARASSMENT' | 'OTHER'

export interface SearchFilters {
  query?: string
  city?: string
  state?: string
  zipCode?: string
  brokerage?: string
  specialty?: string
  minRating?: number
  maxRating?: number
  yearsMin?: number
  yearsMax?: number
  priceMin?: number
  priceMax?: number
  propertyType?: string
  verifiedOnly?: boolean
  sortBy?: 'rating' | 'reviews' | 'recent' | 'featured'
  page?: number
  limit?: number
}

export interface RealtorSearchResult {
  id: string
  firstName: string
  lastName: string
  profilePhoto: string | null
  tagline: string | null
  bio: string | null
  city: string | null
  state: string | null
  brokerageName: string | null
  yearsInBusiness: number | null
  specialties: string[]
  serviceAreas: string[]
  averageRating: number
  reviewCount: number
  isVerified: boolean
  isFeatured: boolean
  subscriptionTier: SubscriptionTier
  verificationStatus: VerificationStatus
}

export interface ReviewWithDetails {
  id: string
  overallRating: number
  communicationRating: number | null
  negotiationRating: number | null
  marketKnowledgeRating: number | null
  responsivenessRating: number | null
  professionalismRating: number | null
  honestyRating: number | null
  title: string | null
  content: string
  wouldRecommend: boolean
  transactionType: TransactionType
  transactionDate: Date | null
  propertyCity: string | null
  propertyState: string | null
  status: ReviewStatus
  realtorResponse: string | null
  respondedAt: Date | null
  createdAt: Date
  author: {
    id: string
    name: string | null
    image: string | null
  }
  photos: Array<{ id: string; url: string; caption: string | null }>
}

export interface FullRealtorProfile {
  id: string
  firstName: string
  lastName: string
  profilePhoto: string | null
  coverPhoto: string | null
  bio: string | null
  tagline: string | null
  phone: string | null
  email: string | null
  website: string | null
  linkedinUrl: string | null
  facebookUrl: string | null
  instagramUrl: string | null
  twitterUrl: string | null
  youtubeUrl: string | null
  yearsInBusiness: number | null
  specialties: string[]
  languages: string[]
  serviceAreas: string[]
  propertyTypes: string[]
  awards: string[]
  licenseNumber: string | null
  licenseState: string | null
  totalSalesVolume: number | null
  numberOfTransactions: number | null
  averageListingPrice: number | null
  isClaimed: boolean
  isVerified: boolean
  verificationStatus: VerificationStatus
  isFeatured: boolean
  subscriptionTier: SubscriptionTier
  profileViews: number
  createdAt: Date
  brokerage: {
    id: string
    name: string
    website: string | null
    logo: string | null
  } | null
  reviews: ReviewWithDetails[]
  averageRating: number
  reviewCount: number
  teamPhotos: Array<{ id: string; url: string; caption: string | null; order: number }>
  soldProperties: Array<{
    id: string
    city: string
    state: string
    price: number | null
    saleDate: Date | null
    propertyType: string | null
    transactionType: TransactionType
  }>
}

export interface HomeListingWithDetails {
  id: string
  city: string
  state: string
  zipCode: string
  propertyType: string
  estimatedValue: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqFt: number | null
  description: string | null
  desiredTimeline: string | null
  commissionPreference: string | null
  needsRepairs: boolean
  needsStaging: boolean
  needsPhotography: boolean
  status: ListingStatus
  isPublic: boolean
  createdAt: Date
  homeowner: {
    id: string
    name: string | null
    image: string | null
  }
  photos: Array<{ id: string; url: string; caption: string | null; order: number }>
  proposalCount: number
}

export interface AdminStats {
  totalUsers: number
  totalRealtors: number
  totalReviews: number
  pendingReviews: number
  flaggedContent: number
  pendingVerifications: number
  totalListings: number
  totalRevenue: number
  newUsersThisMonth: number
  newReviewsThisMonth: number
}
