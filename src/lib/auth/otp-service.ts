import 'server-only'
import { db } from '@/db'
import { storeCustomerOtps } from '@/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import crypto from 'crypto'

const OTP_EXPIRY_MINUTES = 10
const MAX_ATTEMPTS = 5
const OTP_COOLDOWN_SECONDS = 60

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString()
}

export async function sendOtp(
  storeId: string,
  phone: string
): Promise<{ success: boolean; error?: string; cooldownRemaining?: number }> {
  const recentOtp = await db.query.storeCustomerOtps.findFirst({
    where: and(
      eq(storeCustomerOtps.storeId, storeId),
      eq(storeCustomerOtps.phone, phone),
      gt(storeCustomerOtps.createdAt, new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000))
    ),
    orderBy: (otp, { desc }) => [desc(otp.createdAt)],
  })

  if (recentOtp) {
    const elapsed = Date.now() - new Date(recentOtp.createdAt).getTime()
    const remaining = Math.ceil((OTP_COOLDOWN_SECONDS * 1000 - elapsed) / 1000)
    return { success: false, error: 'OTP_COOLDOWN', cooldownRemaining: remaining }
  }

  const otp = generateOtp()
  const otpHash = hashOtp(otp)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

  await db.insert(storeCustomerOtps).values({
    storeId,
    phone,
    otpHash,
    expiresAt,
  })

  await sendSms(phone, `كود التحقق: ${otp}`)

  return { success: true }
}

export async function verifyOtp(
  storeId: string,
  phone: string,
  otpCode: string
): Promise<{ success: boolean; error?: string }> {
  const otpHash = hashOtp(otpCode)

  const otpRecord = await db.query.storeCustomerOtps.findFirst({
    where: and(
      eq(storeCustomerOtps.storeId, storeId),
      eq(storeCustomerOtps.phone, phone),
      eq(storeCustomerOtps.isUsed, false),
      gt(storeCustomerOtps.expiresAt, new Date())
    ),
    orderBy: (otp, { desc }) => [desc(otp.createdAt)],
  })

  if (!otpRecord) {
    return { success: false, error: 'OTP_EXPIRED_OR_NOT_FOUND' }
  }

  if (otpRecord.attempts >= MAX_ATTEMPTS) {
    return { success: false, error: 'OTP_MAX_ATTEMPTS' }
  }

  if (otpRecord.otpHash !== otpHash) {
    await db.update(storeCustomerOtps)
      .set({ attempts: otpRecord.attempts + 1 })
      .where(eq(storeCustomerOtps.id, otpRecord.id))

    return { success: false, error: 'OTP_INVALID' }
  }

  await db.update(storeCustomerOtps)
    .set({ isUsed: true })
    .where(eq(storeCustomerOtps.id, otpRecord.id))

  return { success: true }
}

async function sendSms(phone: string, message: string): Promise<void> {
  const provider = process.env.SMS_PROVIDER || 'console'

  switch (provider) {
    case 'twilio': {
      const accountSid = process.env.TWILIO_ACCOUNT_SID!
      const authToken = process.env.TWILIO_AUTH_TOKEN!
      const fromNumber = process.env.TWILIO_PHONE_NUMBER!

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        },
        body: new URLSearchParams({
          To: phone,
          From: fromNumber,
          Body: message,
        }),
      })
      break
    }
    case 'console':
    default:
      console.log(`[OTP SMS] To: ${phone} | Message: ${message}`)
  }
}
