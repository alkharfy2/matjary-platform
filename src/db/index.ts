import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn('⚠️ DATABASE_URL is not set — database queries will fail at runtime')
}

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

// في development: نخزن على globalThis لتجنب connection leak عند HMR
// في production: module-level variable كافٍ (لا HMR)
const globalForDb = globalThis as unknown as {
  _matjaryDb: DrizzleDb | undefined
  _matjaryClient: ReturnType<typeof postgres> | undefined
}

// module-level cache for production
let moduleDb: DrizzleDb | undefined

function getDb(): DrizzleDb {
  // في development: نرجع الـ cached instance من globalThis (عشان الـ HMR)
  // في production: نرجع الـ module-level instance
  const cachedDb = process.env.NODE_ENV !== 'production'
    ? globalForDb._matjaryDb
    : moduleDb

  if (cachedDb) return cachedDb

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const client = postgres(connectionString, {
    prepare: false,
    max: 10,           // الحد الأقصى للـ connections في الـ pool
    idle_timeout: 20,  // إغلاق connections الخاملة بعد 20 ثانية
    max_lifetime: 60 * 30, // إعادة إنشاء connections كل 30 دقيقة
    connect_timeout: 8, // تجنب timeout على Vercel Hobby (10s limit)
  })
  const db = drizzle(client, { schema })

  // نحفظ الـ instance دائماً لتجنب إنشاء connections جديدة كل مرة
  if (process.env.NODE_ENV !== 'production') {
    globalForDb._matjaryDb = db
    globalForDb._matjaryClient = client
  } else {
    moduleDb = db
  }

  return db
}

// Proxy that lazily initializes the db on first property access
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
export { schema }
