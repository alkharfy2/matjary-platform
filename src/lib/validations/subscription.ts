import { z } from 'zod'

export const createSubscriptionSchema = z.object({
  storeId: z.string().uuid({ error: 'معرف المتجر غير صالح' }),
})
