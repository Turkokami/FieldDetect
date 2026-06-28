import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-06-24.dahlia' as const,
  typescript: true,
})

export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    features: [
      'Basic profile listing',
      'Receive up to 3 reviews',
      'Respond to reviews',
      'Basic analytics',
    ],
    leadCredits: 0,
  },
  BASIC: {
    name: 'Basic',
    price: 29,
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID,
    features: [
      'Enhanced profile with photos',
      'Unlimited reviews',
      'Priority in search results',
      'Lead notifications',
      '5 lead credits/month',
      'Email support',
    ],
    leadCredits: 5,
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 79,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      'Everything in Basic',
      'Featured profile badge',
      'City/ZIP advertising',
      'Advanced analytics dashboard',
      '20 lead credits/month',
      'Verified badge eligible',
      'Priority support',
    ],
    leadCredits: 20,
  },
  PREMIUM: {
    name: 'Premium',
    price: 199,
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    features: [
      'Everything in Professional',
      'Top placement in search',
      'Exclusive city/ZIP sponsorship',
      'Unlimited lead credits',
      'Dedicated account manager',
      'Custom advertising creative',
      'White-glove onboarding',
    ],
    leadCredits: -1, // unlimited
  },
}

export async function createCustomer(email: string, name: string): Promise<string> {
  const customer = await stripe.customers.create({ email, name })
  return customer.id
}

export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  metadata,
}: {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  })
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}
