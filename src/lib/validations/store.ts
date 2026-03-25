import { z } from 'zod'

/**
 * Slugs محجوزة — لا يسمح بإنشاء متجر بأي منها
 * لأنها تتعارض مع routing الـ middleware و DNS
 */
const RESERVED_SLUGS = [
  'www', 'api', 'admin', 'auth', 'store', 'dashboard',
  'app', 'mail', 'ftp', 'ns1', 'ns2', 'cdn', 'static',
  'assets', 'media', 'blog', 'help', 'support', 'docs',
  'dev', 'staging', 'test', 'demo', 'beta', 'alpha',
  'status', 'health', 'ping', 'webhook', 'webhooks',
  'super-admin', 'platform', 'onboarding', 'pricing',
  'checkout', 'cart', 'payment', 'payments',
  'sign-in', 'sign-up', 'login', 'register', 'logout',
] as const

export const createStoreSchema = z.object({
  name: z
    .string()
    .min(2, 'اسم المتجر يجب أن يكون حرفين على الأقل')
    .max(50, 'اسم المتجر يجب ألا يتجاوز 50 حرف'),
  slug: z
    .string()
    .min(3, 'رابط المتجر يجب أن يكون 3 أحرف على الأقل')
    .max(30, 'رابط المتجر يجب ألا يتجاوز 30 حرف')
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'رابط المتجر يجب أن يبدأ وينتهي بحرف أو رقم، ويحتوي فقط على أحرف إنجليزية صغيرة وأرقام وشرطات')
    .refine(
      (val) => !RESERVED_SLUGS.includes(val as typeof RESERVED_SLUGS[number]),
      { message: 'هذا الرابط محجوز ولا يمكن استخدامه. اختر رابطاً آخر.' }
    ),
  category: z.enum(['clothing', 'electronics', 'food', 'beauty', 'other'], {
    error: 'تصنيف غير صالح',
  }).optional(),
  planId: z.string().optional(),
})

export const updateStoreSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional(),
  contactEmail: z.email('البريد الإلكتروني غير صالح').optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactWhatsapp: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
})

export const updateStoreSettingsSchema = z.object({
  currency: z.enum(['EGP', 'SAR', 'AED', 'USD']).optional(),
  language: z.enum(['ar', 'en']).optional(),
  direction: z.enum(['rtl', 'ltr']).optional(),
  showOutOfStock: z.boolean().optional(),
  requirePhone: z.boolean().optional(),
  requireEmail: z.boolean().optional(),
  minOrderAmount: z.number().nullable().optional(),
  maxOrderAmount: z.number().nullable().optional(),
  enableCod: z.boolean().optional(),
  enableKashier: z.boolean().optional(),
  kashierMerchantId: z.string().trim().max(100).optional().nullable(),

  // Tracking Pixels
  facebookPixelId: z.string().max(20).trim().nullable().optional(),
  facebookConversionApiToken: z.string().max(500).trim().nullable().optional(),
  facebookTestEventCode: z.string().max(20).trim().nullable().optional(),
  tiktokPixelId: z.string().max(30).trim().nullable().optional(),
  googleAnalyticsId: z.string().max(20).trim().nullable().optional(),
  snapchatPixelId: z.string().max(50).trim().nullable().optional(),

  // WhatsApp
  whatsappFloatingEnabled: z.boolean().optional(),
  whatsappFloatingPosition: z.enum(['left', 'right']).optional(),
  whatsappDefaultMessage: z.string().max(500).trim().nullable().optional(),
  whatsappOrderButtonEnabled: z.boolean().optional(),

  // Email Notifications
  emailNotificationsEnabled: z.boolean().optional(),
  merchantEmailOnNewOrder: z.boolean().optional(),
})

export const updateThemeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  fontFamily: z.string().optional(),
  borderRadius: z.string().optional(),
  headerStyle: z.enum(['simple', 'centered', 'full']).optional(),
})

export const socialLinksSchema = z.object({
  facebook: z.string().url().optional().or(z.literal('')),
  instagram: z.string().url().optional().or(z.literal('')),
  twitter: z.string().url().optional().or(z.literal('')),
  tiktok: z.string().url().optional().or(z.literal('')),
  youtube: z.string().url().optional().or(z.literal('')),
  whatsapp: z.string().optional().or(z.literal('')),
})

/**
 * Schema لتعديل متجر من Super Admin
 * يُستخدم في: PATCH /api/admin/stores/[id]
 */
export const updateAdminStoreSchema = z.object({
  isActive: z.boolean({ error: 'حالة التفعيل يجب أن تكون true أو false' }).optional(),
  plan: z.enum(['free', 'basic', 'pro'], { error: 'خطة غير صالحة' }).optional(),
  isPaid: z.boolean({ error: 'حالة الدفع يجب أن تكون true أو false' }).optional(),
})
