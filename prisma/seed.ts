import { PrismaClient, UserRole, TransactionType, ReviewStatus, SubscriptionTier, ListingStatus } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data
  await prisma.adminActionLog.deleteMany()
  await prisma.report.deleteMany()
  await prisma.message.deleteMany()
  await prisma.messageThread.deleteMany()
  await prisma.favoriteRealtor.deleteMany()
  await prisma.reviewPhoto.deleteMany()
  await prisma.review.deleteMany()
  await prisma.realtorProposal.deleteMany()
  await prisma.homeListingPhoto.deleteMany()
  await prisma.homeListing.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.advertisement.deleteMany()
  await prisma.externalReputationSummary.deleteMany()
  await prisma.externalSource.deleteMany()
  await prisma.verificationRequest.deleteMany()
  await prisma.realtorClaimRequest.deleteMany()
  await prisma.soldProperty.deleteMany()
  await prisma.teamPhoto.deleteMany()
  await prisma.realtorProfile.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.subscriptionPlan.deleteMany()
  await prisma.brokerage.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  // Create subscription plans
  const plans = await Promise.all([
    prisma.subscriptionPlan.create({
      data: {
        name: 'Free',
        tier: SubscriptionTier.FREE,
        price: 0,
        features: ['Basic profile listing', 'Receive up to 5 reviews', 'Respond to reviews'],
        leadCredits: 0,
      },
    }),
    prisma.subscriptionPlan.create({
      data: {
        name: 'Basic',
        tier: SubscriptionTier.BASIC,
        price: 29,
        stripePriceId: 'price_basic_monthly',
        features: ['Enhanced profile with photos', 'Unlimited reviews', 'Priority in search results', '5 lead credits/month'],
        leadCredits: 5,
      },
    }),
    prisma.subscriptionPlan.create({
      data: {
        name: 'Professional',
        tier: SubscriptionTier.PROFESSIONAL,
        price: 79,
        stripePriceId: 'price_pro_monthly',
        features: ['Everything in Basic', 'Featured profile badge', 'City/ZIP advertising', '20 lead credits/month', 'Verified badge eligible'],
        leadCredits: 20,
      },
    }),
    prisma.subscriptionPlan.create({
      data: {
        name: 'Premium',
        tier: SubscriptionTier.PREMIUM,
        price: 199,
        stripePriceId: 'price_premium_monthly',
        features: ['Everything in Professional', 'Top placement in search', 'Unlimited lead credits', 'Dedicated account manager'],
        leadCredits: -1,
      },
    }),
  ])

  console.log('✅ Created subscription plans')

  // Create brokerages
  const brokerages = await Promise.all([
    prisma.brokerage.create({
      data: { name: 'Keller Williams Realty', website: 'https://kw.com', city: 'Austin', state: 'TX', isVerified: true },
    }),
    prisma.brokerage.create({
      data: { name: 'RE/MAX LLC', website: 'https://remax.com', city: 'Denver', state: 'CO', isVerified: true },
    }),
    prisma.brokerage.create({
      data: { name: 'Coldwell Banker', website: 'https://coldwellbanker.com', city: 'San Francisco', state: 'CA', isVerified: true },
    }),
    prisma.brokerage.create({
      data: { name: 'Century 21', website: 'https://century21.com', city: 'Parsippany', state: 'NJ', isVerified: true },
    }),
    prisma.brokerage.create({
      data: { name: 'Sotheby\'s International Realty', website: 'https://sothebysrealty.com', city: 'New York', state: 'NY', isVerified: true },
    }),
    prisma.brokerage.create({
      data: { name: 'Berkshire Hathaway HomeServices', website: 'https://bhhsrealty.com', city: 'Omaha', state: 'NE', isVerified: true },
    }),
  ])

  console.log('✅ Created brokerages')

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ratemyrealtor.com',
      name: 'Platform Admin',
      hashedPassword: await bcrypt.hash('Admin@123456', 12),
      role: UserRole.ADMIN,
      isActive: true,
      emailVerified: new Date(),
    },
  })

  // Create homeowner users
  const homeowners = await Promise.all([
    prisma.user.create({
      data: {
        email: 'sarah.johnson@email.com',
        name: 'Sarah Johnson',
        hashedPassword: await bcrypt.hash('Password123!', 12),
        role: UserRole.HOMEOWNER,
        phone: '555-234-5678',
        city: 'Austin',
        state: 'TX',
        isActive: true,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'michael.chen@email.com',
        name: 'Michael Chen',
        hashedPassword: await bcrypt.hash('Password123!', 12),
        role: UserRole.HOMEOWNER,
        city: 'San Francisco',
        state: 'CA',
        isActive: true,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'emily.rodriguez@email.com',
        name: 'Emily Rodriguez',
        hashedPassword: await bcrypt.hash('Password123!', 12),
        role: UserRole.HOMEOWNER,
        city: 'Miami',
        state: 'FL',
        isActive: true,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'david.thompson@email.com',
        name: 'David Thompson',
        hashedPassword: await bcrypt.hash('Password123!', 12),
        role: UserRole.HOMEOWNER,
        city: 'Chicago',
        state: 'IL',
        isActive: true,
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'jessica.park@email.com',
        name: 'Jessica Park',
        hashedPassword: await bcrypt.hash('Password123!', 12),
        role: UserRole.HOMEOWNER,
        city: 'Seattle',
        state: 'WA',
        isActive: true,
        emailVerified: new Date(),
      },
    }),
  ])

  console.log('✅ Created homeowner users')

  // Create realtor users + profiles
  const realtorData = [
    {
      user: {
        email: 'jennifer.martinez@kwrealty.com',
        name: 'Jennifer Martinez',
        hashedPassword: await bcrypt.hash('Password123!', 12),
        role: 'REALTOR' as const,
        isActive: true,
        emailVerified: new Date(),
      },
      profile: {
        firstName: 'Jennifer',
        lastName: 'Martinez',
        licenseNumber: 'TX-1234567',
        licenseState: 'TX',
        bio: 'With over 15 years of experience in the Austin real estate market, I specialize in helping first-time buyers navigate the competitive Texas market. My deep knowledge of neighborhoods, from Hyde Park to South Congress, ensures my clients always find the perfect home.',
        tagline: 'Your Austin Dream Home Expert',
        phone: '512-555-0101',
        email: 'jennifer.martinez@kwrealty.com',
        website: 'https://jennifermartinez.kwrealty.com',
        linkedinUrl: 'https://linkedin.com/in/jennifermartinez',
        yearsInBusiness: 15,
        specialties: ['First-Time Buyers', 'Residential', 'Investment Properties'],
        languages: ['English', 'Spanish'],
        serviceAreas: ['Austin', 'Round Rock', 'Cedar Park', 'Georgetown'],
        propertyTypes: ['Single Family Home', 'Condo', 'Townhouse'],
        awards: ['2023 Top Producer KW Austin', '2022 Five Star Professional'],
        totalSalesVolume: 28000000,
        numberOfTransactions: 187,
        averageListingPrice: 485000,
        isClaimed: true,
        isVerified: true,
        verificationStatus: 'VERIFIED' as const,
        isFeatured: true,
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
        profileViews: 1243,
        leadsReceived: 89,
        brokerageIndex: 0,
      },
    },
    {
      user: {
        email: 'robert.kim@remax.com',
        name: 'Robert Kim',
        hashedPassword: await bcrypt.hash('Password123!', 12),
        role: 'REALTOR' as const,
        isActive: true,
        emailVerified: new Date(),
      },
      profile: {
        firstName: 'Robert',
        lastName: 'Kim',
        licenseNumber: 'CA-9876543',
        licenseState: 'CA',
        bio: 'Luxury real estate specialist with expertise in San Francisco Bay Area markets. I bring a data-driven approach combined with white-glove service to every transaction. Former tech executive turned real estate professional.',
        tagline: 'Bay Area Luxury Market Specialist',
        phone: '415-555-0202',
        email: 'robert.kim@remax.com',
        website: 'https://robertkim.remax.com',
        yearsInBusiness: 12,
        specialties: ['Luxury', 'Commercial', 'Investment Properties'],
        languages: ['English', 'Korean', 'Mandarin'],
        serviceAreas: ['San Francisco', 'Palo Alto', 'San Jose', 'Berkeley'],
        propertyTypes: ['Luxury', 'Condo', 'Multi-Family'],
        awards: ['RE/MAX Hall of Fame', '2023 Diamond Club', '2022 Platinum Club'],
        totalSalesVolume: 65000000,
        numberOfTransactions: 203,
        averageListingPrice: 1250000,
        isClaimed: true,
        isVerified: true,
        verificationStatus: 'VERIFIED' as const,
        isFeatured: true,
        subscriptionTier: SubscriptionTier.PREMIUM,
        profileViews: 2187,
        leadsReceived: 134,
        brokerageIndex: 1,
      },
    },
    {
      user: {
        email: 'maria.santos@coldwellbanker.com',
        name: 'Maria Santos',
        hashedPassword: await bcrypt.hash('Password123!', 12),
        role: 'REALTOR' as const,
        isActive: true,
        emailVerified: new Date(),
      },
      profile: {
        firstName: 'Maria',
        lastName: 'Santos',
        licenseNumber: 'FL-5678901',
        licenseState: 'FL',
        bio: 'Miami native with 20 years of experience helping buyers and sellers navigate South Florida\'s dynamic real estate market. Bilingual specialist in waterfront properties and luxury condos.',
        tagline: 'Miami\'s Most Connected Real Estate Professional',
        phone: '305-555-0303',
        email: 'maria.santos@coldwellbanker.com',
        website: 'https://mariasantos.com',
        yearsInBusiness: 20,
        specialties: ['Residential', 'Luxury', 'Waterfront Properties', 'Relocation'],
        languages: ['English', 'Spanish', 'Portuguese'],
        serviceAreas: ['Miami', 'Miami Beach', 'Coral Gables', 'Brickell', 'Coconut Grove'],
        propertyTypes: ['Luxury', 'Condo', 'Single Family Home'],
        awards: ['Coldwell Banker Diamond Society', '2023 International Sterling Society', 'Miami Board of Realtors Top Producer'],
        totalSalesVolume: 92000000,
        numberOfTransactions: 412,
        averageListingPrice: 875000,
        isClaimed: true,
        isVerified: true,
        verificationStatus: 'VERIFIED' as const,
        isFeatured: false,
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
        profileViews: 3421,
        leadsReceived: 201,
        brokerageIndex: 2,
      },
    },
    {
      user: {
        email: 'james.wilson@century21.com',
        name: 'James Wilson',
        hashedPassword: await bcrypt.hash('Password123!', 12),
        role: 'REALTOR' as const,
        isActive: true,
        emailVerified: new Date(),
      },
      profile: {
        firstName: 'James',
        lastName: 'Wilson',
        licenseNumber: 'IL-2345678',
        licenseState: 'IL',
        bio: 'Chicago neighborhood expert specializing in historic homes and investment properties. I\'ve helped over 300 families find their perfect home in neighborhoods ranging from Lincoln Park to Pilsen.',
        tagline: 'Chicago\'s Neighborhood Expert',
        phone: '312-555-0404',
        email: 'james.wilson@century21.com',
        website: 'https://jameswilsonrealty.com',
        yearsInBusiness: 18,
        specialties: ['Residential', 'Investment Properties', 'Historic Homes', 'First-Time Buyers'],
        languages: ['English'],
        serviceAreas: ['Chicago', 'Evanston', 'Oak Park', 'Lincoln Park', 'Wicker Park'],
        propertyTypes: ['Single Family Home', 'Multi-Family', 'Condo'],
        awards: ['Century 21 Double Centurion', '2023 Quality Service Award', 'Chicago Agent Magazine Top Producer'],
        totalSalesVolume: 45000000,
        numberOfTransactions: 334,
        averageListingPrice: 425000,
        isClaimed: true,
        isVerified: true,
        verificationStatus: 'VERIFIED' as const,
        isFeatured: false,
        subscriptionTier: SubscriptionTier.BASIC,
        profileViews: 987,
        leadsReceived: 67,
        brokerageIndex: 3,
      },
    },
    {
      user: {
        email: 'ashley.patel@bhhsrealty.com',
        name: 'Ashley Patel',
        hashedPassword: await bcrypt.hash('Password123!', 12),
        role: 'REALTOR' as const,
        isActive: true,
        emailVerified: new Date(),
      },
      profile: {
        firstName: 'Ashley',
        lastName: 'Patel',
        licenseNumber: 'WA-3456789',
        licenseState: 'WA',
        bio: 'Seattle tech-savvy realtor helping professionals relocate to the Pacific Northwest. I combine cutting-edge market analytics with personalized service to deliver exceptional results for buyers and sellers.',
        tagline: 'Seattle\'s Tech Relocation Specialist',
        phone: '206-555-0505',
        email: 'ashley.patel@bhhsrealty.com',
        website: 'https://ashleypatel.bhhsrealty.com',
        yearsInBusiness: 9,
        specialties: ['Relocation', 'Residential', 'New Construction', 'First-Time Buyers'],
        languages: ['English', 'Hindi', 'Gujarati'],
        serviceAreas: ['Seattle', 'Bellevue', 'Redmond', 'Kirkland', 'Bothell'],
        propertyTypes: ['Single Family Home', 'Condo', 'New Construction'],
        awards: ['BHHS Legend Award', '2023 Chairman\'s Circle', 'Seattle Magazine Best Real Estate Agent'],
        totalSalesVolume: 38000000,
        numberOfTransactions: 198,
        averageListingPrice: 725000,
        isClaimed: true,
        isVerified: true,
        verificationStatus: 'VERIFIED' as const,
        isFeatured: true,
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
        profileViews: 1654,
        leadsReceived: 112,
        brokerageIndex: 5,
      },
    },
    {
      user: {
        email: 'thomas.nguyen@sothebys.com',
        name: 'Thomas Nguyen',
        hashedPassword: await bcrypt.hash('Password123!', 12),
        role: 'REALTOR' as const,
        isActive: true,
        emailVerified: new Date(),
      },
      profile: {
        firstName: 'Thomas',
        lastName: 'Nguyen',
        licenseNumber: 'NY-4567890',
        licenseState: 'NY',
        bio: 'Manhattan luxury condo and co-op specialist with 22 years of experience. I represent discerning buyers and sellers in New York\'s most prestigious neighborhoods, from the Upper East Side to Tribeca.',
        tagline: 'Manhattan\'s Premier Luxury Real Estate Advisor',
        phone: '212-555-0606',
        email: 'thomas.nguyen@sothebys.com',
        website: 'https://thomasnguyen.sothebysrealty.com',
        linkedinUrl: 'https://linkedin.com/in/thomasnguyen',
        yearsInBusiness: 22,
        specialties: ['Luxury', 'Residential', 'Condos & Townhomes', 'Investment Properties'],
        languages: ['English', 'Vietnamese', 'French'],
        serviceAreas: ['Manhattan', 'Brooklyn', 'Upper East Side', 'Tribeca', 'SoHo'],
        propertyTypes: ['Luxury', 'Condo', 'Co-op'],
        awards: ['Sotheby\'s International Realty Top 1%', '2023 Wall Street Journal Top Agent', 'NYC Real Estate Board Award'],
        totalSalesVolume: 185000000,
        numberOfTransactions: 567,
        averageListingPrice: 2800000,
        isClaimed: true,
        isVerified: true,
        verificationStatus: 'VERIFIED' as const,
        isFeatured: true,
        subscriptionTier: SubscriptionTier.PREMIUM,
        profileViews: 5234,
        leadsReceived: 287,
        brokerageIndex: 4,
      },
    },
  ]

  const realtorUsers = []
  const realtorProfiles = []

  for (const data of realtorData) {
    const user = await prisma.user.create({ data: data.user })
    const { brokerageIndex, ...profileData } = data.profile
    const profile = await prisma.realtorProfile.create({
      data: {
        ...profileData,
        userId: user.id,
        brokerageId: brokerages[brokerageIndex].id,
      },
    })
    realtorUsers.push(user)
    realtorProfiles.push(profile)
  }

  console.log('✅ Created realtor users and profiles')

  // Create sold properties for each realtor
  const soldPropertyTemplates = [
    { city: 'Austin', state: 'TX', price: 425000, propertyType: 'Single Family Home', transactionType: TransactionType.SELLER, bedrooms: 4, bathrooms: 2.5, sqFt: 2100 },
    { city: 'Austin', state: 'TX', price: 380000, propertyType: 'Townhouse', transactionType: TransactionType.BUYER, bedrooms: 3, bathrooms: 2, sqFt: 1650 },
    { city: 'Round Rock', state: 'TX', price: 510000, propertyType: 'Single Family Home', transactionType: TransactionType.SELLER, bedrooms: 5, bathrooms: 3, sqFt: 2800 },
    { city: 'San Francisco', state: 'CA', price: 1250000, propertyType: 'Condo', transactionType: TransactionType.BUYER, bedrooms: 2, bathrooms: 2, sqFt: 1100 },
    { city: 'Palo Alto', state: 'CA', price: 3200000, propertyType: 'Single Family Home', transactionType: TransactionType.SELLER, bedrooms: 5, bathrooms: 3.5, sqFt: 3200 },
    { city: 'Miami', state: 'FL', price: 875000, propertyType: 'Condo', transactionType: TransactionType.SELLER, bedrooms: 3, bathrooms: 2, sqFt: 1800 },
    { city: 'Miami Beach', state: 'FL', price: 2100000, propertyType: 'Luxury', transactionType: TransactionType.BUYER, bedrooms: 4, bathrooms: 4, sqFt: 3500 },
    { city: 'Chicago', state: 'IL', price: 415000, propertyType: 'Single Family Home', transactionType: TransactionType.BUYER, bedrooms: 3, bathrooms: 2, sqFt: 1950 },
    { city: 'Seattle', state: 'WA', price: 725000, propertyType: 'Single Family Home', transactionType: TransactionType.SELLER, bedrooms: 4, bathrooms: 2.5, sqFt: 2200 },
    { city: 'Manhattan', state: 'NY', price: 2800000, propertyType: 'Condo', transactionType: TransactionType.BUYER, bedrooms: 3, bathrooms: 2.5, sqFt: 1600 },
  ]

  for (let i = 0; i < realtorProfiles.length; i++) {
    const templates = soldPropertyTemplates.slice(0, 4)
    for (const template of templates) {
      await prisma.soldProperty.create({
        data: {
          ...template,
          realtorId: realtorProfiles[i].id,
          saleDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 2),
          address: `${Math.floor(Math.random() * 9000) + 1000} ${['Oak', 'Maple', 'Cedar', 'Pine', 'Elm'][Math.floor(Math.random() * 5)]} ${['Street', 'Avenue', 'Boulevard', 'Drive'][Math.floor(Math.random() * 4)]}`,
        },
      })
    }
  }

  console.log('✅ Created sold properties')

  // Create reviews
  const reviewTemplates = [
    {
      overallRating: 5, communicationRating: 5, negotiationRating: 5, marketKnowledgeRating: 5, responsivenessRating: 5, professionalismRating: 5, honestyRating: 5,
      title: 'Outstanding realtor — made our home buying dream come true!',
      content: 'Working with this agent was an absolute pleasure from start to finish. She understood exactly what we were looking for and never wasted our time showing us homes that didn\'t fit our criteria. Her negotiation skills saved us $15,000 off the asking price. I can\'t recommend her highly enough!',
      wouldRecommend: true, transactionType: TransactionType.BUYER, propertyCity: 'Austin', propertyState: 'TX',
    },
    {
      overallRating: 4.5, communicationRating: 5, negotiationRating: 4, marketKnowledgeRating: 5, responsivenessRating: 4.5, professionalismRating: 5, honestyRating: 5,
      title: 'Sold our home $40k over asking price in just 6 days!',
      content: 'We were nervous about selling in a slower market, but our agent\'s pricing strategy and marketing plan were spot-on. Professional photos, 3D virtual tour, and strategic listing timing led to multiple offers. She got us $40,000 over asking price in under a week. Incredible result!',
      wouldRecommend: true, transactionType: TransactionType.SELLER, propertyCity: 'Austin', propertyState: 'TX',
    },
    {
      overallRating: 5, communicationRating: 5, negotiationRating: 5, marketKnowledgeRating: 4, responsivenessRating: 5, professionalismRating: 5, honestyRating: 5,
      title: 'Best realtor in the city — period.',
      content: 'I\'ve worked with several realtors over the years, but this experience was truly exceptional. Always available, incredibly knowledgeable, and genuinely cares about clients. Found us our dream home in a tough market. Will absolutely use again for our next purchase.',
      wouldRecommend: true, transactionType: TransactionType.BUYER, propertyCity: 'Miami', propertyState: 'FL',
    },
    {
      overallRating: 4, communicationRating: 4, negotiationRating: 3.5, marketKnowledgeRating: 4.5, responsivenessRating: 4, professionalismRating: 4.5, honestyRating: 4,
      title: 'Very knowledgeable about the local market',
      content: 'Overall a good experience. Strong market knowledge and helped us understand the neighborhood trends. Communication could have been a bit more proactive — sometimes I had to reach out to get updates. But ultimately got the job done and we\'re happy with our new home.',
      wouldRecommend: true, transactionType: TransactionType.BUYER, propertyCity: 'Chicago', propertyState: 'IL',
    },
    {
      overallRating: 5, communicationRating: 5, negotiationRating: 5, marketKnowledgeRating: 5, responsivenessRating: 5, professionalismRating: 5, honestyRating: 5,
      title: 'Exceptional luxury real estate experience',
      content: 'We were relocating from overseas and needed a realtor who could handle our complex requirements with complete professionalism. They guided us through every step, coordinated with our attorneys, and made the entire process seamless. Truly world-class service.',
      wouldRecommend: true, transactionType: TransactionType.BUYER, propertyCity: 'Manhattan', propertyState: 'NY',
    },
  ]

  for (let i = 0; i < realtorProfiles.length; i++) {
    const realtorProfile = realtorProfiles[i]
    const realtorUser = realtorUsers[i]

    for (let j = 0; j < 3; j++) {
      const template = reviewTemplates[(i + j) % reviewTemplates.length]
      const homeowner = homeowners[j % homeowners.length]

      await prisma.review.create({
        data: {
          ...template,
          authorId: homeowner.id,
          realtorId: realtorUser.id,
          realtorProfileId: realtorProfile.id,
          status: ReviewStatus.APPROVED,
          isVerified: true,
          verifiedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
          transactionDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
          realtorResponse: j === 0 ? 'Thank you so much for your kind words! It was truly a pleasure working with you and your family. I look forward to helping you with any future real estate needs!' : null,
          respondedAt: j === 0 ? new Date() : null,
        },
      })
    }
  }

  console.log('✅ Created reviews')

  // Create external reputation summaries
  for (const profile of realtorProfiles) {
    await prisma.externalReputationSummary.create({
      data: {
        realtorId: profile.id,
        summary: `${profile.firstName} ${profile.lastName} has an excellent online reputation across multiple real estate platforms. Clients consistently praise their professionalism, market knowledge, and communication skills. They are frequently mentioned as being responsive, honest, and going above and beyond for their clients.`,
        sentiment: 'POSITIVE',
        keyThemes: ['Professional', 'Responsive', 'Market Expert', 'Excellent Communication', 'Trustworthy'],
        sources: ['Zillow', 'Realtor.com', 'Google Reviews'],
        isApproved: true,
        approvedBy: adminUser.id,
        approvedAt: new Date(),
      },
    })
  }

  console.log('✅ Created external reputation summaries')

  // Create home listings
  const listingData = [
    {
      homeownerId: homeowners[0].id,
      city: 'Austin',
      state: 'TX',
      zipCode: '78704',
      propertyType: 'Single Family Home',
      estimatedValue: 650000,
      bedrooms: 4,
      bathrooms: 2.5,
      sqFt: 2400,
      yearBuilt: 2008,
      description: 'Beautiful 4 bed/2.5 bath home in the heart of 78704. Updated kitchen, hardwood floors throughout, large backyard with deck. Great schools, walkable neighborhood.',
      desiredTimeline: '60-90 days',
      commissionPreference: 'Standard (3%)',
      needsRepairs: false,
      needsStaging: true,
      needsPhotography: true,
      status: ListingStatus.ACTIVE,
      isPublic: true,
    },
    {
      homeownerId: homeowners[1].id,
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94110',
      propertyType: 'Condo',
      estimatedValue: 1200000,
      bedrooms: 2,
      bathrooms: 2,
      sqFt: 1100,
      yearBuilt: 2015,
      description: 'Modern 2/2 condo in the Mission District. Top floor, city views, gourmet kitchen, in-unit laundry, 1 parking space. HOA covers water/garbage.',
      desiredTimeline: '30-60 days',
      commissionPreference: 'Negotiable',
      needsRepairs: false,
      needsStaging: false,
      needsPhotography: true,
      status: ListingStatus.ACTIVE,
      isPublic: true,
    },
    {
      homeownerId: homeowners[2].id,
      city: 'Miami',
      state: 'FL',
      zipCode: '33133',
      propertyType: 'Single Family Home',
      estimatedValue: 950000,
      bedrooms: 5,
      bathrooms: 3,
      sqFt: 3200,
      yearBuilt: 1998,
      description: 'Stunning 5BR/3BA pool home in Coconut Grove. Chef\'s kitchen, primary suite with spa bath, resort-style pool and spa. Gated community, walking distance to shops and restaurants.',
      desiredTimeline: '90-120 days',
      commissionPreference: '2.5-3%',
      needsRepairs: true,
      needsStaging: true,
      needsPhotography: true,
      status: ListingStatus.ACTIVE,
      isPublic: true,
    },
  ]

  const listings = await Promise.all(listingData.map(data => prisma.homeListing.create({ data })))

  console.log('✅ Created home listings')

  // Create proposals for listings
  for (let i = 0; i < 3; i++) {
    await prisma.realtorProposal.create({
      data: {
        listingId: listings[0].id,
        realtorId: realtorProfiles[i].id,
        coverLetter: `Dear Homeowner, I am excited about the opportunity to represent your beautiful property at ${listings[0].city}. With ${realtorData[i].profile.yearsInBusiness} years of experience in this market and ${realtorData[i].profile.numberOfTransactions} successful transactions, I am uniquely positioned to get you top dollar for your home.`,
        proposedRate: [2.5, 3.0, 2.75][i],
        marketingPlan: 'Professional photography, 3D virtual tour, drone footage, targeted digital marketing campaign, MLS listing, open houses, and active outreach to my network of buyer\'s agents.',
        timeline: '30-45 days to close',
        whyChooseMe: 'My proven track record and deep market knowledge will ensure a smooth, profitable sale for your property.',
        status: i === 0 ? 'SHORTLISTED' : 'PENDING',
      },
    })
  }

  console.log('✅ Created proposals')

  // Create leads
  for (let i = 0; i < realtorProfiles.length; i++) {
    for (let j = 0; j < 5; j++) {
      await prisma.lead.create({
        data: {
          realtorId: realtorProfiles[i].id,
          sourceType: ['PROFILE_VIEW', 'REVIEW_PAGE', 'SEARCH_RESULT', 'LISTING'][j % 4],
          name: homeowners[j % homeowners.length].name!,
          email: homeowners[j % homeowners.length].email,
          phone: '555-' + String(Math.floor(Math.random() * 9000000) + 1000000),
          message: 'I would like to learn more about your services and discuss listing my home.',
          isContacted: j < 2,
          contactedAt: j < 2 ? new Date(Date.now() - j * 24 * 60 * 60 * 1000) : null,
          createdAt: new Date(Date.now() - j * 2 * 24 * 60 * 60 * 1000),
        },
      })
    }
  }

  console.log('✅ Created leads')

  // Create admin action log entries
  await prisma.adminActionLog.create({
    data: {
      adminId: adminUser.id,
      action: 'APPROVE_REVIEW',
      targetType: 'Review',
      targetId: 'seed-review-1',
      details: { reason: 'Verified review meets community guidelines' },
    },
  })

  await prisma.adminActionLog.create({
    data: {
      adminId: adminUser.id,
      action: 'VERIFY_REALTOR',
      targetType: 'RealtorProfile',
      targetId: realtorProfiles[0].id,
      details: { licenseVerified: true, source: 'State License Board API' },
    },
  })

  console.log('✅ Created admin logs')

  console.log('\n🎉 Seed complete!')
  console.log('\nTest Credentials:')
  console.log('  Admin:     admin@ratemyrealtor.com / Admin@123456')
  console.log('  Homeowner: sarah.johnson@email.com / Password123!')
  console.log('  Realtor:   jennifer.martinez@kwrealty.com / Password123!')
  console.log('\nCreated:')
  console.log(`  ${realtorProfiles.length} realtor profiles`)
  console.log(`  ${homeowners.length} homeowner accounts`)
  console.log(`  ${realtorProfiles.length * 3} reviews`)
  console.log(`  ${listings.length} home listings`)
  console.log(`  3 proposals`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
