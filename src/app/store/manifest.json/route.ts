export const maxDuration = 30
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { stores } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const storeSlug = request.headers.get('x-store-slug') || request.nextUrl.searchParams.get('store')
  if (!storeSlug) {
    return NextResponse.json({}, { status: 400 })
  }

  const [store] = await db
    .select({
      name: stores.name,
      description: stores.description,
      logo: stores.logoUrl,
      settings: stores.settings,
    })
    .from(stores)
    .where(eq(stores.slug, storeSlug))
    .limit(1)

  if (!store) {
    return NextResponse.json({}, { status: 404 })
  }

  const settings = (store.settings as Record<string, unknown>) ?? {}
  const themeColor = (settings.themeColor as string) || '#6366f1'

  const manifest = {
    name: store.name,
    short_name: store.name.slice(0, 12),
    description: (store.description as string) || `متجر ${store.name}`,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: themeColor,
    orientation: 'portrait-primary',
    icons: [
      {
        src: (store.logo as string) || '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: (store.logo as string) || '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
