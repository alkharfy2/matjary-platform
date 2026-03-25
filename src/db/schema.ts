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
// 12. STORE REVIEWS
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
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  isApproved: boolean('is_approved').default(false).notNull(),
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
