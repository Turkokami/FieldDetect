import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export const proxy = withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Admin routes require ADMIN role
    if (pathname.startsWith('/admin')) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Realtor-only routes
    if (pathname.startsWith('/dashboard/realtor')) {
      if (token?.role !== 'REALTOR' && token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        // These paths require authentication
        const protectedPaths = ['/dashboard', '/admin', '/listings/create', '/realtor']
        const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
        if (!isProtected) return true
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/listings/create',
    '/realtor/:path*/review',
    '/api/admin/:path*',
    '/api/listings',
    '/api/favorites/:path*',
    '/api/messages/:path*',
  ],
}
