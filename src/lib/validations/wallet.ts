import { z } from 'zod'

export const createWalletSessionSchema = z.object({
  storeId: z.string().uuid({ error: 'معرف المتجر غير صالح' }),
  amount: z
    .number({ error: 'المبلغ يجب أن يكون رقماً' })
    .min(5, { error: 'الحد الأدنى للشحن 5 جنيه' })
    .max(10000, { error: 'الحد الأقصى للشحن 10,000 جنيه' }),
})

export const walletStatusQuerySchema = z.object({
  storeId: z.string().uuid({ error: 'معرف المتجر غير صالح' }),
})
