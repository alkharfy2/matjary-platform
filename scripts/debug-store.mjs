import postgres from 'postgres';

const client = postgres('postgresql://postgres.bhxbdarpzwbhrodaamxm:cveeezg123%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres');

try {
  // Get stores columns
  const cols = await client`SELECT column_name FROM information_schema.columns WHERE table_name = 'stores' ORDER BY ordinal_position`;
  console.log('Stores columns:', cols.map(r => r.column_name));
  
  // Find test-store-p0
  const stores = await client`SELECT * FROM stores WHERE slug = 'test-store-p0'`;
  console.log('test-store-p0 found:', stores.length);
  if (stores.length > 0) {
    console.log('Store:', JSON.stringify(stores[0], null, 2));
  }
  
  // All slugs  
  const allSlugs = await client`SELECT slug FROM stores`;
  console.log('All slugs:', allSlugs.map(r => r.slug));
} catch(e) {
  console.error('ERROR:', e.message);
} finally {
  await client.end();
}
