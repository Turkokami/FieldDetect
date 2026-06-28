import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await getAuthSession()
  if (!session?.user) redirect('/login')

  if (session.user.role === 'ADMIN') redirect('/admin')
  if (session.user.role === 'REALTOR') redirect('/dashboard/realtor')
  redirect('/dashboard/homeowner')
}
