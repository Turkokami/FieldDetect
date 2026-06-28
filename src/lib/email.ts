import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')
const FROM = 'RateMyRealtor <noreply@ratemyrealtor.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function sendWelcomeEmail(email: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Welcome to RateMyRealtor!',
    html: `
      <h1>Welcome to RateMyRealtor, ${name}!</h1>
      <p>Thank you for joining the most trusted real estate agent review platform.</p>
      <p>You can now:</p>
      <ul>
        <li>Search and compare top realtors in your area</li>
        <li>Leave honest reviews based on your experience</li>
        <li>List your home and invite realtors to compete for your business</li>
      </ul>
      <a href="${APP_URL}" style="background:#1e3a5f;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
        Get Started
      </a>
    `,
  })
}

export async function sendVerificationEmail(email: string, token: string, realtorName: string) {
  const verifyUrl = `${APP_URL}/verify-review?token=${token}`
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `Verify your review for ${realtorName}`,
    html: `
      <h1>Verify Your Review</h1>
      <p>Please verify your review for ${realtorName} by clicking the button below.</p>
      <p>This link expires in 48 hours.</p>
      <a href="${verifyUrl}" style="background:#1e3a5f;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
        Verify My Review
      </a>
    `,
  })
}

export async function sendReviewNotification(
  realtorEmail: string,
  realtorName: string,
  reviewerName: string,
  rating: number,
  profileUrl: string
) {
  return resend.emails.send({
    from: FROM,
    to: realtorEmail,
    subject: `New ${rating}-star review from ${reviewerName}`,
    html: `
      <h1>New Review Received</h1>
      <p>Hi ${realtorName}, you've received a new ${rating}-star review from ${reviewerName}.</p>
      <p>Log in to view the review and respond.</p>
      <a href="${profileUrl}" style="background:#1e3a5f;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
        View Review
      </a>
    `,
  })
}

export async function sendLeadNotification(
  realtorEmail: string,
  realtorName: string,
  leadName: string,
  listingCity: string,
  dashboardUrl: string
) {
  return resend.emails.send({
    from: FROM,
    to: realtorEmail,
    subject: `New lead from ${leadName} in ${listingCity}`,
    html: `
      <h1>New Lead!</h1>
      <p>Hi ${realtorName}, you have a new lead from ${leadName} regarding a property in ${listingCity}.</p>
      <a href="${dashboardUrl}" style="background:#1e3a5f;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
        View Lead
      </a>
    `,
  })
}

export async function sendClaimApprovedEmail(email: string, name: string, profileUrl: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Your profile claim has been approved!',
    html: `
      <h1>Profile Claim Approved!</h1>
      <p>Congratulations ${name}! Your profile claim has been approved.</p>
      <p>You can now manage your profile, respond to reviews, and receive leads.</p>
      <a href="${profileUrl}" style="background:#1e3a5f;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
        View Your Profile
      </a>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your RateMyRealtor password',
    html: `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="background:#1e3a5f;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
        Reset Password
      </a>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  })
}
