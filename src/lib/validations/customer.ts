import { z } from 'zod'

/**
 * Schema لتحديث بيانات العميل (ملاحظات / حظر)
 * يُستخدم في: PUT /api/dashboard/customers/[id]
 */
export const updateCustomerSchema = z.object({
  notes: z.string().max(1000, { error: 'الملاحظات يجب ألا تتجاوز 1000 حرف' }).optional().nullable(),
  isBlocked: z.boolean({ error: 'حالة الحظر يجب أن تكون true أو false' }).optional(),
})
