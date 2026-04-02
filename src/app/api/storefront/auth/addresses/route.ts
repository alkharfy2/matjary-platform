import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeCustomerAccounts } from '@/db/schema'
import type { SavedAddress } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { getCustomerAccount } from '@/lib/auth/customer-middleware'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'

const addressSchema = z.object({
  label: z.string().min(1).max(50),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(20).optional(),
  governorate: z.string().min(1).max(100),
  city: z.string().max(100).optional().default(''),
  area: z.string().max(100).optional().default(''),
  street: z.string().max(200).optional().default(''),
  building: z.string().max(100).optional(),
  floor: z.string().max(50).optional(),
  apartment: z.string().max(50).optional(),
  landmark: z.string().max(200).optional(),
  postalCode: z.string().max(20).optional(),
  isDefault: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()
    const storeId = store.id

    const ip = getClientIp(request)
    const { allowed } = rateLimit(`addr:${ip}`, { maxRequests: 20, windowSeconds: 60 })
    if (!allowed) return ApiErrors.tooManyRequests()

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    const body = await request.json()
    const data = addressSchema.parse(body)

    const newAddress: SavedAddress = {
      ...data,
      id: nanoid(),
      isDefault: data.isDefault ?? false,
    }

    const currentAddresses = (account.savedAddresses || []) as SavedAddress[]

    let updatedAddresses: SavedAddress[]
    if (newAddress.isDefault) {
      updatedAddresses = currentAddresses.map(a => ({ ...a, isDefault: false }))
    } else {
      updatedAddresses = [...currentAddresses]
    }
    updatedAddresses.push(newAddress)

    if (updatedAddresses.length === 1 && updatedAddresses[0]) {
      updatedAddresses[0].isDefault = true
    }

    const defaultAddr = updatedAddresses.find(a => a.isDefault) || null

    await db.update(storeCustomerAccounts)
      .set({
        savedAddresses: updatedAddresses,
        defaultAddress: defaultAddr,
        updatedAt: new Date(),
      })
      .where(eq(storeCustomerAccounts.id, account.id))

    return apiSuccess({ addresses: updatedAddresses })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET() {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()
    const storeId = store.id

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    return apiSuccess({ addresses: account.savedAddresses })
  } catch (error) {
    return handleApiError(error)
  }
}
