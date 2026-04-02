import 'server-only'
import { verifyCustomerSession } from './customer-jwt'
import { db } from '@/db'
import { storeCustomerAccounts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { cache } from 'react'

export type CustomerAccount = {
  id: string
  storeId: string
  customerId: string | null
  phone: string
  name: string
  email: string | null
  defaultAddress: unknown
  savedAddresses: unknown[]
  lastLoginAt: Date | null
}

export const getCustomerAccount = cache(
  async (storeId: string): Promise<CustomerAccount | null> => {
    const session = await verifyCustomerSession(storeId)
    if (!session) return null

    const account = await db.query.storeCustomerAccounts.findFirst({
      where: eq(storeCustomerAccounts.id, session.sub),
    })

    if (!account || !account.isActive) return null

    return {
      id: account.id,
      storeId: account.storeId,
      customerId: account.customerId,
      phone: account.phone,
      name: account.name,
      email: account.email,
      defaultAddress: account.defaultAddress,
      savedAddresses: account.savedAddresses as unknown[],
      lastLoginAt: account.lastLoginAt,
    }
  }
)
