import postgres from 'postgres'
import fs from 'fs'

const sql = fs.readFileSync('migrations/add_ai_features.sql', 'utf-8')
const db = postgres(process.env.DIRECT_URL)

try {
  console.log('Connected to database!')
  await db.unsafe(sql)
  console.log('Migration executed successfully!')
  await db.end()
} catch (e) {
  console.error('Migration failed:', e.message)
  process.exit(1)
}
