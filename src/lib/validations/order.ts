import { z } from 'zod'

export const shippingAddressSchema = z.object({
  governorate: z.string().min(1, 'المحافظة مطلوبة'),
  city: z.string().min(1, 'المدينة مطلوبة'),
  area: z.string().min(1, 'المنطقة مطلوبة'),
  street: z.string().min(1, 'الشارع مطلوب'),
  building: z.string().optional(),
  floor: z.string().optional(),
  apartment: z.string().optional(),
  landmark: z.string().optional(),
  postalCode: z.string().optional(),
})

export const shippingLocationSchema = z.object({
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
})

const checkoutShippingSchema = z.object({
  governorate: z.string().optional(),
  city: z.string().optional(),
  area: z.string().optional(),
  street: z.string().optional(),
  building: z.string().optional(),
  floor: z.string().optional(),
  apartment: z.string().optional(),
  landmark: z.string().optional(),
  postalCode: z.string().optional(),
})

export const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().min(1, 'الكمية يجب أن تكون 1 على الأقل'),
})

export const checkoutSchema = z
  .object({
    storeId: z.string().uuid('معرف المتجر غير صالح'),
    items: z.array(checkoutItemSchema).min(1, 'يجب إضافة منتج واحد على الأقل'),
    shipping: checkoutShippingSchema,
    shippingLocation: shippingLocationSchema.optional().nullable(),
    customerName: z.string().min(2, 'الاسم مطلوب'),
    customerPhone: z.string().min(10, 'رقم الهاتف غير صالح').max(15),
    customerEmail: z.string().email('البريد الإلكتروني غير صالح').optional().nullable(),
    paymentMethod: z.enum(['cod', 'kashier'], { message: 'طريقة الدفع غير صالحة' }),
    couponCode: z.string().optional().nullable(),
    loyaltyPointsToRedeem: z.coerce.number().int().min(0).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const governorate = data.shipping.governorate?.trim() ?? ''
    const city = data.shipping.city?.trim() ?? ''
    const area = data.shipping.area?.trim() ?? ''
    const street = data.shipping.street?.trim() ?? ''

    const hasManualAddress =
      governorate.length > 0 &&
      city.length > 0 &&
      area.length > 0 &&
      street.length > 0

    const hasCoordinates = Boolean(data.shippingLocation)

    if (!hasManualAddress && !hasCoordinates) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['shipping'],
        message: 'يجب توفير العنوان يدويًا أو تحديد الموقع الجغرافي',
      })
    }
  })

export const validateCouponSchema = z.object({
  storeId: z.string().uuid(),
  code: z.string().min(1, 'كود الكوبون مطلوب'),
  subtotal: z.number().min(0),
  customerPhone: z.string().optional(),
  cartProductIds: z.array(z.string()).optional(),
  cartCategoryIds: z.array(z.string()).optional(),
})

export const calculateShippingSchema = z.object({
  storeId: z.string().uuid(),
  governorate: z.string().min(1, 'المحافظة مطلوبة'),
})

export const updateOrderStatusSchema = z.object({
  orderStatus: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  trackingNumber: z.string().optional().nullable(),
  shippingCompany: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
})

const couponTypeSchema = z.enum(['percentage', 'fixed'], {
  error: 'نوع الخصم غير صالح',
})

function addCouponCrossFieldIssues(
  data: {
    type?: 'percentage' | 'fixed'
    value?: number
    startsAt?: Date | null
    expiresAt?: Date | null
  },
  ctx: z.RefinementCtx,
  options: { allowMissingValue: boolean }
) {
  const hasInvalidPercentageValue = options.allowMissingValue
    ? data.type === 'percentage' && typeof data.value === 'number' && data.value > 100
    : data.type === 'percentage' && data.value! > 100

  if (hasInvalidPercentageValue) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: 'نسبة الخصم يجب ألا تتجاوز 100%',
    })
  }

  if (data.startsAt && data.expiresAt && data.expiresAt < data.startsAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expiresAt'],
      message: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية',
    })
  }
}

const couponSchemaBase = z.object({
  code: z
    .string()
    .trim()
    .min(2, { error: '\u0643\u0648\u062f \u0627\u0644\u0643\u0648\u0628\u0648\u0646 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u062d\u0631\u0641\u064a\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644' })
    .max(30, { error: '\u0643\u0648\u062f \u0627\u0644\u0643\u0648\u0628\u0648\u0646 \u064a\u062c\u0628 \u0623\u0644\u0627 \u064a\u062a\u062c\u0627\u0648\u0632 30 \u062d\u0631\u0641\u0627\u064b' })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      error: '\u0643\u0648\u062f \u0627\u0644\u0643\u0648\u0628\u0648\u0646 \u064a\u0642\u0628\u0644 \u0627\u0644\u062d\u0631\u0648\u0641 \u0648\u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0648\u0627\u0644\u0634\u0631\u0637\u0629 \u0641\u0642\u0637',
    })
    .transform((value) => value.toUpperCase()),
  type: couponTypeSchema,
  value: z.coerce
    .number({ error: '\u0642\u064a\u0645\u0629 \u0627\u0644\u062e\u0635\u0645 \u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064b' })
    .min(0.01, { error: '\u0642\u064a\u0645\u0629 \u0627\u0644\u062e\u0635\u0645 \u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0635\u0641\u0631' }),
  minOrderAmount: z.coerce
    .number({ error: '\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u062f\u0646\u0649 \u0644\u0644\u0637\u0644\u0628 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064b' })
    .min(0, { error: '\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u062f\u0646\u0649 \u0644\u0644\u0637\u0644\u0628 \u0644\u0627 \u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0633\u0627\u0644\u0628\u0627\u064b' })
    .optional()
    .nullable(),
  maxDiscount: z.coerce
    .number({ error: '\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u062e\u0635\u0645 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064b' })
    .min(0, { error: '\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u062e\u0635\u0645 \u0644\u0627 \u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0633\u0627\u0644\u0628\u0627\u064b' })
    .optional()
    .nullable(),
  usageLimit: z.coerce
    .number({ error: '\u062d\u062f \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064b' })
    .int({ error: '\u062d\u062f \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0639\u062f\u062f\u0627\u064b \u0635\u062d\u064a\u062d\u0627\u064b' })
    .min(1, { error: '\u062d\u062f \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 1 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644' })
    .optional()
    .nullable(),
  startsAt: z.coerce
    .date({ error: '\u062a\u0627\u0631\u064a\u062e \u0628\u062f\u0627\u064a\u0629 \u0627\u0644\u0643\u0648\u0628\u0648\u0646 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d' })
    .optional()
    .nullable(),
  expiresAt: z.coerce
    .date({ error: '\u062a\u0627\u0631\u064a\u062e \u0627\u0646\u062a\u0647\u0627\u0621 \u0627\u0644\u0643\u0648\u0628\u0648\u0646 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d' })
    .optional()
    .nullable(),
  isActive: z.coerce.boolean().default(true),
  // P3: Advanced Coupon Fields
  firstOrderOnly: z.coerce.boolean().default(false),
  applicableProductIds: z.array(z.string().uuid()).default([]),
  applicableCategoryIds: z.array(z.string().uuid()).default([]),
  isFreeShipping: z.coerce.boolean().default(false),
  autoApply: z.coerce.boolean().default(false),
  usagePerCustomer: z.coerce
    .number({ error: 'حد الاستخدام لكل عميل يجب أن يكون رقماً' })
    .int({ error: 'حد الاستخدام لكل عميل يجب أن يكون عدداً صحيحاً' })
    .min(1, { error: 'حد الاستخدام لكل عميل يجب أن يكون 1 على الأقل' })
    .optional()
    .nullable(),
})

export const createCouponSchema = couponSchemaBase.superRefine((data, ctx) => {
  addCouponCrossFieldIssues(data, ctx, { allowMissingValue: false })
})

export const updateCouponSchema = couponSchemaBase.partial().superRefine((data, ctx) => {
  addCouponCrossFieldIssues(data, ctx, { allowMissingValue: true })
})

export const createShippingZoneSchema = z.object({
  name: z.string().trim().min(1, { error: 'اسم المنطقة مطلوب' }),
  governorates: z
    .array(z.string().trim().min(1, { error: 'اسم المحافظة غير صالح' }))
    .min(1, { error: 'يجب اختيار محافظة واحدة على الأقل' })
    .max(1, { error: 'يجب اختيار محافظة واحدة فقط' }),
  shippingFee: z.coerce
    .number({ error: 'رسوم الشحن يجب أن تكون رقمًا' })
    .min(0, { error: 'رسوم الشحن يجب أن تكون 0 أو أكثر' }),
  freeShippingMinimum: z.coerce
    .number({ error: 'حد الشحن المجاني يجب أن يكون رقمًا' })
    .min(0, { error: 'حد الشحن المجاني يجب أن يكون 0 أو أكثر' })
    .optional()
    .nullable(),
  estimatedDays: z.string().optional().nullable(),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce
    .number({ error: 'الترتيب يجب أن يكون رقمًا' })
    .int({ error: 'الترتيب يجب أن يكون رقمًا صحيحًا' })
    .default(0),
})

export const updateShippingZoneSchema = createShippingZoneSchema.partial()

const pageBlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['hero', 'text', 'image', 'products', 'cta', 'testimonials', 'faq', 'video', 'gallery', 'form']),
  content: z.record(z.string(), z.unknown()).default({}),
  settings: z.record(z.string(), z.unknown()).default({}),
  order: z.number().int().min(0),
})

export const createPageSchema = z.object({
  title: z.string().min(1, 'عنوان الصفحة مطلوب').max(200),
  slug: z.string().min(1).max(200),
  content: z.array(pageBlockSchema).max(50).default([]),
  pageType: z.enum(['landing', 'about', 'contact', 'faq', 'terms', 'privacy', 'custom']).default('landing'),
  isPublished: z.coerce.boolean().default(false),
  seoTitle: z.string().max(70).optional().nullable(),
  seoDescription: z.string().max(160).optional().nullable(),
})

export const updatePageSchema = createPageSchema.partial()

const nullableLinkSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z
    .string()
    .trim()
    .refine(
      (value) => value.startsWith('/') || /^https?:\/\//i.test(value),
      { message: '\u0631\u0627\u0628\u0637 \u0627\u0644\u0632\u0631 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0628\u062f\u0623 \u0628\u0640 / \u0623\u0648 http:// \u0623\u0648 https://' }
    )
    .nullable()
)

export const createHeroSlideSchema = z.object({
  title: z.string().trim().optional().nullable(),
  subtitle: z.string().trim().optional().nullable(),
  imageUrl: z.string().url({ error: '\u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0648\u0631\u0629 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d' }),
  linkUrl: nullableLinkSchema.optional(),
  buttonText: z.string().trim().optional().nullable(),
  sortOrder: z.coerce
    .number({ error: 'الترتيب يجب أن يكون رقمًا' })
    .int({ error: 'الترتيب يجب أن يكون رقمًا صحيحًا' })
    .default(0),
  isActive: z.coerce.boolean().default(true),
})

export const updateHeroSlideSchema = createHeroSlideSchema.partial()

// ========== Admin Plan Schemas ==========
export const createPlanSchema = z.object({
  id: z.string().min(1, 'معرف الخطة مطلوب').max(50),
  name: z.string().min(1, 'اسم الخطة مطلوب'),
  nameEn: z.string().optional().nullable(),
  priceMonthly: z.coerce.number().min(0, 'السعر يجب أن يكون 0 أو أكثر'),
  priceYearly: z.coerce.number().min(0).optional().nullable(),
  orderFee: z.coerce.number().min(0).optional().nullable(),
  maxProducts: z.coerce.number().int().min(0).optional().nullable(),
  maxOrdersPerMonth: z.coerce.number().int().min(0).optional().nullable(),
  features: z.array(z.string()).default([]),
  isMostPopular: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
})

export const updatePlanSchema = createPlanSchema.partial().omit({ id: true })


