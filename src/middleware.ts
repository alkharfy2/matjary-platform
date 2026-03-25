import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  getConfiguredRootDomain,
  getRootOrigin,
  normalizeStoreSlug,
} from '@/lib/tenant/urls'

const isDashboardRoute = createRouteMatcher(['/dashboard(.*)'])
const isSuperAdminRoute = createRouteMatcher(['/super-admin(.*)'])
const PREVIEW_STORE_COOKIE = 'matjary_store_slug'

// Preview Mode: bypass Clerk entirely (dev only, never in production)
const isPreviewMode =
  process.env.PREVIEW_MODE === 'true' && process.env.NODE_ENV !== 'production'

function previewMiddleware() {
  return NextResponse.next()
}

function extractSubdomain(hostname: string, rootDomain: string): string | null {
  const rootDomainBase = rootDomain.split(':')[0] ?? ''
  const hostnameBase = hostname.split(':')[0] ?? ''

  if (!rootDomainBase || !hostnameBase) {
    return null
  }

  if (!hostnameBase.endsWith(`.${rootDomainBase}`)) {
    return null
  }

  return hostnameBase.replace(`.${rootDomainBase}`, '') || null
}

function persistPreviewStoreSlug(response: NextResponse, storeSlug: string | null) {
  if (!storeSlug) return
  response.cookies.set(PREVIEW_STORE_COOKIE, storeSlug, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: false,
  })
}

function extractStoreSlugFromUrlLike(
  urlLike: string | null,
  origin: string,
  allowedHost: string
): string | null {
  if (!urlLike) return null

  try {
    const parsed = new URL(urlLike, origin)
    if (parsed.host !== allowedHost) return null
    return normalizeStoreSlug(parsed.searchParams.get('store'))
  } catch {
    return null
  }
}

export default isPreviewMode
  ? previewMiddleware
  : clerkMiddleware(async (auth, request: NextRequest) => {
      const hostname = request.headers.get('host') || ''
      const pathname = request.nextUrl.pathname
      const configuredRootDomain = getConfiguredRootDomain()
      const rootDomain = configuredRootDomain || hostname
      const queryStoreSlug = normalizeStoreSlug(request.nextUrl.searchParams.get('store'))
      const cookieStoreSlug = normalizeStoreSlug(request.cookies.get(PREVIEW_STORE_COOKIE)?.value)
      const refererStoreSlug = extractStoreSlugFromUrlLike(
        request.headers.get('referer'),
        request.nextUrl.origin,
        request.nextUrl.host
      )
      const nextUrlStoreSlug = extractStoreSlugFromUrlLike(
        request.headers.get('next-url'),
        request.nextUrl.origin,
        request.nextUrl.host
      )
      const fallbackStoreSlug =
        queryStoreSlug || cookieStoreSlug || refererStoreSlug || nextUrlStoreSlug

      // Skip only truly static/internal files
      if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/auth') ||
        /\.[a-z]{2,5}$/i.test(pathname)
      ) {
        return NextResponse.next()
      }

      const subdomain = extractSubdomain(hostname, rootDomain)
      const isDashboardApiRoute = pathname.startsWith('/api/dashboard') || pathname.startsWith('/api/upload')
      const isStorefrontRoute = pathname === '/store' || pathname.startsWith('/store/')
      const isStorefrontApiRoute = pathname.startsWith('/api/storefront')
      const isSafeMethod = request.method === 'GET' || request.method === 'HEAD'
      const needsStoreSlugFallback = Boolean(
        fallbackStoreSlug &&
          (isDashboardRoute(request) || isDashboardApiRoute || isStorefrontRoute || isStorefrontApiRoute)
      )

      // No subdomain ? platform scope
      if (!subdomain || subdomain === 'www') {
        if (
          isSafeMethod &&
          isStorefrontRoute &&
          !queryStoreSlug &&
          fallbackStoreSlug
        ) {
          const url = request.nextUrl.clone()
          url.searchParams.set('store', fallbackStoreSlug)
          const response = NextResponse.redirect(url)
          persistPreviewStoreSlug(response, fallbackStoreSlug)
          return response
        }

        if (needsStoreSlugFallback) {
          const requestHeaders = new Headers(request.headers)
          requestHeaders.set('x-store-slug', fallbackStoreSlug!)

          if (isDashboardRoute(request) || isDashboardApiRoute) {
            const { userId, redirectToSignIn } = await auth()
            if (!userId) {
              if (pathname.startsWith('/api')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
              }
              return redirectToSignIn({ returnBackUrl: request.url })
            }
            requestHeaders.set('x-clerk-user-id', userId)
          }

          const response = NextResponse.next({ request: { headers: requestHeaders } })
          persistPreviewStoreSlug(
            response,
            queryStoreSlug || refererStoreSlug || nextUrlStoreSlug
          )
          return response
        }

        if (pathname.startsWith('/api')) {
          return NextResponse.next()
        }

        if (isSuperAdminRoute(request)) {
          const { userId, redirectToSignIn } = await auth()
          if (!userId) {
            return redirectToSignIn()
          }
        }

        return NextResponse.next()
      }

      // Has subdomain ? tenant scope
      if (
        isSafeMethod &&
        !queryStoreSlug &&
        !pathname.startsWith('/api') &&
        !isDashboardRoute(request)
      ) {
        const url = request.nextUrl.clone()
        url.searchParams.set('store', subdomain)
        return NextResponse.redirect(url)
      }

      if (pathname.startsWith('/api')) {
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-store-slug', subdomain)

        if (isDashboardApiRoute) {
          const { userId } = await auth()
          if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
          }
          requestHeaders.set('x-clerk-user-id', userId)
        }

        return NextResponse.next({ request: { headers: requestHeaders } })
      }

      // Storefront routes on subdomain rewrite to /store/*
      if (!isDashboardRoute(request)) {
        const url = request.nextUrl.clone()
        const hasStorePrefix = pathname === '/store' || pathname.startsWith('/store/')
        url.pathname = hasStorePrefix ? pathname : `/store${pathname === '/' ? '' : pathname}`

        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-store-slug', subdomain)
        return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
      }

      // Dashboard routes need auth
      const { userId } = await auth()
      if (!userId) {
        const signInUrl = new URL('/auth/sign-in', getRootOrigin(request.nextUrl.origin))
        signInUrl.searchParams.set('redirect_url', request.url)
        return NextResponse.redirect(signInUrl)
      }

      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-store-slug', subdomain)
      requestHeaders.set('x-clerk-user-id', userId)
      return NextResponse.rewrite(request.nextUrl, { request: { headers: requestHeaders } })
    })

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
