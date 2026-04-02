import { db } from '@/db'
import { platformCustomers } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * حساب Trust Score للعميل بناءً على تاريخ الطلبات
 * المعادلة: (completed / total) * 100 — مع عقوبة إضافية على الرفض
 */
export function calculateTrustScore(
  totalOrders: number,
  completedOrders: number,
  rejectedOrders: number,
): number {
  if (totalOrders === 0) return 100 // عميل جديد — ثقة كاملة

  const completionRate = (completedOrders / totalOrders) * 100
  const rejectionPenalty = rejectedOrders * 15 // كل رفض = -15 نقطة

  const score = Math.max(0, Math.min(100, completionRate - rejectionPenalty))
  return Math.round(score * 100) / 100
}

/**
 * تحديث Trust Score بعد تغيير حالة الطلب
 */
export async function updateCustomerTrustScore(
  phone: string,
  event: 'new_order' | 'delivered' | 'cancelled',
): Promise<void> {
  // ابحث عن العميل أو أنشئ واحد جديد
  const [existing] = await db
    .select()
    .from(platformCustomers)
    .where(eq(platformCustomers.phone, phone))
    .limit(1)

  if (!existing) {
    // عميل جديد — إنشاء سجل
    await db.insert(platformCustomers).values({
      phone,
      totalOrders: event === 'new_order' ? 1 : 0,
      completedOrders: event === 'delivered' ? 1 : 0,
      rejectedOrders: event === 'cancelled' ? 1 : 0,
      trustScore: event === 'cancelled' ? '85.00' : '100.00',
      lastOrderAt: new Date(),
    }).onConflictDoNothing()
    return
  }

  const totalOrders = existing.totalOrders + (event === 'new_order' ? 1 : 0)
  const completedOrders = existing.completedOrders + (event === 'delivered' ? 1 : 0)
  const rejectedOrders = existing.rejectedOrders + (event === 'cancelled' ? 1 : 0)

  const newScore = calculateTrustScore(totalOrders, completedOrders, rejectedOrders)
  const isBlocked = newScore === 0 && rejectedOrders >= 3

  await db
    .update(platformCustomers)
    .set({
      totalOrders,
      completedOrders,
      rejectedOrders,
      trustScore: newScore.toFixed(2),
      isBlocked,
      lastOrderAt: new Date(),
    })
    .where(eq(platformCustomers.id, existing.id))
}

/**
 * جلب بيانات Trust Score لعميل معين
 */
export async function getCustomerTrustData(phone: string) {
  const [customer] = await db
    .select()
    .from(platformCustomers)
    .where(eq(platformCustomers.phone, phone))
    .limit(1)

  if (!customer) {
    return {
      isNew: true,
      trustScore: 100,
      totalOrders: 0,
      completedOrders: 0,
      rejectedOrders: 0,
      isBlocked: false,
    }
  }

  return {
    isNew: false,
    trustScore: Number(customer.trustScore),
    totalOrders: customer.totalOrders,
    completedOrders: customer.completedOrders,
    rejectedOrders: customer.rejectedOrders,
    isBlocked: customer.isBlocked,
  }
}
