export const maxDuration = 30
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import type { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/db'
import { merchants } from '@/db/schema'
import { eq } from 'drizzle-orm'

// ============================================
// Helpers
// ============================================

/** Structured logging for webhook events */
function logWebhook(
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: Record<string, unknown>,
) {
  const payload = {
    source: 'clerk-webhook',
    timestamp: new Date().toISOString(),
    message,
    ...data,
  }
  if (level === 'error') console.error(JSON.stringify(payload))
  else if (level === 'warn') console.warn(JSON.stringify(payload))
  else console.info(JSON.stringify(payload))
}

/** Retry a DB operation up to `maxRetries` times with exponential backoff */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 2,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries) {
        logWebhook('error', `DB operation failed after ${maxRetries + 1} attempts: ${label}`, {
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
      const delay = Math.pow(2, attempt) * 100 // 100ms, 200ms, 400ms
      logWebhook('warn', `DB operation retry ${attempt + 1}/${maxRetries}: ${label}`, { delay })
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw new Error('Unreachable')
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    return new Response('Missing CLERK_WEBHOOK_SECRET', { status: 500 })
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const rawBody = await req.text()

  const wh = new Webhook(WEBHOOK_SECRET)

  let event: WebhookEvent

  try {
    event = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent
  } catch {
    logWebhook('error', 'Invalid svix signature')
    return new Response('Invalid signature', { status: 400 })
  }

  logWebhook('info', `Received event: ${event.type}`, { eventType: event.type })

  if (event.type === 'user.created') {
    const { id, email_addresses, first_name, last_name, phone_numbers, image_url } =
      event.data

    const primaryEmail = email_addresses?.[0]?.email_address
    const primaryPhone = phone_numbers?.[0]?.phone_number

    if (!primaryEmail) {
      logWebhook('warn', 'user.created without email', { clerkUserId: id })
      return new Response('No email found', { status: 400 })
    }

    // Check if merchant already exists
    const existing = await withRetry(
      () => db.select().from(merchants).where(eq(merchants.clerkUserId, id)).limit(1),
      `user.created:select:${id}`,
    )

    if (existing.length === 0) {
      await withRetry(
        () =>
          db.insert(merchants).values({
            clerkUserId: id,
            email: primaryEmail,
            displayName: [first_name, last_name].filter(Boolean).join(' ') || 'تاجر جديد',
            phone: primaryPhone ?? null,
            avatarUrl: image_url ?? null,
          }),
        `user.created:insert:${id}`,
      )
      logWebhook('info', 'Merchant created', { clerkUserId: id, email: primaryEmail })
    } else {
      logWebhook('info', 'Merchant already exists, skipping', { clerkUserId: id })
    }
  }

  if (event.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name, phone_numbers, image_url } =
      event.data

    const primaryEmail = email_addresses?.[0]?.email_address
    const primaryPhone = phone_numbers?.[0]?.phone_number

    const updateData: Record<string, unknown> = {
      displayName: [first_name, last_name].filter(Boolean).join(' ') || 'تاجر',
      phone: primaryPhone ?? null,
      avatarUrl: image_url ?? null,
    }

    // Only update email if we have one (email is NOT NULL in schema)
    if (primaryEmail) {
      updateData.email = primaryEmail
    }

    await withRetry(
      () => db.update(merchants).set(updateData).where(eq(merchants.clerkUserId, id)),
      `user.updated:update:${id}`,
    )
    logWebhook('info', 'Merchant updated', { clerkUserId: id })
  }

  if (event.type === 'user.deleted') {
    const { id } = event.data
    if (id) {
      await withRetry(
        () => db.delete(merchants).where(eq(merchants.clerkUserId, id)),
        `user.deleted:delete:${id}`,
      )
      logWebhook('info', 'Merchant deleted', { clerkUserId: id })
    }
  }

  return new Response('OK', { status: 200 })
}
