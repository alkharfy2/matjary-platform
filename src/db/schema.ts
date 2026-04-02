import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'

// ============================================
// TYPE DEFINITIONS
// ============================================

export type StoreTheme = {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  borderRadius: string
  headerStyle: 'simple' | 'centered' | 'full'
}

export type StoreSettings = {
  currency: string
  language: 'ar' | 'en'
  direction: 'rtl' | 'ltr'
  showOutOfStock: boolean
  requirePhone: boolean
  requireEmail: boolean
  minOrderAmount: number | null
  maxOrderAmount: number | null
  enableCod: boolean
  enableKashier: boolean
  kashierMerchantId: string | null

  // Tracking Pixels
  facebookPixelId: string | null
  facebookConversionApiToken: string | null
  facebookTestEventCode: string | null
  tiktokPixelId: string | null
  googleAnalyticsId: string | null
  snapchatPixelId: string | null

  // WhatsApp
  whatsappFloatingEnabled: boolean
  whatsappFloatingPosition: 'left' | 'right'
  whatsappDefaultMessage: string | null
  whatsappOrderButtonEnabled: boolean

  // Email Notifications
  emailNotificationsEnabled: boolean
  merchantEmailOnNewOrder: boolean

  // P1: Fake Order Blocker
  fakeOrderBlockerEnabled: boolean
  fakeOrderMinTrustScore: number
  fakeOrderAutoReject: boolean

  // P1: Abandoned Cart Recovery
  abandonedCartEnabled: boolean
  abandonedCartDelayMinutes: number
  abandonedCartMessage: string | null
  abandonedCartChannel: 'whatsapp' | 'email' | 'both'

  // P1: Exit-Intent Popup
  exitIntentEnabled: boolean
  exitIntentMessage: string | null
  exitIntentCouponCode: string | null
  exitIntentPages: string[]

  // P2: AI Features
  aiEnabled: boolean
  aiInsightsEnabled: boolean
  aiInsightsLastGenerated: string | null
  aiInsightsCache: string | null

  // P3: Blog
  blogEnabled: boolean

  // P3: PWA
  pwaEnabled: boolean

  // P3: Loyalty
  loyaltyEnabled: boolean
  loyaltyPointsPerEgp: number
  loyaltyPointValue: number
  loyaltyMinRedemption: number
  loyaltyMaxRedemptionPercent: number

  // P3: Affiliate
  affiliateEnabled: boolean
  affiliateDefaultCommission: number

  // P3: Dropshipping
  dropshippingEnabled: boolean

  // P3: Multi-language
  defaultLanguage: 'ar' | 'en'
  supportedLanguages: string[]

  // P4-A: Customer Accounts
  customerAccountsEnabled: boolean
  customerAuthMethods: ('phone' | 'email')[]
  requireAccountForCheckout: boolean
  guestCheckoutAllowed: boolean

  // P4-A: Wishlist
  wishlistEnabled: boolean
  wishlistGuestMode: boolean

  // P4-A: Quick Checkout
  quickCheckoutEnabled: boolean
  quickCheckoutMode: 'redirect' | 'modal'
  skipCartEnabled: boolean

  // P4-B: Reviews
  reviewsEnabled: boolean
  reviewAutoApprove: boolean
  reviewImagesAllowed: boolean
  reviewImagesMax: number

  // P4-B: Auto Review Request
  autoReviewRequestEnabled: boolean
  reviewRequestDelay: number
  reviewRequestChannel: 'email' | 'whatsapp' | 'both'
  reviewLoyaltyPoints: number

  // P4-B: Facebook CAPI
  facebookConversionApiEnabled: boolean

  // P4-D: Product Comparison
  comparisonEnabled: boolean
  comparisonMaxItems: number
}

export type SocialLinks = {
  facebook?: string
  instagram?: string
  twitter?: string
  tiktok?: string
  youtube?: string
  whatsapp?: string
}

export type ShippingAddress = {
  governorate: string
  city: string
  area: string
  street: string
  building?: string
  floor?: string
  apartment?: string
  landmark?: string
  postalCode?: string
}

export type SavedAddress = ShippingAddress & {
  id: string
  label: string
  isDefault: boolean
  customerName?: string
  customerPhone?: string
}

export type VariantOption = {
  name: string
  value: string
}

export type ProductVariant = {
  id: string
  options: VariantOption[]
  price: number | null
  compareAtPrice?: number | null
  stock: number
  sku?: string | null
  imageUrl?: string | null
  isActive?: boolean
}

export type OrderItem = {
  productId: string
  variantId?: string
  name: string
  price: number
  quantity: number
  variant?: VariantOption[]
  image?: string
}

export type PageBlock = {
  id: string
  type: 'hero' | 'text' | 'image' | 'products' | 'cta' | 'testimonials' | 'faq' | 'video' | 'gallery' | 'form'
  content: Record<string, unknown>
  settings: Record<string, unknown>
  order: number
}

export type ShippingZoneArea = {
  name: string
  fee: number
}

// ============================================
// 1. MERCHANTS
// ============================================
export const merchants = pgTable('merchants', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').unique().notNull(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true).notNull(),
  balance: decimal('balance', { precision: 12, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ============================================
// 2. STORES
// ============================================
export const stores = pgTable('stores', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id')
    .references(() => merchants.id, { onDelete: 'cascade' })
    .unique()
    .notNull(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  category: text('category'),
  description: text('description'),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  theme: jsonb('theme').$type<StoreTheme>().default({
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    accentColor: '#3b82f6',
    fontFamily: 'Cairo',
    borderRadius: '8px',
    headerStyle: 'simple',
  }).notNull(),
  settings: jsonb('settings').$type<StoreSettings>().default({
    currency: 'EGP',
    language: 'ar',
    direction: 'rtl',
    showOutOfStock: false,
    requirePhone: true,
    requireEmail: false,
    minOrderAmount: null,
    maxOrderAmount: null,
    enableCod: true,
    enableKashier: true,
    kashierMerchantId: null,
    facebookPixelId: null,
    facebookConversionApiToken: null,
    facebookTestEventCode: null,
    tiktokPixelId: null,
    googleAnalyticsId: null,
    snapchatPixelId: null,
    whatsappFloatingEnabled: true,
    whatsappFloatingPosition: 'left',
    whatsappDefaultMessage: null,
    whatsappOrderButtonEnabled: false,
    emailNotificationsEnabled: true,
    merchantEmailOnNewOrder: true,
    fakeOrderBlockerEnabled: false,
    fakeOrderMinTrustScore: 30,
    fakeOrderAutoReject: false,
    abandonedCartEnabled: false,
    abandonedCartDelayMinutes: 60,
    abandonedCartMessage: null,
    abandonedCartChannel: 'whatsapp',
    exitIntentEnabled: false,
    exitIntentMessage: null,
    exitIntentCouponCode: null,
    exitIntentPages: [],
    aiEnabled: true,
    aiInsightsEnabled: true,
    aiInsightsLastGenerated: null,
    aiInsightsCache: null,
    blogEnabled: false,
    pwaEnabled: false,
    loyaltyEnabled: false,
    loyaltyPointsPerEgp: 1,
    loyaltyPointValue: 0.1,
    loyaltyMinRedemption: 100,
    loyaltyMaxRedemptionPercent: 50,
    affiliateEnabled: false,
    affiliateDefaultCommission: 10,
    dropshippingEnabled: false,
    defaultLanguage: 'ar',
    supportedLanguages: ['ar'],
    customerAccountsEnabled: true,
    customerAuthMethods: ['phone'],
    requireAccountForCheckout: false,
    guestCheckoutAllowed: true,
    wishlistEnabled: true,
    wishlistGuestMode: true,
    quickCheckoutEnabled: true,
    quickCheckoutMode: 'redirect',
    skipCartEnabled: false,
    reviewsEnabled: true,
    reviewAutoApprove: false,
    reviewImagesAllowed: true,
    reviewImagesMax: 3,
    autoReviewRequestEnabled: true,
    reviewRequestDelay: 2,
    reviewRequestChannel: 'email',
    reviewLoyaltyPoints: 5,
    facebookConversionApiEnabled: false,
    // P4-D
    comparisonEnabled: true,
    comparisonMaxItems: 4,
  }).notNull(),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  contactWhatsapp: text('contact_whatsapp'),
  address: text('address'),
  socialLinks: jsonb('social_links').$type<SocialLinks>().default({}),
  isActive: boolean('is_active').default(true).notNull(),
  plan: text('plan').default('free').notNull(),
  isPaid: boolean('is_paid').default(false).notNull(),
  subscriptionAmount: decimal('subscription_amount', { precision: 10, scale: 2 }),
  subscriptionPaidAt: timestamp('subscription_paid_at', { withTimezone: true }),
  subscriptionTransactionId: text('subscription_transaction_id'),
  aiGenerated: boolean('ai_generated').notNull().default(false),
  customDomain: text('custom_domain'),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_stores_slug').on(table.slug),
  index('idx_stores_merchant').on(table.merchantId),
  index('idx_stores_custom_domain').on(table.customDomain),
])

// ============================================
// 3. STORE CATEGORIES
// ============================================
export const storeCategories = pgTable('store_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => storeCategories.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uniq_category_store_slug').on(table.storeId, table.slug),
  index('idx_categories_store').on(table.storeId),
  index('idx_categories_parent').on(table.parentId),
])

// ============================================
// 4. STORE PRODUCTS
// ============================================
export const storeProducts = pgTable('store_products', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  categoryId: uuid('category_id')
    .references(() => storeCategories.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  shortDescription: text('short_description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal('compare_at_price', { precision: 10, scale: 2 }),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }),
  sku: text('sku'),
  barcode: text('barcode'),
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  variants: jsonb('variants').$type<ProductVariant[]>().default([]).notNull(),
  stock: integer('stock').default(0).notNull(),
  trackInventory: boolean('track_inventory').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  isDigital: boolean('is_digital').default(false).notNull(),
  weight: decimal('weight', { precision: 8, scale: 2 }),
  tags: text('tags').array().default([]),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  sortOrder: integer('sort_order').default(0).notNull(),
  // P3: Multi-language translations
  translations: jsonb('translations').$type<Record<string, { name?: string; description?: string; shortDescription?: string }>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uniq_product_store_slug').on(table.storeId, table.slug),
  index('idx_products_store').on(table.storeId),
  index('idx_products_category').on(table.categoryId),
  index('idx_products_store_active').on(table.storeId, table.isActive),
  index('idx_products_store_featured').on(table.storeId, table.isFeatured),
])

// ============================================
// 5. STORE CUSTOMERS (defined before orders for FK reference)
// ============================================
export const storeCustomers = pgTable('store_customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  address: jsonb('address').$type<ShippingAddress>(),
  totalOrders: integer('total_orders').default(0).notNull(),
  totalSpent: decimal('total_spent', { precision: 10, scale: 2 }).default('0').notNull(),
  lastOrderAt: timestamp('last_order_at', { withTimezone: true }),
  notes: text('notes'),
  isBlocked: boolean('is_blocked').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uniq_customer_store_phone').on(table.storeId, table.phone),
  index('idx_customers_store').on(table.storeId),
])

// ============================================
// 6. STORE ORDERS
// ============================================
export const storeOrders = pgTable('store_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  orderNumber: text('order_number').notNull(),
  customerId: uuid('customer_id')
    .references(() => storeCustomers.id, { onDelete: 'set null' }),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email'),
  shippingAddress: jsonb('shipping_address').$type<ShippingAddress>().notNull(),
  shippingLatitude: decimal('shipping_latitude', { precision: 10, scale: 7 }),
  shippingLongitude: decimal('shipping_longitude', { precision: 10, scale: 7 }),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal('shipping_cost', { precision: 10, scale: 2 }).default('0').notNull(),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0').notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  couponCode: text('coupon_code'),
  paymentMethod: text('payment_method').notNull(),
  paymentStatus: text('payment_status').default('pending').notNull(),
  orderStatus: text('order_status').default('pending').notNull(),
  notes: text('notes'),
  internalNotes: text('internal_notes'),
  trackingNumber: text('tracking_number'),
  shippingCompany: text('shipping_company'),
  kashierOrderId: text('kashier_order_id'),
  kashierPaymentId: text('kashier_payment_id'),
  isFeeDeducted: boolean('is_fee_deducted').default(false).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uniq_order_store_number').on(table.storeId, table.orderNumber),
  index('idx_orders_store').on(table.storeId),
  index('idx_orders_store_status').on(table.storeId, table.orderStatus),
  index('idx_orders_store_payment').on(table.storeId, table.paymentStatus),
  index('idx_orders_customer').on(table.customerId),
  index('idx_orders_created').on(table.createdAt),
])

// ============================================
// 7. STORE ORDER ITEMS
// ============================================
export const storeOrderItems = pgTable('store_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .references(() => storeOrders.id, { onDelete: 'cascade' })
    .notNull(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  productId: uuid('product_id')
    .references(() => storeProducts.id, { onDelete: 'set null' }),
  variantId: text('variant_id'),
  name: text('name').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  variantOptions: jsonb('variant_options').$type<VariantOption[]>(),
  image: text('image'),
}, (table) => [
  index('idx_order_items_order').on(table.orderId),
  index('idx_order_items_store').on(table.storeId),
  index('idx_order_items_product').on(table.productId),
])

// ============================================
// 8. STORE SHIPPING ZONES
// ============================================
export const storeShippingZones = pgTable('store_shipping_zones', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  governorates: jsonb('governorates').$type<string[]>().default([]).notNull(),
  shippingFee: decimal('shipping_fee', { precision: 10, scale: 2 }).notNull(),
  freeShippingMinimum: decimal('free_shipping_minimum', { precision: 10, scale: 2 }),
  estimatedDays: text('estimated_days'),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_shipping_zones_store').on(table.storeId),
])

// ============================================
// 9. STORE COUPONS
// ============================================
export const storeCoupons = pgTable('store_coupons', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  code: text('code').notNull(),
  type: text('type').notNull(),
  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal('min_order_amount', { precision: 10, scale: 2 }),
  maxDiscount: decimal('max_discount', { precision: 10, scale: 2 }),
  usageLimit: integer('usage_limit'),
  usedCount: integer('used_count').default(0).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true).notNull(),
  // P3: Advanced Coupons
  firstOrderOnly: boolean('first_order_only').default(false).notNull(),
  applicableProductIds: text('applicable_product_ids').array().$type<string[]>().default([]),
  applicableCategoryIds: text('applicable_category_ids').array().$type<string[]>().default([]),
  isFreeShipping: boolean('is_free_shipping').default(false).notNull(),
  autoApply: boolean('auto_apply').default(false).notNull(),
  usagePerCustomer: integer('usage_per_customer'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uniq_coupon_store_code').on(table.storeId, table.code),
  index('idx_coupons_store').on(table.storeId),
])

// ============================================
// 10. STORE PAGES (Landing Page Builder)
// ============================================
export const storePages = pgTable('store_pages', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  content: jsonb('content').$type<PageBlock[]>().default([]).notNull(),
  pageType: text('page_type').default('landing').notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uniq_page_store_slug').on(table.storeId, table.slug),
  index('idx_pages_store').on(table.storeId),
])

// ============================================
// 11. STORE HERO SLIDES
// ============================================
export const storeHeroSlides = pgTable('store_hero_slides', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title'),
  subtitle: text('subtitle'),
  imageUrl: text('image_url').notNull(),
  linkUrl: text('link_url'),
  buttonText: text('button_text'),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_hero_slides_store').on(table.storeId),
])

// ============================================
// 12. STORE REVIEWS (Enhanced P4-B)
// ============================================
export const storeReviews = pgTable('store_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  productId: uuid('product_id')
    .references(() => storeProducts.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id')
    .references(() => storeOrders.id, { onDelete: 'set null' }),
  customerAccountId: uuid('customer_account_id'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  images: jsonb('images').$type<string[]>().default([]),
  isVerifiedPurchase: boolean('is_verified_purchase').default(false).notNull(),
  isApproved: boolean('is_approved').default(false).notNull(),
  merchantReply: text('merchant_reply'),
  merchantReplyAt: timestamp('merchant_reply_at', { withTimezone: true }),
  helpfulCount: integer('helpful_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_reviews_store').on(table.storeId),
  index('idx_reviews_product').on(table.productId),
])

// ============================================
// 12b. MERCHANT WALLET TRANSACTIONS
// ============================================
export const merchantWalletTransactions = pgTable('merchant_wallet_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id')
    .references(() => merchants.id, { onDelete: 'cascade' })
    .notNull(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'set null' }),
  orderId: uuid('order_id')
    .references(() => storeOrders.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  balanceBefore: decimal('balance_before', { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 12, scale: 2 }).notNull(),
  reference: text('reference'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_wallet_tx_merchant').on(table.merchantId),
  index('idx_wallet_tx_store').on(table.storeId),
  index('idx_wallet_tx_order').on(table.orderId),
  index('idx_wallet_tx_created').on(table.createdAt),
])

// ============================================
// 13. PLATFORM PLANS
// ============================================
export const platformPlans = pgTable('platform_plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameEn: text('name_en'),
  priceMonthly: decimal('price_monthly', { precision: 10, scale: 2 }).notNull(),
  priceYearly: decimal('price_yearly', { precision: 10, scale: 2 }),
  orderFee: decimal('order_fee', { precision: 10, scale: 4 }),
  maxProducts: integer('max_products'),
  maxOrdersPerMonth: integer('max_orders_per_month'),
  features: jsonb('features').$type<string[]>().default([]).notNull(),
  isMostPopular: boolean('is_most_popular').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
})

// ============================================
// 14. PLATFORM ACTIVITY LOG
// ============================================
export const platformActivityLog = pgTable('platform_activity_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').references(() => stores.id, { onDelete: 'cascade' }),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_activity_store').on(table.storeId),
  index('idx_activity_merchant').on(table.merchantId),
  index('idx_activity_created').on(table.createdAt),
])

// ============================================
// 15. PLATFORM CUSTOMERS (P1 — Fake Order Blocker)
// ============================================
export const platformCustomers = pgTable('platform_customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: text('phone').unique().notNull(),
  totalOrders: integer('total_orders').default(0).notNull(),
  completedOrders: integer('completed_orders').default(0).notNull(),
  rejectedOrders: integer('rejected_orders').default(0).notNull(),
  trustScore: decimal('trust_score', { precision: 5, scale: 2 }).default('100.00').notNull(),
  isBlocked: boolean('is_blocked').default(false).notNull(),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
  lastOrderAt: timestamp('last_order_at', { withTimezone: true }),
}, (table) => [
  index('idx_platform_customers_phone').on(table.phone),
  index('idx_platform_customers_trust').on(table.trustScore),
])

// ============================================
// 16. STORE CUSTOMER BLOCKS (P1 — Fake Order Blocker)
// ============================================
export const storeCustomerBlocks = pgTable('store_customer_blocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  customerPhone: text('customer_phone').notNull(),
  reason: text('reason'),
  blockedAt: timestamp('blocked_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uniq_block_store_phone').on(table.storeId, table.customerPhone),
  index('idx_customer_blocks_store').on(table.storeId),
  index('idx_customer_blocks_phone').on(table.customerPhone),
])

// ============================================
// 17. STORE ABANDONED CARTS (P1 — Abandoned Cart Recovery)
// ============================================
export const storeAbandonedCarts = pgTable('store_abandoned_carts', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email'),
  items: jsonb('items').$type<Array<{
    productId: string
    productName: string
    productImage: string | null
    variantId: string | null
    variantLabel: string | null
    quantity: number
    unitPrice: number
  }>>().notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  recoveryStatus: text('recovery_status', {
    enum: ['pending', 'sent', 'recovered', 'expired'],
  }).notNull().default('pending'),
  recoverySentAt: timestamp('recovery_sent_at', { withTimezone: true }),
  recoveredOrderId: uuid('recovered_order_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('idx_abandoned_carts_store').on(table.storeId),
  index('idx_abandoned_carts_status').on(table.recoveryStatus),
  index('idx_abandoned_carts_phone').on(table.customerPhone),
])

// ============================================
// 18. STORE UPSELL RULES (P1 — Upsell)
// ============================================
export const storeUpsellRules = pgTable('store_upsell_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  triggerProductId: uuid('trigger_product_id'),
  offerProductId: uuid('offer_product_id')
    .references(() => storeProducts.id, { onDelete: 'cascade' })
    .notNull(),
  discountType: text('discount_type', { enum: ['percentage', 'fixed'] }).notNull().default('percentage'),
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_upsell_store').on(table.storeId),
  index('idx_upsell_trigger').on(table.triggerProductId),
])

// ============================================
// 19. STORE PRODUCT RELATIONS (P1 — Cross-sell)
// ============================================
export const storeProductRelations = pgTable('store_product_relations', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  productId: uuid('product_id')
    .references(() => storeProducts.id, { onDelete: 'cascade' })
    .notNull(),
  relatedProductId: uuid('related_product_id')
    .references(() => storeProducts.id, { onDelete: 'cascade' })
    .notNull(),
  relationType: text('relation_type', {
    enum: ['cross_sell', 'upsell', 'related'],
  }).notNull().default('cross_sell'),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uniq_product_relation').on(table.storeId, table.productId, table.relatedProductId, table.relationType),
  index('idx_relations_product').on(table.productId),
])

// ============================================
// RELATIONS
// ============================================
export const merchantsRelations = relations(merchants, ({ one }) => ({
  store: one(stores, {
    fields: [merchants.id],
    references: [stores.merchantId],
  }),
}))

export const storesRelations = relations(stores, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [stores.merchantId],
    references: [merchants.id],
  }),
  products: many(storeProducts),
  categories: many(storeCategories),
  orders: many(storeOrders),
  orderItems: many(storeOrderItems),
  customers: many(storeCustomers),
  shippingZones: many(storeShippingZones),
  coupons: many(storeCoupons),
  pages: many(storePages),
  heroSlides: many(storeHeroSlides),
  reviews: many(storeReviews),
  activityLog: many(platformActivityLog),
  abandonedCarts: many(storeAbandonedCarts),
  customerBlocks: many(storeCustomerBlocks),
  upsellRules: many(storeUpsellRules),
  productRelations: many(storeProductRelations),
  blogPosts: many(storeBlogPosts),
  loyaltyPoints: many(storeLoyaltyPoints),
  affiliates: many(storeAffiliates),
  supplierProducts: many(storeSupplierProducts),
  shippingAccounts: many(storeShippingAccounts),
  aiUsage: many(storeAiUsage),
  customerAccounts: many(storeCustomerAccounts),
  wishlists: many(storeWishlists),
  reviewRequests: many(storeReviewRequests),
}))

export const storeCategoriesRelations = relations(storeCategories, ({ one, many }) => ({
  store: one(stores, {
    fields: [storeCategories.storeId],
    references: [stores.id],
  }),
  parent: one(storeCategories, {
    fields: [storeCategories.parentId],
    references: [storeCategories.id],
  }),
  products: many(storeProducts),
}))

export const storeProductsRelations = relations(storeProducts, ({ one, many }) => ({
  store: one(stores, {
    fields: [storeProducts.storeId],
    references: [stores.id],
  }),
  category: one(storeCategories, {
    fields: [storeProducts.categoryId],
    references: [storeCategories.id],
  }),
  reviews: many(storeReviews),
  orderItems: many(storeOrderItems),
  upsellRules: many(storeUpsellRules),
  productRelationsAsSource: many(storeProductRelations, { relationName: 'productRelationsSource' }),
  productRelationsAsTarget: many(storeProductRelations, { relationName: 'productRelationsTarget' }),
}))

export const storeOrdersRelations = relations(storeOrders, ({ one, many }) => ({
  store: one(stores, {
    fields: [storeOrders.storeId],
    references: [stores.id],
  }),
  customer: one(storeCustomers, {
    fields: [storeOrders.customerId],
    references: [storeCustomers.id],
  }),
  items: many(storeOrderItems),
  reviews: many(storeReviews),
}))

export const storeOrderItemsRelations = relations(storeOrderItems, ({ one }) => ({
  order: one(storeOrders, {
    fields: [storeOrderItems.orderId],
    references: [storeOrders.id],
  }),
  store: one(stores, {
    fields: [storeOrderItems.storeId],
    references: [stores.id],
  }),
  product: one(storeProducts, {
    fields: [storeOrderItems.productId],
    references: [storeProducts.id],
  }),
}))

export const storeCustomersRelations = relations(storeCustomers, ({ one, many }) => ({
  store: one(stores, {
    fields: [storeCustomers.storeId],
    references: [stores.id],
  }),
  orders: many(storeOrders),
}))

export const storeShippingZonesRelations = relations(storeShippingZones, ({ one }) => ({
  store: one(stores, {
    fields: [storeShippingZones.storeId],
    references: [stores.id],
  }),
}))

export const storeCouponsRelations = relations(storeCoupons, ({ one }) => ({
  store: one(stores, {
    fields: [storeCoupons.storeId],
    references: [stores.id],
  }),
}))

export const storePagesRelations = relations(storePages, ({ one }) => ({
  store: one(stores, {
    fields: [storePages.storeId],
    references: [stores.id],
  }),
}))

export const storeHeroSlidesRelations = relations(storeHeroSlides, ({ one }) => ({
  store: one(stores, {
    fields: [storeHeroSlides.storeId],
    references: [stores.id],
  }),
}))

export const storeReviewsRelations = relations(storeReviews, ({ one }) => ({
  store: one(stores, {
    fields: [storeReviews.storeId],
    references: [stores.id],
  }),
  product: one(storeProducts, {
    fields: [storeReviews.productId],
    references: [storeProducts.id],
  }),
  order: one(storeOrders, {
    fields: [storeReviews.orderId],
    references: [storeOrders.id],
  }),
}))

export const platformActivityLogRelations = relations(platformActivityLog, ({ one }) => ({
  store: one(stores, {
    fields: [platformActivityLog.storeId],
    references: [stores.id],
  }),
  merchant: one(merchants, {
    fields: [platformActivityLog.merchantId],
    references: [merchants.id],
  }),
}))

export const merchantWalletTransactionsRelations = relations(merchantWalletTransactions, ({ one }) => ({
  merchant: one(merchants, {
    fields: [merchantWalletTransactions.merchantId],
    references: [merchants.id],
  }),
  store: one(stores, {
    fields: [merchantWalletTransactions.storeId],
    references: [stores.id],
  }),
  order: one(storeOrders, {
    fields: [merchantWalletTransactions.orderId],
    references: [storeOrders.id],
  }),
}))

// ============================================
// P1 RELATIONS — New Tables
// ============================================

export const platformCustomersRelations = relations(platformCustomers, () => ({}))

export const storeCustomerBlocksRelations = relations(storeCustomerBlocks, ({ one }) => ({
  store: one(stores, {
    fields: [storeCustomerBlocks.storeId],
    references: [stores.id],
  }),
}))

export const storeAbandonedCartsRelations = relations(storeAbandonedCarts, ({ one }) => ({
  store: one(stores, {
    fields: [storeAbandonedCarts.storeId],
    references: [stores.id],
  }),
}))

export const storeUpsellRulesRelations = relations(storeUpsellRules, ({ one }) => ({
  store: one(stores, {
    fields: [storeUpsellRules.storeId],
    references: [stores.id],
  }),
  offerProduct: one(storeProducts, {
    fields: [storeUpsellRules.offerProductId],
    references: [storeProducts.id],
  }),
}))

export const storeProductRelationsRelations = relations(storeProductRelations, ({ one }) => ({
  store: one(stores, {
    fields: [storeProductRelations.storeId],
    references: [stores.id],
  }),
  product: one(storeProducts, {
    fields: [storeProductRelations.productId],
    references: [storeProducts.id],
    relationName: 'productRelationsSource',
  }),
  relatedProduct: one(storeProducts, {
    fields: [storeProductRelations.relatedProductId],
    references: [storeProducts.id],
    relationName: 'productRelationsTarget',
  }),
}))

// ============================================
// P2: AI USAGE TRACKING
// ============================================

export const storeAiUsage = pgTable('store_ai_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  feature: text('feature', {
    enum: ['store_builder', 'product_description', 'ad_copy', 'insights'],
  }).notNull(),
  tokensUsed: integer('tokens_used').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_ai_usage_store_date').on(table.storeId, table.createdAt),
])

export const storeAiUsageRelations = relations(storeAiUsage, ({ one }) => ({
  store: one(stores, {
    fields: [storeAiUsage.storeId],
    references: [stores.id],
  }),
}))

// ============================================
// P3: STORE BLOG POSTS
// ============================================
export const storeBlogPosts = pgTable('store_blog_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  content: text('content').notNull().default(''),
  featuredImage: text('featured_image'),
  excerpt: text('excerpt'),
  author: text('author'),
  isPublished: boolean('is_published').default(false).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uniq_blog_store_slug').on(table.storeId, table.slug),
  index('idx_blog_posts_store').on(table.storeId),
  index('idx_blog_posts_published').on(table.isPublished, table.publishedAt),
])

// ============================================
// P3: STORE LOYALTY POINTS
// ============================================
export const storeLoyaltyPoints = pgTable('store_loyalty_points', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  customerPhone: text('customer_phone').notNull(),
  points: integer('points').notNull(),
  type: text('type', {
    enum: ['earned', 'redeemed', 'expired', 'adjusted'],
  }).notNull(),
  orderId: uuid('order_id')
    .references(() => storeOrders.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_loyalty_store').on(table.storeId),
  index('idx_loyalty_customer').on(table.storeId, table.customerPhone),
])

// ============================================
// P3: STORE AFFILIATES
// ============================================
export const storeAffiliates = pgTable('store_affiliates', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone').notNull(),
  code: text('code').notNull(),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).notNull().default('10.00'),
  totalSales: decimal('total_sales', { precision: 12, scale: 2 }).notNull().default('0'),
  totalCommission: decimal('total_commission', { precision: 12, scale: 2 }).notNull().default('0'),
  pendingCommission: decimal('pending_commission', { precision: 12, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uniq_affiliate_store_code').on(table.storeId, table.code),
  index('idx_affiliates_store').on(table.storeId),
])

// ============================================
// P3: STORE AFFILIATE SALES
// ============================================
export const storeAffiliateSales = pgTable('store_affiliate_sales', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  affiliateId: uuid('affiliate_id')
    .references(() => storeAffiliates.id, { onDelete: 'cascade' })
    .notNull(),
  orderId: uuid('order_id')
    .references(() => storeOrders.id, { onDelete: 'cascade' })
    .notNull(),
  saleAmount: decimal('sale_amount', { precision: 12, scale: 2 }).notNull(),
  commissionAmount: decimal('commission_amount', { precision: 12, scale: 2 }).notNull(),
  status: text('status', {
    enum: ['pending', 'approved', 'paid', 'cancelled'],
  }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_aff_sales_store').on(table.storeId),
  index('idx_aff_sales_affiliate').on(table.affiliateId),
])

// ============================================
// P3: STORE SUPPLIER PRODUCTS (Dropshipping)
// ============================================
export const storeSupplierProducts = pgTable('store_supplier_products', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  productId: uuid('product_id')
    .references(() => storeProducts.id, { onDelete: 'set null' }),
  supplierName: text('supplier_name').notNull(),
  supplierProductUrl: text('supplier_product_url'),
  supplierPrice: decimal('supplier_price', { precision: 10, scale: 2 }).notNull(),
  retailPrice: decimal('retail_price', { precision: 10, scale: 2 }).notNull(),
  autoOrder: boolean('auto_order').default(false).notNull(),
  leadTimeDays: integer('lead_time_days').default(7),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_supplier_products_store').on(table.storeId),
  index('idx_supplier_products_product').on(table.productId),
])

// ============================================
// P3: STORE SHIPPING ACCOUNTS
// ============================================
export const storeShippingAccounts = pgTable('store_shipping_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  provider: text('provider', {
    enum: ['bosta', 'aramex', 'jnt', 'mylerz'],
  }).notNull(),
  apiKey: text('api_key').notNull(),
  apiSecret: text('api_secret'),
  accountId: text('account_id'),
  isActive: boolean('is_active').default(true).notNull(),
  settings: jsonb('settings').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uniq_shipping_account_store_provider').on(table.storeId, table.provider),
  index('idx_shipping_accounts_store').on(table.storeId),
])

// ============================================
// P3: RELATIONS
// ============================================
export const storeBlogPostsRelations = relations(storeBlogPosts, ({ one }) => ({
  store: one(stores, {
    fields: [storeBlogPosts.storeId],
    references: [stores.id],
  }),
}))

export const storeLoyaltyPointsRelations = relations(storeLoyaltyPoints, ({ one }) => ({
  store: one(stores, {
    fields: [storeLoyaltyPoints.storeId],
    references: [stores.id],
  }),
  order: one(storeOrders, {
    fields: [storeLoyaltyPoints.orderId],
    references: [storeOrders.id],
  }),
}))

export const storeAffiliatesRelations = relations(storeAffiliates, ({ one, many }) => ({
  store: one(stores, {
    fields: [storeAffiliates.storeId],
    references: [stores.id],
  }),
  sales: many(storeAffiliateSales),
}))

export const storeAffiliateSalesRelations = relations(storeAffiliateSales, ({ one }) => ({
  store: one(stores, {
    fields: [storeAffiliateSales.storeId],
    references: [stores.id],
  }),
  affiliate: one(storeAffiliates, {
    fields: [storeAffiliateSales.affiliateId],
    references: [storeAffiliates.id],
  }),
  order: one(storeOrders, {
    fields: [storeAffiliateSales.orderId],
    references: [storeOrders.id],
  }),
}))

export const storeSupplierProductsRelations = relations(storeSupplierProducts, ({ one }) => ({
  store: one(stores, {
    fields: [storeSupplierProducts.storeId],
    references: [stores.id],
  }),
  product: one(storeProducts, {
    fields: [storeSupplierProducts.productId],
    references: [storeProducts.id],
  }),
}))

export const storeShippingAccountsRelations = relations(storeShippingAccounts, ({ one }) => ({
  store: one(stores, {
    fields: [storeShippingAccounts.storeId],
    references: [stores.id],
  }),
}))

// ============================================
// P4-A: CUSTOMER ACCOUNTS + WISHLIST
// ============================================

// ——— جدول حسابات العملاء ———
export const storeCustomerAccounts = pgTable('store_customer_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .references(() => storeCustomers.id),
  phone: text('phone').notNull(),
  phoneVerified: boolean('phone_verified').default(false).notNull(),
  email: text('email'),
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  defaultAddress: jsonb('default_address').$type<ShippingAddress | null>(),
  savedAddresses: jsonb('saved_addresses').$type<SavedAddress[]>().default([]),
  authProvider: text('auth_provider').default('phone').notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uniq_customer_account_store_phone').on(table.storeId, table.phone),
  index('idx_customer_accounts_email').on(table.storeId, table.email),
  index('idx_customer_accounts_customer').on(table.customerId),
])

// ——— جدول OTP ———
export const storeCustomerOtps = pgTable('store_customer_otps', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  phone: text('phone').notNull(),
  otpHash: text('otp_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  isUsed: boolean('is_used').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_customer_otps_lookup').on(table.phone, table.storeId),
  index('idx_customer_otps_expires').on(table.expiresAt),
])

// ——— جدول المفضلة ———
export const storeWishlists = pgTable('store_wishlists', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  customerAccountId: uuid('customer_account_id')
    .notNull()
    .references(() => storeCustomerAccounts.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => storeProducts.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').default('').notNull(),
  priceWhenAdded: decimal('price_when_added', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uniq_wishlist_item').on(
    table.storeId,
    table.customerAccountId,
    table.productId,
    table.variantId,
  ),
  index('idx_wishlists_customer').on(table.storeId, table.customerAccountId),
])

// ——— Relations P4-A ———

export const storeCustomerAccountsRelations = relations(storeCustomerAccounts, ({ one, many }) => ({
  store: one(stores, {
    fields: [storeCustomerAccounts.storeId],
    references: [stores.id],
  }),
  customer: one(storeCustomers, {
    fields: [storeCustomerAccounts.customerId],
    references: [storeCustomers.id],
  }),
  wishlists: many(storeWishlists),
}))

export const storeCustomerOtpsRelations = relations(storeCustomerOtps, ({ one }) => ({
  store: one(stores, {
    fields: [storeCustomerOtps.storeId],
    references: [stores.id],
  }),
}))

export const storeWishlistsRelations = relations(storeWishlists, ({ one }) => ({
  store: one(stores, {
    fields: [storeWishlists.storeId],
    references: [stores.id],
  }),
  customerAccount: one(storeCustomerAccounts, {
    fields: [storeWishlists.customerAccountId],
    references: [storeCustomerAccounts.id],
  }),
  product: one(storeProducts, {
    fields: [storeWishlists.productId],
    references: [storeProducts.id],
  }),
}))

// ============================================
// P4-B: REVIEW REQUESTS
// ============================================
export const storeReviewRequests = pgTable('store_review_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull().references(() => storeOrders.id, { onDelete: 'cascade' }).unique(),
  customerEmail: text('customer_email'),
  customerPhone: text('customer_phone'),
  customerName: text('customer_name'),
  status: text('status', { enum: ['pending', 'sent', 'completed', 'skipped'] }).default('pending').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  reviewToken: text('review_token').unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_review_requests_store').on(table.storeId),
  index('idx_review_requests_status').on(table.status),
  index('idx_review_requests_token').on(table.reviewToken),
])

export const storeReviewRequestsRelations = relations(storeReviewRequests, ({ one }) => ({
  store: one(stores, {
    fields: [storeReviewRequests.storeId],
    references: [stores.id],
  }),
  order: one(storeOrders, {
    fields: [storeReviewRequests.orderId],
    references: [storeOrders.id],
  }),
}))
