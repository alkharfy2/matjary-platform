import postgres from 'postgres'

const db = postgres(process.env.DIRECT_URL)

const r = await db`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'store_blog%'`
console.log('Blog tables:', r)

const r2 = await db`SELECT COUNT(*) FROM store_blog_posts`
console.log('Blog posts count:', r2)

await db.end()
