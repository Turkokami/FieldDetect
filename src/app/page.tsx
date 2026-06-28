import Link from 'next/link'
import {
  Search, Star, Shield, Users, TrendingUp, ArrowRight,
  BadgeCheck, MapPin, Home, Award, Clock, CheckCircle2,
} from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { RealtorCard } from '@/components/realtor/realtor-card'
import type { RealtorSearchResult } from '@/types'

const SAMPLE_REALTORS: RealtorSearchResult[] = [
  {
    id: '1',
    firstName: 'Sarah',
    lastName: 'Mitchell',
    profilePhoto: null,
    tagline: 'Your Austin Real Estate Expert',
    bio: null,
    city: 'Austin',
    state: 'TX',
    brokerageName: 'Keller Williams Realty',
    yearsInBusiness: 14,
    specialties: ['Luxury', 'First-Time Buyers', 'Residential'],
    serviceAreas: ['Austin', 'Round Rock', 'Cedar Park'],
    averageRating: 4.9,
    reviewCount: 187,
    isVerified: true,
    isFeatured: true,
    subscriptionTier: 'PREMIUM',
    verificationStatus: 'VERIFIED',
  },
  {
    id: '2',
    firstName: 'James',
    lastName: 'Rodriguez',
    profilePhoto: null,
    tagline: null,
    bio: null,
    city: 'Miami',
    state: 'FL',
    brokerageName: 'Coldwell Banker Realty',
    yearsInBusiness: 9,
    specialties: ['Waterfront Properties', 'Luxury', 'Investment Properties'],
    serviceAreas: ['Miami', 'Coral Gables', 'Brickell'],
    averageRating: 4.8,
    reviewCount: 134,
    isVerified: true,
    isFeatured: false,
    subscriptionTier: 'PROFESSIONAL',
    verificationStatus: 'VERIFIED',
  },
  {
    id: '3',
    firstName: 'Linda',
    lastName: 'Chen',
    profilePhoto: null,
    tagline: null,
    bio: null,
    city: 'Seattle',
    state: 'WA',
    brokerageName: 'RE/MAX Northwest',
    yearsInBusiness: 17,
    specialties: ['Residential', 'Relocation', 'New Construction'],
    serviceAreas: ['Seattle', 'Bellevue', 'Kirkland'],
    averageRating: 4.9,
    reviewCount: 251,
    isVerified: true,
    isFeatured: false,
    subscriptionTier: 'PREMIUM',
    verificationStatus: 'VERIFIED',
  },
  {
    id: '4',
    firstName: 'Marcus',
    lastName: 'Williams',
    profilePhoto: null,
    tagline: null,
    bio: null,
    city: 'Atlanta',
    state: 'GA',
    brokerageName: 'Berkshire Hathaway HomeServices',
    yearsInBusiness: 11,
    specialties: ['Multi-Family', 'Investment Properties', 'Commercial'],
    serviceAreas: ['Atlanta', 'Decatur', 'Sandy Springs'],
    averageRating: 4.7,
    reviewCount: 98,
    isVerified: true,
    isFeatured: false,
    subscriptionTier: 'PROFESSIONAL',
    verificationStatus: 'VERIFIED',
  },
  {
    id: '5',
    firstName: 'Emily',
    lastName: 'Thompson',
    profilePhoto: null,
    tagline: null,
    bio: null,
    city: 'Denver',
    state: 'CO',
    brokerageName: 'Century 21 Real Estate',
    yearsInBusiness: 6,
    specialties: ['First-Time Buyers', 'Condos & Townhomes', 'Residential'],
    serviceAreas: ['Denver', 'Aurora', 'Lakewood'],
    averageRating: 4.8,
    reviewCount: 72,
    isVerified: true,
    isFeatured: false,
    subscriptionTier: 'BASIC',
    verificationStatus: 'VERIFIED',
  },
  {
    id: '6',
    firstName: 'Robert',
    lastName: 'Patel',
    profilePhoto: null,
    tagline: null,
    bio: null,
    city: 'Chicago',
    state: 'IL',
    brokerageName: 'Compass Real Estate',
    yearsInBusiness: 20,
    specialties: ['Luxury', 'Historic Homes', 'Residential'],
    serviceAreas: ['Chicago', 'Oak Park', 'Evanston'],
    averageRating: 4.6,
    reviewCount: 319,
    isVerified: true,
    isFeatured: false,
    subscriptionTier: 'PREMIUM',
    verificationStatus: 'VERIFIED',
  },
]

const HOW_IT_WORKS = [
  {
    step: '1',
    icon: Search,
    title: 'Search',
    description:
      'Enter your city, ZIP code, or realtor name. Filter by specialty, rating, and more to find the right match.',
  },
  {
    step: '2',
    icon: Star,
    title: 'Review',
    description:
      'Read detailed verified reviews from real homebuyers and sellers. Check sub-ratings for communication, negotiation, and more.',
  },
  {
    step: '3',
    icon: Users,
    title: 'Connect',
    description:
      "Contact your chosen realtor directly, or list your home and let qualified agents compete for your business.",
  },
]

const TRUST_BADGES = [
  { icon: BadgeCheck, title: 'Verified Reviews', desc: 'Every review is tied to a real transaction' },
  { icon: Shield, title: 'Licensed Realtors Only', desc: 'We verify all state licenses before listing' },
  { icon: CheckCircle2, title: 'Free to Use', desc: 'No fees for homeowners to search or review' },
  { icon: Award, title: 'No Hidden Fees', desc: 'Transparent pricing for agents, always' },
]

const REALTOR_FEATURES = [
  'Get discovered by motivated buyers and sellers',
  'Showcase your verified credentials and reviews',
  'Receive qualified listing proposals directly',
  'Track profile views and engagement analytics',
  'Stand out with Sponsored placement in search',
  'Respond to reviews and grow your reputation',
]

const POPULAR_CITIES = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL',
  'Houston, TX', 'Phoenix, AZ', 'Miami, FL',
]

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="hero-gradient text-white py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-gold-400/20 border border-gold-400/30 rounded-full px-4 py-1.5 mb-6">
            <Star className="h-4 w-4 text-gold-300 fill-gold-300" />
            <span className="text-sm font-medium text-gold-100">Trusted by 1M+ homeowners nationwide</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            Find Your Perfect
            <br />
            <span className="text-gold-400">Real Estate Agent</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-navy-200 max-w-2xl mx-auto leading-relaxed">
            Read verified reviews from real homeowners, compare top-rated agents, and make the most
            important financial decision of your life with confidence.
          </p>

          {/* Search Bar */}
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="flex bg-white rounded-xl shadow-2xl overflow-hidden">
              <div className="flex-1 flex items-center px-4 gap-3">
                <MapPin className="h-5 w-5 text-gray-400 shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="City, ZIP code, or realtor name..."
                  className="flex-1 py-4 text-gray-900 placeholder-gray-400 focus:outline-none text-sm bg-transparent"
                  aria-label="Search for a realtor by city, ZIP, or name"
                />
              </div>
              <div className="p-2">
                <Link
                  href="/search"
                  className="inline-flex items-center justify-center h-12 px-6 bg-navy-600 text-white rounded-lg font-semibold hover:bg-navy-700 transition-colors whitespace-nowrap text-sm gap-2"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Find Realtors
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {POPULAR_CITIES.map((city) => (
                <Link
                  key={city}
                  href={`/search?city=${encodeURIComponent(city.split(',')[0])}&state=${city.split(', ')[1]}`}
                  className="text-xs text-navy-200 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full px-3 py-1"
                >
                  {city}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '50,000+', label: 'Verified Realtors' },
              { value: '250,000+', label: 'Authentic Reviews' },
              { value: '500+', label: 'Cities Covered' },
              { value: '50', label: 'States' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl lg:text-3xl font-bold text-navy-600">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-lg text-gray-600">Three simple steps to find your perfect realtor</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line on desktop */}
            <div
              className="hidden md:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-navy-100"
              aria-hidden="true"
            />
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, description }) => (
              <div key={step} className="text-center relative z-10">
                <div className="w-16 h-16 bg-navy-600 text-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <div className="inline-block bg-gold-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mb-3 mx-auto">
                  {step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 leading-relaxed max-w-xs mx-auto">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Rated Realtors */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Top Rated Realtors</h2>
              <p className="mt-2 text-gray-600">Highly reviewed agents across the country</p>
            </div>
            <Link
              href="/search"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-700 transition-colors"
            >
              View all realtors <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SAMPLE_REALTORS.map((realtor) => (
              <RealtorCard key={realtor.id} realtor={realtor} />
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/search">
              <span className="inline-flex items-center gap-2 bg-navy-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-navy-700 transition-colors">
                Browse All Realtors
                <ArrowRight className="h-5 w-5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* For Realtors */}
      <section className="bg-navy-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-gold-500/20 border border-gold-500/30 rounded-full px-3 py-1 mb-6">
                <Award className="h-4 w-4 text-gold-400" />
                <span className="text-sm font-medium text-gold-300">For Real Estate Professionals</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Grow Your Business with RateMyRealtor
              </h2>
              <p className="text-navy-300 text-lg mb-8 leading-relaxed">
                Claim your free profile today and start connecting with motivated buyers and sellers in your market.
                Let your reputation work for you 24/7.
              </p>
              <ul className="space-y-3 mb-8">
                {REALTOR_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-navy-200">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/claim-profile"
                  className="inline-flex items-center gap-2 bg-gold-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-gold-600 transition-colors"
                >
                  Claim Your Free Profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 bg-white/10 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/20 transition-colors border border-white/20"
                >
                  View Pricing
                </Link>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
              <div className="space-y-5">
                {[
                  { label: 'Profile Views', value: '2,847', change: '+23% this month' },
                  { label: 'Review Requests Sent', value: '42', change: '+8 this week' },
                  { label: 'Average Rating', value: '4.9 / 5.0', change: '187 reviews' },
                  { label: 'Leads Generated', value: '31', change: '+12 this month' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <span className="text-sm text-navy-300">{stat.label}</span>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-emerald-400">{stat.change}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-navy-500 text-center mt-4">
                Sample dashboard metrics — your actual results may vary
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* List Your Home */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-8 lg:p-12">
                <div className="flex items-center gap-2 mb-4">
                  <Home className="h-6 w-6 text-navy-600" aria-hidden="true" />
                  <span className="text-sm font-semibold text-navy-600 uppercase tracking-wider">
                    For Homeowners
                  </span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Let Realtors Compete For Your Business
                </h2>
                <p className="text-gray-600 leading-relaxed mb-8">
                  List your home for free and receive proposals from qualified, verified real estate agents.
                  Compare commissions, marketing plans, and credentials — then choose the best fit.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    'List your home in under 5 minutes',
                    'Receive proposals from multiple agents',
                    'Compare commissions side by side',
                    '100% free, no obligation',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden="true" />
                      {item}
                    </div>
                  ))}
                </div>
                <Link
                  href="/list-home"
                  className="inline-flex items-center gap-2 bg-navy-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-navy-700 transition-colors"
                >
                  List Your Home Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="bg-navy-50 p-8 lg:p-12 flex items-center">
                <div className="w-full space-y-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Your Listing</p>
                    <p className="font-semibold text-gray-900">3BR/2BA in Austin, TX</p>
                    <p className="text-sm text-gray-500 mt-0.5">Est. Value: $485,000 – $520,000</p>
                  </div>
                  {[
                    { agent: 'Sarah M.', brokerage: 'Keller Williams', commission: '2.5%', rating: 4.9 },
                    { agent: 'David K.', brokerage: 'RE/MAX', commission: '2.8%', rating: 4.7 },
                    { agent: 'Amy L.', brokerage: 'Compass', commission: '3.0%', rating: 4.8 },
                  ].map((proposal) => (
                    <div
                      key={proposal.agent}
                      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{proposal.agent}</p>
                        <p className="text-xs text-gray-500">{proposal.brokerage}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-sm font-bold text-navy-600">{proposal.commission}</p>
                          <p className="text-xs text-gray-400">commission</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-gold-500 fill-gold-500" />
                          <span className="text-xs font-semibold text-gray-700">{proposal.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white py-16 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-10">
            Why Homeowners Trust RateMyRealtor
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {TRUST_BADGES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="w-12 h-12 bg-navy-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Icon className="h-6 w-6 text-navy-600" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="hero-gradient text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-navy-200 text-lg mb-8">
            Join over 1 million homeowners who used RateMyRealtor to make smarter real estate decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-2 bg-gold-500 text-white font-semibold px-8 py-3 rounded-xl hover:bg-gold-600 transition-colors"
            >
              Start Your Search
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/list-home"
              className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/20 transition-colors border border-white/20"
            >
              List Your Home
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
