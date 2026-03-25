import { defineConfig } from 'drizzle-kit'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// drizzle-kit لا يقرأ .env.local تلقائياً — نحمّله يدوياً
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim()
    if (key && !(key in process.env)) {
      process.env[key] = value
    }
  }
} catch {
  // .env.local غير موجود — استخدم المتغيرات الموجودة في البيئة
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // استخدم DIRECT_URL للـ migrations (بدون pgbouncer)
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
})
