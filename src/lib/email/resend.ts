/**
 * Resend Email Service
 *
 * يُستخدم لإرسال إيميلات تلقائية (Transactional Emails).
 * يُستدعى من API Routes فقط (server-side).
 */

import { Resend } from 'resend'
import type { ReactElement } from 'react'

let resendClient: Resend | null = null

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not configured — emails disabled')
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@matjary.com'

type SendEmailOptions = {
  to: string | string[]
  subject: string
  react: ReactElement
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}

/**
 * إرسال إيميل عبر Resend
 *
 * fire-and-forget — لا يعطل أي عملية لو فشل
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string }> {
  try {
    const resend = getResend()
    if (!resend) return { success: false }

    const { data, error } = await resend.emails.send({
      from: `متجري <${FROM_EMAIL}>`,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      react: options.react,
      replyTo: options.replyTo,
      tags: options.tags,
    })

    if (error) {
      console.error('[Email] Send error:', error)
      return { success: false }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Exception:', error)
    return { success: false }
  }
}
