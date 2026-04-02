import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

function getEncodedKey(): Uint8Array {
  const secretKey = process.env.CUSTOMER_JWT_SECRET
  if (!secretKey) throw new Error('CUSTOMER_JWT_SECRET is not set')
  return new TextEncoder().encode(secretKey)
}

function getCookieName(storeId: string): string {
  return `matjary_ct_${storeId.slice(0, 8)}`
}

export type CustomerTokenPayload = {
  sub: string
  storeId: string
  phone: string
  name: string
}

export async function createCustomerSession(
  payload: CustomerTokenPayload
): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getEncodedKey())

  const cookieStore = await cookies()
  cookieStore.set(getCookieName(payload.storeId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })

  return token
}

export async function verifyCustomerSession(
  storeId: string
): Promise<CustomerTokenPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(getCookieName(storeId))?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getEncodedKey(), {
      algorithms: ['HS256'],
    })

    if (payload.storeId !== storeId) return null

    return payload as unknown as CustomerTokenPayload
  } catch {
    return null
  }
}

export async function deleteCustomerSession(storeId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(getCookieName(storeId))
}

export async function refreshCustomerSession(
  storeId: string
): Promise<string | null> {
  const session = await verifyCustomerSession(storeId)
  if (!session) return null
  return createCustomerSession(session)
}
