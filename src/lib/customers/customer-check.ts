import { db } from '@/db'
import { storeCustomerBlocks } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { getCustomerTrustData } from './trust-score'

type FakeOrderSettings = {
  fakeOrderBlockerEnabled?: boolean
  fakeOrderMinTrustScore?: number
  fakeOrderAutoReject?: boolean
}

type CustomerCheckResult = {
  allowed: boolean
  reason?: string
  trustData: {
    isNew: boolean
    trustScore: number
    totalOrders: number
    completedOrders: number
    rejectedOrders: number
    isBlocked: boolean
  }
}

/**
 * فحص العميل عند الـ Checkout
 * يتحقق من: الحظر على مستوى المنصة، الحظر على مستوى المتجر، ونسبة الثقة
 */
export async function checkCustomerTrust(
  phone: string,
  storeId: string,
  settings: FakeOrderSettings,
): Promise<CustomerCheckResult> {
  const trustData = await getCustomerTrustData(phone)

  // لو الميزة مش مفعّلة — اسمح بالطلب مع بيانات Trust فقط
  if (!settings.fakeOrderBlockerEnabled) {
    return { allowed: true, trustData }
  }

  // 1. محظور على مستوى المنصة بالكامل
  if (trustData.isBlocked) {
    return {
      allowed: false,
      reason: 'هذا الرقم محظور من الطلب على المنصة',
      trustData,
    }
  }

  // 2. محظور على مستوى المتجر
  const [storeBlock] = await db
    .select({ id: storeCustomerBlocks.id })
    .from(storeCustomerBlocks)
    .where(and(
      eq(storeCustomerBlocks.storeId, storeId),
      eq(storeCustomerBlocks.customerPhone, phone),
    ))
    .limit(1)

  if (storeBlock) {
    return {
      allowed: false,
      reason: 'هذا الرقم محظور من الطلب في هذا المتجر',
      trustData,
    }
  }

  // 3. نسبة الثقة أقل من الحد المسموح + الرفض التلقائي مفعّل
  const minScore = settings.fakeOrderMinTrustScore ?? 30
  if (settings.fakeOrderAutoReject && trustData.trustScore < minScore) {
    return {
      allowed: false,
      reason: `نسبة ثقة العميل منخفضة (${trustData.trustScore}%)`,
      trustData,
    }
  }

  return { allowed: true, trustData }
}
