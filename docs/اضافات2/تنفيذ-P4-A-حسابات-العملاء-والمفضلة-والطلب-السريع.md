# دليل تنفيذ P4-A — حسابات العملاء + المفضلة + الطلب السريع

> **تاريخ الإنشاء**: 30 مارس 2026  
> **المرجعية**: اضافات-2.md → المرحلة P4-A  
> **الهدف**: دليل تنفيذ تفصيلي للمميزات الثلاثة بتاعة P4-A  
> **المستوى**: جاهز للتنفيذ (Copy-Paste Ready)  
> **الجهد**: ~5-7 أيام

---

## الفهرس

1. [نظرة عامة والأولويات](#نظرة-عامة-والأولويات)
2. [حسابات العملاء (Customer Accounts)](#1-حسابات-العملاء-customer-accounts)
3. [قائمة المفضلة (Wishlist)](#2-قائمة-المفضلة-wishlist)
4. [الطلب السريع (Quick Checkout)](#3-الطلب-السريع-quick-checkout)
5. [التكامل مع الأنظمة الموجودة](#4-التكامل-مع-الأنظمة-الموجودة)
6. [ملف Migration](#5-ملف-migration)
7. [متغيرات البيئة](#6-متغيرات-البيئة)
8. [خطة الاختبار](#7-خطة-الاختبار)
9. [الـ Prompt](#8-الـ-prompt)

---

## نظرة عامة والأولويات

### لماذا الثلاثة مع بعض؟

```
حسابات العملاء (#1) ←──── أساس ────→ المفضلة (#2) تعتمد عليه 100%
        │
        └── الطلب السريع (#3) ← لو العميل مسجل + عنده عنوان = شراء بضغطة واحدة
```

- **بدون حسابات عملاء** → المفضلة مش هتشتغل persistent (هتفضل localStorage بس)
- **بدون حسابات عملاء** → Quick Checkout مش هيقدر يعبّي البيانات تلقائياً
- الثلاثة مع بعض بيكمّلوا **قصة مستخدم واحدة**: "أنا عميل → أسجل → أحفظ منتجات → أشتري بسرعة"

### ترتيب التنفيذ

| الخطوة | الميزة | الجهد | السبب |
|--------|-------|-------|-------|
| 1 | حسابات العملاء | 3-5 أيام | أساس كل حاجة |
| 2 | المفضلة | 1-2 يوم | تعتمد على الحسابات |
| 3 | الطلب السريع | 0.5-1 يوم | يستفيد من بيانات الحساب |

### كيف سلة و YouCan بينفذوا نفس المميزات

| المنصة | حسابات العملاء | المفضلة | الطلب السريع |
|--------|---------------|---------|-------------|
| **سلة** | تسجيل برقم الموبايل + OTP، إيميل اختياري، عناوين متعددة، سجل طلبات | زر ❤️ في كل المنتجات، مزامنة عبر الحساب | "اشتري الآن" → يتخطى السلة ويروح Checkout مباشرة |
| **YouCan** | إيميل + كلمة سر، تسجيل اختياري، حسابات بسيطة | متاحة للعملاء المسجلين فقط | "نموذج الخروج السريع" → فورم في نفس صفحة المنتج + "تخطي عربة التسوق" |
| **Shopify** | إيميل + كلمة سر، Magic Link، حسابات العملاء الجديدة (B2B) | متاحة فقط للمسجلين | Buy It Now → يتخطى السلة |
| **Matjary** | رقم موبايل + OTP (الأساسي)، إيميل + كلمة سر (اختياري)، JWT مستقل عن Clerk | ❤️ + localStorage للزوار + DB للمسجلين + مزامنة تلقائية | redirect mode (الأبسط) + modal mode (اختياري) |

---

## تغييرات مشتركة على StoreSettings

### الحقول الجديدة في `StoreSettings` (src/db/schema.ts)

```typescript
// === P4-A: Customer Accounts ===
customerAccountsEnabled: boolean       // default: true
customerAuthMethods: ('phone' | 'email')[]  // default: ['phone']
requireAccountForCheckout: boolean     // default: false
guestCheckoutAllowed: boolean          // default: true

// === P4-A: Wishlist ===
wishlistEnabled: boolean               // default: true
wishlistGuestMode: boolean             // default: true — localStorage لحد ما يسجل

// === P4-A: Quick Checkout ===
quickCheckoutEnabled: boolean          // default: true
quickCheckoutMode: 'redirect' | 'modal' // default: 'redirect'
skipCartEnabled: boolean               // default: false
```

### الملفات المتأثرة بتغيير StoreSettings

| الملف | التغيير |
|-------|--------|
| `src/db/schema.ts` | إضافة الحقول لنوع `StoreSettings` + تعديل `default` في `stores` |
| `src/lib/validations/store.ts` | إضافة حقول P4-A في schema التعديل |
| `src/app/api/dashboard/settings/route.ts` | السماح بتحديث الحقول الجديدة |

### لا يحتاج Migration لـ StoreSettings

`settings` هو JSONB — الحقول الجديدة بتترجع `undefined` لو مش موجودة، والكود بيتعامل معاها بـ default values. مش محتاجين SQL migration.

---

## 1. حسابات العملاء (Customer Accounts)

### 1.1 نظرة عامة

| البند | التفاصيل |
|-------|----------|
| **ماهو** | نظام مصادقة مستقل لعملاء كل متجر (مش التجار). كل متجر عنده قاعدة عملائه المنفصلة |
| **ليه مهم** | بدونه المفضلة مش هتشتغل persistent، والعميل لازم يعيد بياناته كل مرة، ومفيش سجل طلبات |
| **المصادقة** | JWT مستقل تماماً عن Clerk. Clerk = للتجار فقط. العملاء = `jose` + httpOnly cookies |
| **الطريقة الأساسية** | رقم موبايل + OTP (ده الأنسب للسوق العربي — سلة بتعمل كده) |
| **طريقة ثانوية** | إيميل + كلمة سر (اختياري — التاجر يقدر يفعّله) |
| **بدون حزم خارجية ثقيلة** | `jose` (0 dependencies, 60M+ weekly downloads, MIT) لـ JWT. OTP بيتبعت عبر SMS provider |

### 1.2 لماذا JWT مستقل وليس Clerk؟

```
Clerk = مصادقة التجار (Merchant Auth)
├── التاجر يسجل في Matjary
├── يدخل Dashboard
├── Clerk userId → merchants table
└── حماية routes: /dashboard, /super-admin

JWT مستقل = مصادقة العملاء (Customer Auth)
├── عميل متجر "أحمد للإلكترونيات" مش عميل متجر "سارة للأزياء"
├── كل متجر عنده عملاؤه المنفصلين
├── العميل يسجل بموبايله → OTP → JWT token في httpOnly cookie
├── الـ token خاص بالمتجر: matjary_ct_{storeId.slice(0, 8)}
└── حماية routes: /store/account/*
```

**أسباب عملية:**
1. Clerk free plan محدود بـ 10K active users → مع كل المتاجر وعملائها هيتخطى حدود بسرعة
2. كل متجر عايز عملاؤه منفصلين (Multi-Tenant)
3. OTP بالموبايل أبسط للعميل العربي من Email + Password
4. JWT + jose + cookies = الطريقة الرسمية اللي Next.js بيشرحها في الـ docs (https://nextjs.org/docs/app/guides/authentication)

### 1.3 كيف يعمل `jose` لـ JWT

**`jose`** هي مكتبة JavaScript لـ JSON Object Signing and Encryption (JOSE)، صفر dependencies، متوافقة مع Edge Runtime و Vercel و Next.js.

**NPM**: https://www.npmjs.com/package/jose  
**الإصدار الحالي**: v6.2.2  
**حجم**: 258KB unpacked  
**التحميلات**: 60+ مليون أسبوعياً  

```typescript
// كيف بنستخدمها:
import { SignJWT, jwtVerify } from 'jose'

const secretKey = process.env.CUSTOMER_JWT_SECRET!
const encodedKey = new TextEncoder().encode(secretKey)

// إنشاء Token
async function createCustomerToken(payload: CustomerTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(encodedKey)
}

// التحقق من Token
async function verifyCustomerToken(token: string): Promise<CustomerTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload as CustomerTokenPayload
  } catch {
    return null
  }
}
```

**لماذا HS256؟**
- أسرع من RS256 (symmetric vs asymmetric)
- كافي لأن الـ token بيتعمل ويتتحقق منه على نفس السيرفر
- Next.js docs بيستخدموه في الأمثلة الرسمية

### 1.4 كيف يعمل OTP

```
العميل                    السيرفر                     SMS Provider
  │                          │                            │
  │ 1. يدخل رقم موبايله      │                            │
  │ ───POST /send-otp────→   │                            │
  │                          │ 2. يولّد 6 أرقام عشوائية    │
  │                          │ 3. يحفظ الـ OTP مشفر (SHA-256) في DB
  │                          │    + وقت الإنتهاء (10 دقائق)│
  │                          │ 4. يبعت SMS              │
  │                          │ ────────────────────────→  │
  │                          │                            │ → SMS للعميل
  │ ← "تم إرسال الكود"       │                            │
  │                          │                            │
  │ 5. يدخل الكود (6 أرقام)  │                            │
  │ ───POST /verify-otp───→  │                            │
  │                          │ 6. يتحقق: الكود صحيح؟      │
  │                          │    + مش منتهي الصلاحية؟     │
  │                          │    + عدد المحاولات < 5؟     │
  │                          │ 7. ✅ يعمل/يرجع الحساب     │
  │                          │ 8. يعمل JWT token          │
  │                          │ 9. يحط في httpOnly cookie   │
  │ ← { success, customer }  │                            │
```

**مزود SMS مقترح:**

| المزود | السبب | التكلفة | ملاحظات |
|--------|-------|---------|---------|
| **Twilio** | الأشهر عالمياً، SDK جاهز، يدعم مصر والسعودية | ~$0.05/SMS | `npm install twilio` |
| **Vonage (Nexmo)** | بديل جيد، أسعار منافسة | ~$0.04/SMS | REST API مباشر |
| **Firebase Phone Auth** | مجاني حتى 10K تحقق/شهر | مجاني ثم $0.01/SMS | SDK أكبر، لكن مجاني |

**ملاحظة مهمة**: الكود هنا بيستخدم interface مجردة `SMSProvider` عشان التاجر يقدر يغير المزود بسهولة. في الإصدار الأول ممكن نعمل implementation بسيط يبعت OTP عبر WhatsApp API (مجاني) أو نخلي التاجر يختار المزود من الإعدادات.

### 1.5 جداول قاعدة البيانات

#### جدول حسابات العملاء

```typescript
// src/db/schema.ts — إضافة

// ——— جدول حسابات العملاء ———
export const storeCustomerAccounts = pgTable('store_customer_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  // ربط اختياري بجدول storeCustomers الموجود (بيحصل تلقائياً أول طلب)
  customerId: uuid('customer_id')
    .references(() => storeCustomers.id),
  phone: text('phone').notNull(),
  phoneVerified: boolean('phone_verified').default(false).notNull(),
  email: text('email'),
  // bcrypt hash — null لو التسجيل بالموبايل فقط
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  // عنوان افتراضي يتعبى تلقائياً في Checkout
  defaultAddress: jsonb('default_address').$type<ShippingAddress | null>(),
  // عناوين محفوظة إضافية (بيت، شغل، إلخ)
  savedAddresses: jsonb('saved_addresses').$type<SavedAddress[]>().default([]),
  // طريقة التسجيل
  authProvider: text('auth_provider').default('phone').notNull(), // 'phone' | 'email'
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // عميل واحد برقم واحد في كل متجر
  uniqueIndex('uniq_customer_account_store_phone').on(table.storeId, table.phone),
  // بحث بالإيميل (لو موجود)
  index('idx_customer_accounts_email').on(table.storeId, table.email),
  // ربط بجدول العملاء القديم
  index('idx_customer_accounts_customer').on(table.customerId),
])
```

**شرح العلاقة مع `storeCustomers` الموجود:**
```
storeCustomers (الجدول الحالي)
├── بيتعمل تلقائياً أول ما عميل يعمل طلب
├── فيه: name, phone, totalOrders, totalSpent
├── مربوط بـ storeOrders عبر customerId
└── بيستخدمه التاجر في Dashboard لإدارة العملاء

storeCustomerAccounts (الجدول الجديد)
├── بيتعمل لما العميل يسجل حساب (OTP أو Email)
├── فيه: بيانات المصادقة + العناوين المحفوظة
├── customerId → optional FK لـ storeCustomers
└── الربط بيحصل تلقائياً: أول طلب → نربط الحسابين

الربط:
عميل يسجل حساب → storeCustomerAccounts (customerId = null)
عميل يعمل أول طلب → storeCustomers يتعمل + storeCustomerAccounts.customerId يتحدث
```

#### نوع العنوان المحفوظ

```typescript
// src/db/schema.ts — إضافة النوع

export type SavedAddress = ShippingAddress & {
  id: string        // nanoid()
  label: string     // "البيت" | "الشغل" | "عنوان 3"
  isDefault: boolean
}
```

#### جدول OTP المؤقت

```typescript
// ——— جدول OTP ———
export const storeCustomerOtps = pgTable('store_customer_otps', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  phone: text('phone').notNull(),
  // الكود مشفر SHA-256 — مش plaintext
  otpHash: text('otp_hash').notNull(),
  // ينتهي بعد 10 دقائق
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  // أقصى 5 محاولات فاشلة
  attempts: integer('attempts').default(0).notNull(),
  isUsed: boolean('is_used').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_customer_otps_lookup').on(table.phone, table.storeId),
  // حذف تلقائي للـ OTPs المنتهية (يتعمل بـ cron أو عند الطلب)
  index('idx_customer_otps_expires').on(table.expiresAt),
])
```

#### Relations

```typescript
// src/db/schema.ts — إضافة Relations

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
```

### 1.6 مكتبة JWT — `src/lib/auth/customer-jwt.ts`

```typescript
// src/lib/auth/customer-jwt.ts
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

// Secret key — لازم يكون 32+ characters
const secretKey = process.env.CUSTOMER_JWT_SECRET
if (!secretKey) throw new Error('CUSTOMER_JWT_SECRET is not set')
const encodedKey = new TextEncoder().encode(secretKey)

// اسم الـ Cookie بيكون فريد لكل متجر
function getCookieName(storeId: string): string {
  return `matjary_ct_${storeId.slice(0, 8)}`
}

export type CustomerTokenPayload = {
  sub: string     // customerAccountId
  storeId: string
  phone: string
  name: string
}

/**
 * إنشاء JWT token وحفظه في httpOnly cookie
 */
export async function createCustomerSession(
  payload: CustomerTokenPayload
): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // 30 يوم — مناسب لـ e-commerce
    .sign(encodedKey)

  const cookieStore = await cookies()
  cookieStore.set(getCookieName(payload.storeId), token, {
    httpOnly: true,                              // مش متاح لـ JavaScript
    secure: process.env.NODE_ENV === 'production', // HTTPS فقط في production
    sameSite: 'lax',                             // حماية من CSRF
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 يوم بالثواني
  })

  return token
}

/**
 * التحقق من Session العميل — بيرجع البيانات أو null
 */
export async function verifyCustomerSession(
  storeId: string
): Promise<CustomerTokenPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(getCookieName(storeId))?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    })

    // تأكد إن الـ token خاص بنفس المتجر
    if (payload.storeId !== storeId) return null

    return payload as unknown as CustomerTokenPayload
  } catch {
    return null
  }
}

/**
 * حذف Session العميل (Logout)
 */
export async function deleteCustomerSession(storeId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(getCookieName(storeId))
}

/**
 * تجديد Session — بيعمل token جديد بنفس البيانات
 */
export async function refreshCustomerSession(
  storeId: string
): Promise<string | null> {
  const session = await verifyCustomerSession(storeId)
  if (!session) return null
  return createCustomerSession(session)
}
```

**ملاحظات أمنية مبنية على Next.js Auth Guide:**
- `httpOnly: true` → JavaScript مش هيقدر يوصل للـ cookie (حماية من XSS)
- `secure: true` في production → مش هيتبعت غير على HTTPS
- `sameSite: 'lax'` → حماية من CSRF مع السماح بالـ navigation
- Token payload بيحتوي أقل بيانات ممكنة (ID + storeId + phone + name) — مفيش كلمات سر أو بيانات حساسة

### 1.7 خدمة OTP — `src/lib/auth/otp-service.ts`

```typescript
// src/lib/auth/otp-service.ts
import 'server-only'
import { db } from '@/db'
import { storeCustomerOtps } from '@/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import crypto from 'crypto'

const OTP_LENGTH = 6
const OTP_EXPIRY_MINUTES = 10
const MAX_ATTEMPTS = 5
// Rate limit: OTP واحد كل 60 ثانية (نفس Supabase standard)
const OTP_COOLDOWN_SECONDS = 60

/**
 * تشفير OTP بـ SHA-256 (نفس الطريقة اللي Supabase بتستخدمها)
 */
function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

/**
 * توليد كود OTP عشوائي (6 أرقام)
 * بنستخدم crypto.randomInt — أأمن من Math.random()
 */
function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString()
}

/**
 * إرسال OTP — بيولّد الكود ويحفظه ويبعته عبر SMS
 */
export async function sendOtp(
  storeId: string,
  phone: string
): Promise<{ success: boolean; error?: string; cooldownRemaining?: number }> {
  // 1. فحص Rate Limit — OTP واحد كل 60 ثانية
  const recentOtp = await db.query.storeCustomerOtps.findFirst({
    where: and(
      eq(storeCustomerOtps.storeId, storeId),
      eq(storeCustomerOtps.phone, phone),
      gt(storeCustomerOtps.createdAt, new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000))
    ),
    orderBy: (otp, { desc }) => [desc(otp.createdAt)],
  })

  if (recentOtp) {
    const elapsed = Date.now() - new Date(recentOtp.createdAt).getTime()
    const remaining = Math.ceil((OTP_COOLDOWN_SECONDS * 1000 - elapsed) / 1000)
    return { success: false, error: 'OTP_COOLDOWN', cooldownRemaining: remaining }
  }

  // 2. توليد OTP جديد
  const otp = generateOtp()
  const otpHash = hashOtp(otp)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

  // 3. حفظ في DB (مشفر)
  await db.insert(storeCustomerOtps).values({
    storeId,
    phone,
    otpHash,
    expiresAt,
  })

  // 4. إرسال SMS
  // TODO: هنا بيتبعت الـ OTP عبر SMS provider
  // في البداية ممكن نستخدم console.log للتجربة
  // ثم نربط Twilio أو WhatsApp API
  await sendSms(phone, `كود التحقق: ${otp}`)

  return { success: true }
}

/**
 * التحقق من OTP
 */
export async function verifyOtp(
  storeId: string,
  phone: string,
  otpCode: string
): Promise<{ success: boolean; error?: string }> {
  const otpHash = hashOtp(otpCode)

  // 1. البحث عن OTP صالح
  const otpRecord = await db.query.storeCustomerOtps.findFirst({
    where: and(
      eq(storeCustomerOtps.storeId, storeId),
      eq(storeCustomerOtps.phone, phone),
      eq(storeCustomerOtps.isUsed, false),
      gt(storeCustomerOtps.expiresAt, new Date())
    ),
    orderBy: (otp, { desc }) => [desc(otp.createdAt)],
  })

  if (!otpRecord) {
    return { success: false, error: 'OTP_EXPIRED_OR_NOT_FOUND' }
  }

  // 2. فحص عدد المحاولات
  if (otpRecord.attempts >= MAX_ATTEMPTS) {
    return { success: false, error: 'OTP_MAX_ATTEMPTS' }
  }

  // 3. مقارنة الـ hash
  if (otpRecord.otpHash !== otpHash) {
    // زيادة عداد المحاولات
    await db.update(storeCustomerOtps)
      .set({ attempts: otpRecord.attempts + 1 })
      .where(eq(storeCustomerOtps.id, otpRecord.id))

    return { success: false, error: 'OTP_INVALID' }
  }

  // 4. ✅ OTP صحيح — نعلّمه كـ used
  await db.update(storeCustomerOtps)
    .set({ isUsed: true })
    .where(eq(storeCustomerOtps.id, otpRecord.id))

  return { success: true }
}

/**
 * إرسال SMS — Interface مجرد
 * في الإصدار الأول ممكن يكون WhatsApp API أو Twilio
 */
async function sendSms(phone: string, message: string): Promise<void> {
  const provider = process.env.SMS_PROVIDER || 'console'

  switch (provider) {
    case 'twilio': {
      // Twilio SMS
      const accountSid = process.env.TWILIO_ACCOUNT_SID!
      const authToken = process.env.TWILIO_AUTH_TOKEN!
      const fromNumber = process.env.TWILIO_PHONE_NUMBER!

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        },
        body: new URLSearchParams({
          To: phone,
          From: fromNumber,
          Body: message,
        }),
      })
      break
    }
    case 'console':
    default:
      // للتجربة المحلية
      console.log(`[OTP SMS] To: ${phone} | Message: ${message}`)
  }
}
```

### 1.8 Middleware للعملاء — `src/lib/auth/customer-middleware.ts`

```typescript
// src/lib/auth/customer-middleware.ts
import 'server-only'
import { verifyCustomerSession, type CustomerTokenPayload } from './customer-jwt'
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

/**
 * الحصول على حساب العميل الحالي — مع cache لكل request
 * بيتستخدم في Server Components و Route Handlers
 */
export const getCustomerAccount = cache(
  async (storeId: string): Promise<CustomerAccount | null> => {
    // 1. تحقق من JWT (optimistic — من الـ cookie)
    const session = await verifyCustomerSession(storeId)
    if (!session) return null

    // 2. تحقق من DB (secure — العميل لسه موجود ومش محظور)
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
```

**ملاحظات تصميمية (مبنية على Next.js Auth Guide):**
- بنستخدم React `cache()` عشان نتجنب queries مكررة في نفس الـ request
- فيه طبقتين حماية: JWT check (سريع) + DB check (آمن)
- الفحص بيحصل في كل component يحتاجه — مش في Layout (لأن Partial Rendering مش بيعمل re-render للـ Layout)

### 1.9 API Routes

#### `POST /api/storefront/auth/send-otp`

```typescript
// src/app/api/storefront/auth/send-otp/route.ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiError, ApiErrors, handleApiError } from '@/lib/api/response'
import { sendOtp } from '@/lib/auth/otp-service'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'

const sendOtpSchema = z.object({
  storeId: z.string().uuid(),
  phone: z.string().min(10).max(15).regex(/^\+?[0-9]+$/),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 requests / دقيقة / IP
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`otp:${ip}`, { maxRequests: 5, windowSeconds: 60 })
    if (!allowed) return ApiErrors.tooManyRequests()

    const body = await request.json()
    const { storeId, phone } = sendOtpSchema.parse(body)

    const result = await sendOtp(storeId, phone)

    if (!result.success) {
      if (result.error === 'OTP_COOLDOWN') {
        return ApiErrors.tooManyRequests(
          `يرجى الانتظار ${result.cooldownRemaining} ثانية`
        )
      }
      return apiError(result.error!, 400)
    }

    return apiSuccess({ message: 'تم إرسال كود التحقق' })
  } catch (error) {
    return handleApiError(error)
  }
}
```

#### `POST /api/storefront/auth/verify-otp`

```typescript
// src/app/api/storefront/auth/verify-otp/route.ts
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeCustomerAccounts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { apiSuccess, apiError, ApiErrors, handleApiError } from '@/lib/api/response'
import { verifyOtp } from '@/lib/auth/otp-service'
import { createCustomerSession } from '@/lib/auth/customer-jwt'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'

const verifyOtpSchema = z.object({
  storeId: z.string().uuid(),
  phone: z.string().min(10).max(15).regex(/^\+?[0-9]+$/),
  otp: z.string().length(6).regex(/^[0-9]+$/),
  name: z.string().min(2).max(100).optional(), // مطلوب لو مستخدم جديد
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`verify:${ip}`, { maxRequests: 10, windowSeconds: 60 })
    if (!allowed) return ApiErrors.tooManyRequests()

    const body = await request.json()
    const { storeId, phone, otp, name } = verifyOtpSchema.parse(body)

    // 1. تحقق من OTP
    const result = await verifyOtp(storeId, phone, otp)
    if (!result.success) {
      const messages: Record<string, string> = {
        OTP_EXPIRED_OR_NOT_FOUND: 'الكود غير صحيح أو منتهي الصلاحية',
        OTP_MAX_ATTEMPTS: 'تم تجاوز عدد المحاولات. يرجى طلب كود جديد',
        OTP_INVALID: 'الكود غير صحيح',
      }
      return apiError(messages[result.error!] || result.error!, 400)
    }

    // 2. البحث عن حساب موجود أو إنشاء جديد
    let account = await db.query.storeCustomerAccounts.findFirst({
      where: and(
        eq(storeCustomerAccounts.storeId, storeId),
        eq(storeCustomerAccounts.phone, phone)
      ),
    })

    if (!account) {
      // مستخدم جديد — لازم يكون عنده اسم
      if (!name) {
        return ApiErrors.validation('الاسم مطلوب للتسجيل')
      }

      const [newAccount] = await db.insert(storeCustomerAccounts)
        .values({
          storeId,
          phone,
          phoneVerified: true,
          name,
          authProvider: 'phone',
          lastLoginAt: new Date(),
        })
        .returning()

      account = newAccount
    } else {
      // مستخدم موجود — تحديث آخر دخول
      await db.update(storeCustomerAccounts)
        .set({
          lastLoginAt: new Date(),
          phoneVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(storeCustomerAccounts.id, account.id))
    }

    // 3. إنشاء JWT Session
    await createCustomerSession({
      sub: account.id,
      storeId: account.storeId,
      phone: account.phone,
      name: account.name,
    })

    return apiSuccess({
      customer: {
        id: account.id,
        name: account.name,
        phone: account.phone,
        email: account.email,
        isNewAccount: !account.lastLoginAt,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
```

#### `GET /api/storefront/auth/me`

```typescript
// src/app/api/storefront/auth/me/route.ts
import { NextRequest } from 'next/server'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { getCustomerAccount } from '@/lib/auth/customer-middleware'

export async function GET(request: NextRequest) {
  try {
    const storeId = request.headers.get('x-store-id')
    if (!storeId) return ApiErrors.validation('Store ID required')

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    return apiSuccess({ customer: account })
  } catch (error) {
    return handleApiError(error)
  }
}
```

#### `PUT /api/storefront/auth/profile`

```typescript
// src/app/api/storefront/auth/profile/route.ts
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeCustomerAccounts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { getCustomerAccount } from '@/lib/auth/customer-middleware'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.email().optional(),
})

export async function PUT(request: NextRequest) {
  try {
    const storeId = request.headers.get('x-store-id')
    if (!storeId) return ApiErrors.validation('Store ID required')

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    const body = await request.json()
    const data = updateProfileSchema.parse(body)

    const [updated] = await db.update(storeCustomerAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(storeCustomerAccounts.id, account.id))
      .returning()

    return apiSuccess({ customer: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
```

#### `POST /api/storefront/auth/logout`

```typescript
// src/app/api/storefront/auth/logout/route.ts
import { NextRequest } from 'next/server'
import { apiSuccess, handleApiError } from '@/lib/api/response'
import { deleteCustomerSession } from '@/lib/auth/customer-jwt'

export async function POST(request: NextRequest) {
  try {
    const storeId = request.headers.get('x-store-id')
    if (storeId) {
      await deleteCustomerSession(storeId)
    }
    return apiSuccess({ message: 'تم تسجيل الخروج' })
  } catch (error) {
    return handleApiError(error)
  }
}
```

#### `GET /api/storefront/auth/orders`

```typescript
// src/app/api/storefront/auth/orders/route.ts
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeOrders, storeOrderItems } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { getCustomerAccount } from '@/lib/auth/customer-middleware'

export async function GET(request: NextRequest) {
  try {
    const storeId = request.headers.get('x-store-id')
    if (!storeId) return ApiErrors.validation('Store ID required')

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    // نجيب الطلبات عبر رقم الموبايل (أشمل من customerId)
    const orders = await db.query.storeOrders.findMany({
      where: and(
        eq(storeOrders.storeId, storeId),
        eq(storeOrders.customerPhone, account.phone)
      ),
      with: {
        items: true,
      },
      orderBy: [desc(storeOrders.createdAt)],
      limit: 50,
    })

    return apiSuccess({ orders })
  } catch (error) {
    return handleApiError(error)
  }
}
```

#### `POST /api/storefront/auth/addresses` + `PUT` + `DELETE`

```typescript
// src/app/api/storefront/auth/addresses/route.ts
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeCustomerAccounts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { getCustomerAccount } from '@/lib/auth/customer-middleware'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import type { SavedAddress } from '@/db/schema'

const addressSchema = z.object({
  label: z.string().min(1).max(50),
  governorate: z.string().min(1),
  city: z.string().min(1),
  area: z.string().min(1),
  street: z.string().min(1),
  building: z.string().optional(),
  floor: z.string().optional(),
  apartment: z.string().optional(),
  landmark: z.string().optional(),
  postalCode: z.string().optional(),
  isDefault: z.boolean().optional(),
})

// إضافة عنوان جديد
export async function POST(request: NextRequest) {
  try {
    const storeId = request.headers.get('x-store-id')
    if (!storeId) return ApiErrors.validation('Store ID required')

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

    // لو العنوان الجديد default → نشيل default من الباقي
    let updatedAddresses: SavedAddress[]
    if (newAddress.isDefault) {
      updatedAddresses = currentAddresses.map(a => ({ ...a, isDefault: false }))
    } else {
      updatedAddresses = [...currentAddresses]
    }
    updatedAddresses.push(newAddress)

    // لو أول عنوان → يبقى default تلقائياً
    if (updatedAddresses.length === 1) {
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

// جلب العناوين
export async function GET(request: NextRequest) {
  try {
    const storeId = request.headers.get('x-store-id')
    if (!storeId) return ApiErrors.validation('Store ID required')

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    return apiSuccess({ addresses: account.savedAddresses })
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 1.10 صفحات الـ UI (Store Pages)

#### هيكل الملفات

```
src/app/store/account/
├── layout.tsx                        # Layout بـ sidebar navigation
├── page.tsx                          # صفحة "حسابي" — ملخص
├── login/
│   ├── page.tsx                      # صفحة تسجيل الدخول
│   └── _components/
│       ├── phone-login-form.tsx      # فورم: رقم → OTP → اسم (لو جديد)
│       └── email-login-form.tsx      # فورم: إيميل + كلمة سر
├── orders/
│   ├── page.tsx                      # قائمة طلباتي
│   └── [id]/
│       └── page.tsx                  # تفاصيل طلب
├── addresses/
│   └── page.tsx                      # إدارة العناوين
├── wishlist/
│   └── page.tsx                      # المفضلة (ميزة #2)
└── settings/
    └── page.tsx                      # تعديل البيانات
```

#### تدفق تسجيل الدخول بالموبايل (UX)

```
┌─────────────────────────────┐
│   📱 تسجيل الدخول           │
│                             │
│   ادخل رقم موبايلك:        │
│   ┌───────────────────┐    │
│   │ +20 1xxxxxxxxx    │    │
│   └───────────────────┘    │
│   [إرسال كود التحقق]        │
└─────────────────────────────┘
              │ POST /send-otp
              ▼
┌─────────────────────────────┐
│   🔢 كود التحقق             │
│                             │
│   تم إرسال كود لـ 01xx...   │
│   ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐│
│   │ │ │ │ │ │ │ │ │ │ │ ││
│   └─┘ └─┘ └─┘ └─┘ └─┘ └─┘│
│   [تحقق]     (إعادة إرسال: 47 ثانية)
└─────────────────────────────┘
              │ POST /verify-otp
              ▼
┌─────────────────────────────┐ (لو مستخدم جديد فقط)
│   👤 أهلاً بيك!              │
│                             │
│   اسمك إيه؟                 │
│   ┌───────────────────┐    │
│   │ أحمد محمد          │    │
│   └───────────────────┘    │
│   [ابدأ التسوق]             │
└─────────────────────────────┘
              │
              ▼
        ✅ حسابي (redirect to /store/account)
```

---

## 2. قائمة المفضلة (Wishlist)

### 2.1 نظرة عامة

| البند | التفاصيل |
|-------|----------|
| **ماهو** | قائمة يحفظ فيها العميل المنتجات اللي عايز يشتريها بعدين |
| **ليه مهم** | بيرفع نسبة الرجوع للمتجر + بيزود المبيعات (العميل يرجع يشتري من المفضلة) |
| **للزوار** | يشتغل بـ localStorage (Zustand) — مش محتاج تسجيل |
| **للمسجلين** | يتحفظ في DB + مزامنة تلقائية عند تسجيل الدخول |
| **المزامنة** | أول ما العميل يسجل دخول → localStorage items بتتنقل لـ DB (sync once) |

### 2.2 كيف بيشتغل

```
زائر (Guest)                          مسجّل (Authenticated)
      │                                      │
      │ يضغط ❤️ على منتج                     │ يضغط ❤️ على منتج
      │                                      │
      ▼                                      ▼
localStorage                           POST /api/storefront/wishlist
(Zustand persist)                      (DB + invalidate cache)
      │                                      │
      │ يسجل دخول                             │
      │                                      │
      ▼                                      │
POST /api/storefront/wishlist/sync     ←─────┘
(localStorage → DB merge)
ثم يحذف localStorage
```

### 2.3 جدول قاعدة البيانات

```typescript
// src/db/schema.ts — إضافة

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
  // لو المنتج عنده variant معين (مثلاً: اللون الأزرق) — default '' لحل مشكلة NULL في unique index
  variantId: text('variant_id').default('').notNull(),
  // بنحفظ السعر وقت الإضافة — لو نزل نقدر ننبّه العميل
  priceWhenAdded: decimal('price_when_added', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // عميل واحد مش هيقدر يضيف نفس المنتج مرتين
  uniqueIndex('uniq_wishlist_item').on(
    table.storeId,
    table.customerAccountId,
    table.productId,
    table.variantId,
  ),
  // بحث سريع عن مفضلة عميل معين
  index('idx_wishlists_customer').on(table.storeId, table.customerAccountId),
])
```

#### Relations

```typescript
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
```

### 2.4 Zustand Store (localStorage للزوار)

```typescript
// src/lib/stores/wishlist-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type WishlistItem = {
  productId: string
  variantId?: string
  addedAt: number // timestamp
}

type WishlistStore = {
  items: WishlistItem[]
  addItem: (productId: string, variantId?: string) => void
  removeItem: (productId: string, variantId?: string) => void
  isInWishlist: (productId: string, variantId?: string) => boolean
  clearAll: () => void
  getItems: () => WishlistItem[]
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (productId, variantId) => {
        const exists = get().items.some(
          i => i.productId === productId && i.variantId === variantId
        )
        if (exists) return

        set((state) => ({
          items: [...state.items, { productId, variantId, addedAt: Date.now() }],
        }))
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            i => !(i.productId === productId && i.variantId === variantId)
          ),
        }))
      },

      isInWishlist: (productId, variantId) => {
        return get().items.some(
          i => i.productId === productId && i.variantId === variantId
        )
      },

      clearAll: () => set({ items: [] }),
      getItems: () => get().items,
    }),
    {
      name: 'matjary-wishlist', // localStorage key
    }
  )
)
```

### 2.5 API Routes

#### `GET /api/storefront/wishlist`

```typescript
// src/app/api/storefront/wishlist/route.ts
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeWishlists, storeProducts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { getCustomerAccount } from '@/lib/auth/customer-middleware'

// جلب المفضلة
export async function GET(request: NextRequest) {
  try {
    const storeId = request.headers.get('x-store-id')
    if (!storeId) return ApiErrors.validation('Store ID required')

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    const items = await db.query.storeWishlists.findMany({
      where: and(
        eq(storeWishlists.storeId, storeId),
        eq(storeWishlists.customerAccountId, account.id),
      ),
      with: {
        product: {
          columns: {
            id: true,
            name: true,
            slug: true,
            price: true,
            compareAtPrice: true,
            images: true,
            isActive: true,
            stock: true,
          },
        },
      },
      orderBy: (w, { desc }) => [desc(w.createdAt)],
    })

    return apiSuccess({ items })
  } catch (error) {
    return handleApiError(error)
  }
}

// إضافة للمفضلة
export async function POST(request: NextRequest) {
  try {
    const storeId = request.headers.get('x-store-id')
    if (!storeId) return ApiErrors.validation('Store ID required')

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    const { productId, variantId, price } = await request.json()
    if (!productId) return ApiErrors.validation('Product ID required')

    // تأكد المنتج موجود في المتجر
    const product = await db.query.storeProducts.findFirst({
      where: and(
        eq(storeProducts.id, productId),
        eq(storeProducts.storeId, storeId),
      ),
    })
    if (!product) return ApiErrors.notFound('المنتج غير موجود')

    // إضافة (ON CONFLICT DO NOTHING بسبب الـ unique index)
    await db.insert(storeWishlists)
      .values({
        storeId,
        customerAccountId: account.id,
        productId,
        variantId: variantId || '',
        priceWhenAdded: price?.toString() || product.price,
      })
      .onConflictDoNothing()

    return apiSuccess({ message: 'تمت الإضافة للمفضلة' })
  } catch (error) {
    return handleApiError(error)
  }
}
```

#### `DELETE /api/storefront/wishlist/[productId]`

```typescript
// src/app/api/storefront/wishlist/[productId]/route.ts
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeWishlists } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { getCustomerAccount } from '@/lib/auth/customer-middleware'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const storeId = request.headers.get('x-store-id')
    if (!storeId) return ApiErrors.validation('Store ID required')

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    const { productId } = await params

    await db.delete(storeWishlists)
      .where(and(
        eq(storeWishlists.storeId, storeId),
        eq(storeWishlists.customerAccountId, account.id),
        eq(storeWishlists.productId, productId),
      ))

    return apiSuccess({ message: 'تمت الإزالة من المفضلة' })
  } catch (error) {
    return handleApiError(error)
  }
}
```

#### `POST /api/storefront/wishlist/sync`

```typescript
// src/app/api/storefront/wishlist/sync/route.ts
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeWishlists, storeProducts } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { getCustomerAccount } from '@/lib/auth/customer-middleware'
import { z } from 'zod'

const syncSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().nullish(),
  })).max(100), // حد أقصى 100 منتج
})

export async function POST(request: NextRequest) {
  try {
    const storeId = request.headers.get('x-store-id')
    if (!storeId) return ApiErrors.validation('Store ID required')

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    const body = await request.json()
    const { items } = syncSchema.parse(body)

    if (items.length === 0) return apiSuccess({ synced: 0 })

    // تحقق إن المنتجات موجودة فعلاً في المتجر
    const productIds = items.map(i => i.productId)
    const validProducts = await db.query.storeProducts.findMany({
      where: and(
        eq(storeProducts.storeId, storeId),
        inArray(storeProducts.id, productIds),
      ),
      columns: { id: true, price: true },
    })

    const validIds = new Set(validProducts.map(p => p.id))
    const priceMap = new Map(validProducts.map(p => [p.id, p.price]))

    // إضافة المنتجات الصالحة (ON CONFLICT DO NOTHING)
    const validItems = items.filter(i => validIds.has(i.productId))

    if (validItems.length > 0) {
      await db.insert(storeWishlists)
        .values(validItems.map(item => ({
          storeId,
          customerAccountId: account.id,
          productId: item.productId,
          variantId: item.variantId || '',
          priceWhenAdded: priceMap.get(item.productId) || null,
        })))
        .onConflictDoNothing()
    }

    return apiSuccess({ synced: validItems.length })
  } catch (error) {
    return handleApiError(error)
  }
}
```

### 2.6 مكوّن زر المفضلة — `wishlist-button.tsx`

```typescript
// src/app/store/_components/wishlist-button.tsx
'use client'

import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWishlistStore } from '@/lib/stores/wishlist-store'
import { useCallback, useTransition } from 'react'

type WishlistButtonProps = {
  productId: string
  variantId?: string
  storeId: string
  isAuthenticated: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function WishlistButton({
  productId,
  variantId,
  storeId,
  isAuthenticated,
  size = 'md',
  className,
}: WishlistButtonProps) {
  const { isInWishlist, addItem, removeItem } = useWishlistStore()
  const [isPending, startTransition] = useTransition()
  const isWishlisted = isInWishlist(productId, variantId)

  const handleToggle = useCallback(() => {
    // 1. تحديث localStorage فوراً (optimistic)
    if (isWishlisted) {
      removeItem(productId, variantId)
    } else {
      addItem(productId, variantId)
    }

    // 2. لو مسجّل → sync مع API
    if (isAuthenticated) {
      startTransition(async () => {
        try {
          if (isWishlisted) {
            await fetch(`/api/storefront/wishlist/${productId}`, {
              method: 'DELETE',
              headers: { 'x-store-id': storeId },
            })
          } else {
            await fetch('/api/storefront/wishlist', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-store-id': storeId,
              },
              body: JSON.stringify({ productId, variantId }),
            })
          }
        } catch {
          // Revert on error
          if (isWishlisted) {
            addItem(productId, variantId)
          } else {
            removeItem(productId, variantId)
          }
        }
      })
    }
  }, [isWishlisted, productId, variantId, storeId, isAuthenticated, addItem, removeItem])

  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-11 w-11',
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        'rounded-full flex items-center justify-center transition-colors',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        sizeClasses[size],
        className,
      )}
      aria-label={isWishlisted ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
    >
      <Heart
        className={cn(
          'transition-colors',
          size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6',
          isWishlisted
            ? 'fill-red-500 text-red-500'
            : 'text-gray-400 hover:text-red-400',
        )}
      />
    </button>
  )
}
```

---

## 3. الطلب السريع (Quick Checkout)

### 3.1 نظرة عامة

| البند | التفاصيل |
|-------|----------|
| **ماهو** | زر "اشتري الآن" اللي بيخلّي العميل يروح Checkout مباشرة بدون ما يمر على السلة |
| **ليه مهم** | بيقلل الخطوات → بيرفع نسبة إكمال الطلب. YouCan عندهم "نموذج الخروج السريع" + "تخطي عربة التسوق" |
| **الأوضاع** | 1) Redirect mode: يمسح السلة → يضيف المنتج → redirect لـ /checkout 2) Modal mode: فورم مختصر في نفس الصفحة |
| **الوضع الافتراضي** | Redirect (أبسط وأقوى — بيستخدم نفس checkout flow الموجود) |
| **مع حساب عميل** | بيانات الاسم والموبايل والعنوان بتتعبى تلقائياً = شراء أسرع |

### 3.2 كيف يعمل (Redirect Mode)

```
صفحة المنتج
┌─────────────────────────────┐
│  👕 تيشرت قطن               │
│  💰 250 ج.م                 │
│                             │
│  🔢 الكمية: [1] [+] [-]    │
│                             │
│  [🛒 أضف للسلة]              │  ← الطريقة العادية
│  [⚡ اشتري الآن]              │  ← Quick Checkout
│  [❤️]                        │  ← Wishlist
└─────────────────────────────┘
              │ يضغط "اشتري الآن"
              ▼
    1. cart.clearCart()
    2. cart.addItem({ productId, productName, productImage, variantId, variantLabel, quantity, unitPrice })
    3. router.push('/checkout')
              │
              ▼
صفحة Checkout (الموجودة فعلاً)
┌─────────────────────────────┐
│  بيانات التوصيل             │
│  ┌───────────────────┐      │
│  │ أحمد محمد ✅ (معبّى) │      │  ← بيانات من الحساب (لو مسجّل)
│  └───────────────────┘      │
│  ...                        │
│  [تأكيد الطلب]              │
└─────────────────────────────┘
```

### 3.3 الملفات

```
src/app/store/product/[slug]/_components/
├── quick-buy-button.tsx              # زر "⚡ اشتري الآن"
└── quick-checkout-modal.tsx          # Modal للطلب السريع (اختياري — mode: 'modal')
```

### 3.4 مكوّن زر الشراء السريع

```typescript
// src/app/store/product/[slug]/_components/quick-buy-button.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'
import { useCartStore } from '@/lib/stores/cart-store'  // الموجود
import { Button } from '@/components/ui/button'

type QuickBuyButtonProps = {
  productId: string
  variantId?: string
  quantity?: number
  price: number
  productName: string
  productImage?: string
  quickCheckoutMode: 'redirect' | 'modal'
  disabled?: boolean
}

export function QuickBuyButton({
  productId,
  variantId,
  quantity = 1,
  price,
  productName,
  productImage,
  quickCheckoutMode,
  disabled,
}: QuickBuyButtonProps) {
  const router = useRouter()
  const cart = useCartStore()

  function handleQuickBuy() {
    if (quickCheckoutMode === 'redirect') {
      // Redirect Mode: مسح السلة → إضافة منتج واحد → checkout
      cart.clearCart()
      cart.addItem({
        productId,
        productName,
        productImage: productImage ?? null,
        variantId: variantId ?? null,
        variantLabel: null,
        quantity,
        unitPrice: price,
      })
      router.push('/checkout')
    } else {
      // Modal Mode: هيتعمل في المستقبل
      // TODO: فتح modal مع فورم مختصر
    }
  }

  return (
    <Button
      onClick={handleQuickBuy}
      disabled={disabled}
      variant="default"
      className="w-full gap-2"
    >
      <Zap className="h-4 w-4" />
      اشتري الآن
    </Button>
  )
}
```

### 3.5 تكامل مع Checkout الحالي

**التعديل الوحيد المطلوب في `store/checkout`:**

عند تحميل صفحة Checkout → لو العميل مسجّل → نعبّي بياناته تلقائياً:

```typescript
// في src/app/store/checkout/page.tsx أو _components/checkout-form.tsx
// إضافة في بداية الكمبوننت:

const customerAccount = await getCustomerAccount(storeId)

// لو مسجّل → نعبّي الحقول تلقائياً
const defaultValues = customerAccount
  ? {
      customerName: customerAccount.name,
      customerPhone: customerAccount.phone,
      customerEmail: customerAccount.email || '',
      shippingAddress: customerAccount.defaultAddress || undefined,
    }
  : undefined
```

### 3.6 إعدادات Skip Cart (تخطي السلة)

YouCan عندهم ميزة "تخطي عربة التسوق" — يعني بدل ما العميل يروح صفحة السلة → يروح مباشرة للـ checkout.

```typescript
// لو skipCartEnabled = true:
// زر "أضف للسلة" → يضيف + redirect لـ /checkout فوراً
// بدل ما يروح /cart
```

ده تعديل بسيط في الـ `add-to-cart-button.tsx` الموجود:

```typescript
// في add-to-cart-button بعد cart.addItem():
if (settings.skipCartEnabled) {
  router.push('/checkout')
} else {
  // العادي — يفضل في نفس الصفحة أو يروح /cart
}
```

---

## 4. التكامل مع الأنظمة الموجودة

### 4.1 التكامل مع Checkout API

| النظام | التغيير |
|--------|---------|
| `POST /api/checkout` | إضافة: لو فيه customer session → يقرأ `customerAccountId` ويربطه بالطلب |
| `store/checkout/page.tsx` | إضافة: لو مسجّل → auto-fill الحقول من `defaultAddress` |
| بعد إنشاء الطلب | إضافة: لو فيه `customerAccountId` بس مفيش `customerId` → نربطهم |

### 4.2 ربط `storeCustomerAccounts` بـ `storeCustomers`

```typescript
// في POST /api/checkout — بعد إنشاء العميل (storeCustomers):
// لو العميل مسجّل (فيه session) → نربط الحسابين

if (customerAccountId) {
  await db.update(storeCustomerAccounts)
    .set({ customerId: newCustomer.id })
    .where(
      and(
        eq(storeCustomerAccounts.id, customerAccountId),
        // لو مش مربوط فعلاً
        eq(storeCustomerAccounts.customerId, null)
      )
    )
}
```

### 4.3 التكامل مع Loyalty و Trust Score

| النظام | التكامل |
|--------|---------|
| **Loyalty Points** | لو العميل مسجّل → نقاط الولاء مربوطة بحسابه مش برقم الموبايل بس |
| **Trust Score** | حساب مسجّل = +15 نقطة ثقة إضافية (مشتري مؤكد) |
| **Abandoned Cart** | لو مسجّل → نعرف مين سابق السلة من غير ما يدخل بياناته |

### 4.4 التكامل مع Reviews (المرحلة P4-B)

```
عميل مسجّل → يشتري → يقيّم → شارة "✅ مشتري مؤكد"
عميل زائر → يشتري → يقيّم → بدون شارة
```

---

## 5. ملف Migration

```sql
-- migrations/p4a_customer_accounts_wishlist.sql

-- 1. جدول حسابات العملاء
CREATE TABLE IF NOT EXISTS store_customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES store_customers(id),
  phone TEXT NOT NULL,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email TEXT,
  password_hash TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  default_address JSONB,
  saved_addresses JSONB DEFAULT '[]'::jsonb,
  auth_provider TEXT NOT NULL DEFAULT 'phone',
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS uniq_customer_account_store_phone
  ON store_customer_accounts(store_id, phone);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_email
  ON store_customer_accounts(store_id, email);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer
  ON store_customer_accounts(customer_id);

-- 2. جدول OTP
CREATE TABLE IF NOT EXISTS store_customer_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_otps_lookup
  ON store_customer_otps(phone, store_id);
CREATE INDEX IF NOT EXISTS idx_customer_otps_expires
  ON store_customer_otps(expires_at);

-- 3. جدول المفضلة
CREATE TABLE IF NOT EXISTS store_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_account_id UUID NOT NULL REFERENCES store_customer_accounts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL DEFAULT '',
  price_when_added DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_wishlist_item
  ON store_wishlists(store_id, customer_account_id, product_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_customer
  ON store_wishlists(store_id, customer_account_id);

-- 4. تنظيف OTPs المنتهية (يتنفذ يدوياً أو بـ cron)
-- DELETE FROM store_customer_otps WHERE expires_at < NOW() - INTERVAL '1 day';

-- 5. RLS Policies (اختياري — لو بتستخدم Supabase RLS)
-- ALTER TABLE store_customer_accounts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE store_customer_otps ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE store_wishlists ENABLE ROW LEVEL SECURITY;
```

---

## 6. متغيرات البيئة

```env
# === P4-A: Customer JWT ===
# توليد: openssl rand -base64 32
CUSTOMER_JWT_SECRET=your-super-secret-key-at-least-32-chars

# === P4-A: SMS Provider ===
# Options: 'twilio' | 'console' (console = للتجربة المحلية)
SMS_PROVIDER=console

# Twilio (لو SMS_PROVIDER=twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 7. خطة الاختبار

### اختبارات يدوية (Manual Testing)

| # | السيناريو | الخطوات | النتيجة المتوقعة |
|---|----------|---------|-----------------|
| 1 | إرسال OTP | POST /send-otp بـ storeId + phone | success + OTP في console |
| 2 | Rate limit OTP | POST /send-otp مرتين خلال 60 ثانية | خطأ "يرجى الانتظار" مع عدد الثواني |
| 3 | تحقق OTP صحيح | POST /verify-otp بالكود الصحيح | success + customer data + cookie |
| 4 | تحقق OTP خاطئ | POST /verify-otp بكود غلط 5 مرات | "تم تجاوز عدد المحاولات" |
| 5 | OTP منتهي | الانتظار 10 دقائق ثم verify | "الكود منتهي الصلاحية" |
| 6 | حسابي | GET /me بعد تسجيل الدخول | بيانات العميل |
| 7 | تحديث بروفايل | PUT /profile بإيميل جديد | البيانات تتحدث |
| 8 | Logout | POST /logout | الكوكي يتحذف |
| 9 | إضافة عنوان | POST /addresses | العنوان يتضاف + يبقى default لو أول واحد |
| 10 | المفضلة (زائر) | ضغط ❤️ بدون تسجيل | يتحفظ في localStorage |
| 11 | المفضلة (مسجّل) | ضغط ❤️ بعد تسجيل الدخول | يتحفظ في DB |
| 12 | مزامنة المفضلة | localStorage فيه items → يسجّل دخول | POST /sync → items تتنقل لـ DB |
| 13 | طلب سريع (redirect) | ضغط "اشتري الآن" | مسح السلة → إضافة المنتج → redirect لـ /checkout |
| 14 | Auto-fill checkout | عميل مسجّل يفتح /checkout | الاسم والموبايل والعنوان معبيين تلقائياً |
| 15 | ربط الحسابات | عميل مسجّل يعمل أول طلب | storeCustomerAccounts.customerId → يتربط |

---

## 8. الـ Prompt

البرومبت ده تقدر تستخدمه مع AI Agent عشان ينفذ P4-A:

---

```
أنت مطور Next.js خبير بتشتغل على منصة Matjary — منصة SaaS Multi-Tenant للتجارة الإلكترونية.

## المشروع
- **Stack**: Next.js 15.5.12 (App Router) + React 19 + TypeScript 5 + Drizzle ORM 0.45.1 + Supabase PostgreSQL + Clerk 6.37.5 (للتجار فقط) + Tailwind 4 + Zod 4
- **المسار**: workspace root
- **الهدف**: تنفيذ P4-A — حسابات العملاء + المفضلة + الطلب السريع

## الأنماط الموجودة في المشروع
- **API Response**: استخدم `apiSuccess(data)`, `ApiErrors.validation()`, `ApiErrors.unauthorized()`, `ApiErrors.notFound()`, `handleApiError(error)` من `@/lib/api/response`
- **Validation**: استخدم Zod v4 (syntax: `z.object({...})`)
- **Rate Limiting**: استخدم `rateLimit()`, `getClientIp()` من `@/lib/api/rate-limit`
- **Auth (التجار)**: Clerk — لا تلمسه. نظام العملاء الجديد مستقل تماماً
- **Settings**: محفوظة في `stores.settings` (JSONB). النوع `StoreSettings` في `src/db/schema.ts`
- **DB**: Drizzle ORM مع PostgreSQL. الجداول في `src/db/schema.ts`. Import from `@/db` and `@/db/schema`

## المطلوب تنفيذه (بالترتيب):

### الخطوة 1: تحديث Schema
1. أضف نوع `SavedAddress` في `src/db/schema.ts` (ShippingAddress & { id, label, isDefault })
2. أضف جدول `storeCustomerAccounts` (id, storeId FK stores, customerId FK? storeCustomers, phone, phoneVerified, email, passwordHash?, name, avatarUrl?, defaultAddress JSONB, savedAddresses JSONB, authProvider, lastLoginAt, isActive, createdAt, updatedAt) + indexes: unique(storeId,phone), idx(storeId,email), idx(customerId)
3. أضف جدول `storeCustomerOtps` (id, storeId FK stores, phone, otpHash, expiresAt, attempts, isUsed, createdAt) + indexes: idx(phone,storeId), idx(expiresAt)
4. أضف جدول `storeWishlists` (id, storeId FK stores, customerAccountId FK storeCustomerAccounts, productId FK storeProducts, variantId?, priceWhenAdded?, createdAt) + indexes: unique(storeId,customerAccountId,productId,variantId), idx(storeId,customerAccountId)
5. أضف Relations لكل الجداول الجديدة
6. أضف حقول `StoreSettings` الجديدة: customerAccountsEnabled, customerAuthMethods, requireAccountForCheckout, guestCheckoutAllowed, wishlistEnabled, wishlistGuestMode, quickCheckoutEnabled, quickCheckoutMode, skipCartEnabled

### الخطوة 2: مكتبة JWT
أنشئ `src/lib/auth/customer-jwt.ts`:
- استخدم `jose` (npm package — SignJWT, jwtVerify, HS256)
- Cookie name: `matjary_ct_{storeId.slice(0,8)}`
- Cookie options: httpOnly, secure (production), sameSite: 'lax', path: '/', maxAge: 30 days
- Functions: createCustomerSession, verifyCustomerSession, deleteCustomerSession, refreshCustomerSession
- Secret from env: CUSTOMER_JWT_SECRET

### الخطوة 3: خدمة OTP
أنشئ `src/lib/auth/otp-service.ts`:
- OTP: 6 أرقام، crypto.randomInt(100000, 999999)
- Hash: SHA-256 (crypto.createHash)
- Cooldown: 60 ثانية بين كل OTP
- Expiry: 10 دقائق
- Max attempts: 5
- SMS: interface مجرد — في البداية console.log، مع support لـ Twilio

### الخطوة 4: Customer Middleware
أنشئ `src/lib/auth/customer-middleware.ts`:
- Function: getCustomerAccount(storeId) — cached مع React cache()
- بيتحقق من JWT (optimistic) ثم من DB (secure)
- بيرجع CustomerAccount | null

### الخطوة 5: API Routes
أنشئ الروابط في `src/app/api/storefront/auth/`:
- `send-otp/route.ts` — POST — إرسال OTP (rate limited: 5/min/IP)
- `verify-otp/route.ts` — POST — تحقق + إنشاء/دخول + JWT session
- `me/route.ts` — GET — بيانات العميل (requires auth)
- `profile/route.ts` — PUT — تعديل البيانات (requires auth)
- `logout/route.ts` — POST — حذف session
- `orders/route.ts` — GET — قائمة الطلبات (by phone)
- `addresses/route.ts` — GET + POST — إدارة العناوين

أنشئ الروابط في `src/app/api/storefront/wishlist/`:
- `route.ts` — GET (قائمة مع product data) + POST (إضافة)
- `[productId]/route.ts` — DELETE
- `sync/route.ts` — POST — مزامنة localStorage → DB

### الخطوة 6: Zustand Store
أنشئ `src/lib/stores/wishlist-store.ts`:
- Zustand + persist (localStorage)
- Functions: addItem, removeItem, isInWishlist, clearAll, getItems

### الخطوة 7: UI Components
أنشئ:
- `src/app/store/_components/wishlist-button.tsx` — زر ❤️ مع optimistic updates
- `src/app/store/product/[slug]/_components/quick-buy-button.tsx` — زر "اشتري الآن" (redirect mode)

أنشئ صفحات حساب العميل:
- `src/app/store/account/layout.tsx` — layout مع sidebar
- `src/app/store/account/page.tsx` — ملخص الحساب
- `src/app/store/account/login/page.tsx` — تسجيل الدخول
- `src/app/store/account/login/_components/phone-login-form.tsx` — فورم OTP
- `src/app/store/account/orders/page.tsx` — قائمة الطلبات
- `src/app/store/account/addresses/page.tsx` — إدارة العناوين
- `src/app/store/account/wishlist/page.tsx` — صفحة المفضلة

### الخطوة 8: التكامل
- عدّل `store/checkout` عشان يعبّي بيانات العميل المسجّل تلقائياً (auto-fill)
- عدّل `POST /api/checkout` عشان يربط customerAccountId بـ customerId بعد أول طلب
- عدّل `src/lib/validations/store.ts` عشان يقبل الحقول الجديدة في settings

### الخطوة 9: Migration
أنشئ `migrations/p4a_customer_accounts_wishlist.sql` بالجداول الثلاثة + indexes

## قواعد مهمة:
- **لا تلمس Clerk** — ده للتجار فقط. نظام العملاء JWT مستقل
- **استخدم `jose`** (npm package) لـ JWT — NOT jsonwebtoken
- **OTP hash بـ SHA-256** — لا تحفظ OTP كـ plaintext أبداً
- **httpOnly cookies** — الـ token مش هيكون accessible من JavaScript
- **Rate limiting** على كل API routes — خصوصاً OTP
- **Zod validation** على كل input
- **RTL-first** — التصميم بالعربي أولاً
- **اتبع أنماط الكود الموجودة** — apiSuccess, ApiErrors, handleApiError
- **لا تكسر أي وظيفة موجودة** — الإضافات additive فقط
```

---

## ملخص الملفات المطلوب إنشاؤها/تعديلها

### ملفات جديدة (إنشاء):

| # | الملف | الوصف |
|---|------|-------|
| 1 | `src/lib/auth/customer-jwt.ts` | JWT مع jose + httpOnly cookies |
| 2 | `src/lib/auth/otp-service.ts` | توليد + تحقق OTP + إرسال SMS |
| 3 | `src/lib/auth/customer-middleware.ts` | getCustomerAccount() مع cache |
| 4 | `src/app/api/storefront/auth/send-otp/route.ts` | إرسال OTP |
| 5 | `src/app/api/storefront/auth/verify-otp/route.ts` | تحقق OTP + إنشاء session |
| 6 | `src/app/api/storefront/auth/me/route.ts` | بيانات العميل |
| 7 | `src/app/api/storefront/auth/profile/route.ts` | تعديل بروفايل |
| 8 | `src/app/api/storefront/auth/logout/route.ts` | تسجيل خروج |
| 9 | `src/app/api/storefront/auth/orders/route.ts` | قائمة طلباتي |
| 10 | `src/app/api/storefront/auth/addresses/route.ts` | إدارة العناوين |
| 11 | `src/app/api/storefront/wishlist/route.ts` | GET + POST المفضلة |
| 12 | `src/app/api/storefront/wishlist/[productId]/route.ts` | DELETE من المفضلة |
| 13 | `src/app/api/storefront/wishlist/sync/route.ts` | مزامنة localStorage → DB |
| 14 | `src/lib/stores/wishlist-store.ts` | Zustand + localStorage |
| 15 | `src/app/store/_components/wishlist-button.tsx` | زر ❤️ |
| 16 | `src/app/store/product/[slug]/_components/quick-buy-button.tsx` | زر "اشتري الآن" |
| 17 | `src/app/store/account/layout.tsx` | Layout حسابي |
| 18 | `src/app/store/account/page.tsx` | صفحة حسابي |
| 19 | `src/app/store/account/login/page.tsx` | تسجيل الدخول |
| 20 | `src/app/store/account/login/_components/phone-login-form.tsx` | فورم OTP |
| 21 | `src/app/store/account/orders/page.tsx` | طلباتي |
| 22 | `src/app/store/account/addresses/page.tsx` | عناويني |
| 23 | `src/app/store/account/wishlist/page.tsx` | مفضلتي |
| 24 | `migrations/p4a_customer_accounts_wishlist.sql` | SQL Migration |

### ملفات موجودة (تعديل):

| # | الملف | التغيير |
|---|------|--------|
| 1 | `src/db/schema.ts` | إضافة 3 جداول + SavedAddress type + StoreSettings fields + relations |
| 2 | `src/lib/validations/store.ts` | إضافة حقول P4-A في schema التحديث |
| 3 | `src/app/store/checkout/` | Auto-fill بيانات العميل المسجّل |
| 4 | `src/app/api/checkout/route.ts` | ربط customerAccountId بـ customerId |
| 5 | `package.json` | إضافة `jose` في dependencies |
