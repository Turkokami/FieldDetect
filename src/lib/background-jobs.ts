/**
 * Background job queue configuration using BullMQ
 * Requires Redis connection via REDIS_URL env variable
 */

// Conditional import - BullMQ requires Redis which may not be available in all envs
let Queue: any
let Worker: any

async function loadBullMQ() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const bullmq = await (new Function('m', 'return import(m)')('bullmq') as Promise<any>)
    Queue = bullmq.Queue
    Worker = bullmq.Worker
    return true
  } catch {
    return false
  }
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

const connection = {
  url: REDIS_URL,
}

export const JOB_NAMES = {
  AGGREGATE_REPUTATION: 'aggregate-reputation',
  SEND_REVIEW_NOTIFICATION: 'send-review-notification',
  SEND_LEAD_NOTIFICATION: 'send-lead-notification',
  DETECT_FAKE_REVIEW: 'detect-fake-review',
  UPDATE_PROFILE_STATS: 'update-profile-stats',
  SEND_WEEKLY_DIGEST: 'send-weekly-digest',
} as const

type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES]

let reputationQueue: any = null
let notificationQueue: any = null
let initialized = false

export async function initializeQueues() {
  if (initialized) return

  const loaded = await loadBullMQ()
  if (!loaded) {
    console.warn('BullMQ not available - background jobs disabled')
    return
  }

  reputationQueue = new Queue('reputation', { connection })
  notificationQueue = new Queue('notifications', { connection })
  initialized = true
}

export async function addReputationJob(realtorProfileId: string) {
  if (!reputationQueue) return null
  return reputationQueue.add(
    JOB_NAMES.AGGREGATE_REPUTATION,
    { realtorProfileId },
    {
      delay: 5000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    }
  )
}

export async function addNotificationJob(type: JobName, data: Record<string, unknown>) {
  if (!notificationQueue) return null
  return notificationQueue.add(type, data, {
    attempts: 3,
    backoff: { type: 'fixed', delay: 5000 },
  })
}

export async function startWorkers() {
  const loaded = await loadBullMQ()
  if (!loaded) {
    console.warn('BullMQ not available - workers not started')
    return
  }

  // Reputation aggregation worker
  new Worker(
    'reputation',
    async (job: { name: string; data: { realtorProfileId: string } }) => {
      if (job.name === JOB_NAMES.AGGREGATE_REPUTATION) {
        const { aggregateReputationData } = await import('./reputation-aggregator')
        await aggregateReputationData(job.data.realtorProfileId)
      }
    },
    { connection, concurrency: 2 }
  )

  // Notification worker
  new Worker(
    'notifications',
    async (job: { name: string; data: Record<string, string> }) => {
      const { sendReviewNotification, sendLeadNotification } = await import('./email')

      switch (job.name) {
        case JOB_NAMES.SEND_REVIEW_NOTIFICATION:
          await sendReviewNotification(
            job.data.realtorEmail,
            job.data.realtorName,
            job.data.reviewerName,
            parseFloat(job.data.rating),
            job.data.profileUrl
          )
          break
        case JOB_NAMES.SEND_LEAD_NOTIFICATION:
          await sendLeadNotification(
            job.data.realtorEmail,
            job.data.realtorName,
            job.data.leadName,
            job.data.listingCity,
            job.data.dashboardUrl
          )
          break
      }
    },
    { connection, concurrency: 5 }
  )

  console.log('✅ Background workers started')
}

/**
 * Fake review detection heuristics
 * Returns a suspicion score 0-1 and flags
 */
export function analyzeFakeReviewRisk(reviewData: {
  content: string
  overallRating: number
  authorCreatedAt: Date
  authorTotalReviews: number
  realtorId: string
}): { score: number; flags: string[] } {
  const flags: string[] = []
  let score = 0

  // New account flag
  const accountAgeDays = (Date.now() - reviewData.authorCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
  if (accountAgeDays < 7) {
    flags.push('NEW_ACCOUNT')
    score += 0.3
  }

  // Single review account
  if (reviewData.authorTotalReviews === 1) {
    flags.push('SINGLE_REVIEW_ACCOUNT')
    score += 0.2
  }

  // Extremely short review
  if (reviewData.content.length < 50) {
    flags.push('VERY_SHORT_REVIEW')
    score += 0.15
  }

  // All-caps content
  const upperRatio = (reviewData.content.match(/[A-Z]/g) || []).length / reviewData.content.length
  if (upperRatio > 0.5) {
    flags.push('EXCESSIVE_CAPS')
    score += 0.1
  }

  // Generic/template language patterns
  const genericPhrases = [
    'best realtor ever',
    'absolutely amazing',
    'highly recommend',
    '5 stars without hesitation',
    'went above and beyond',
  ]
  const lowerContent = reviewData.content.toLowerCase()
  const genericCount = genericPhrases.filter((p) => lowerContent.includes(p)).length
  if (genericCount >= 3) {
    flags.push('GENERIC_LANGUAGE')
    score += 0.2
  }

  // Perfect 5-star with no specific details
  if (reviewData.overallRating === 5 && reviewData.content.length < 150 && genericCount > 1) {
    flags.push('SUSPICIOUSLY_BRIEF_PERFECT_REVIEW')
    score += 0.15
  }

  return { score: Math.min(score, 1), flags }
}
