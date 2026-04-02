const { default: postgres } = await import('postgres');
const sql = postgres('postgresql://postgres.bhxbdarpzwbhrodaamxm:cveeezg123%40@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true', { ssl: 'require', prepare: false });
const storeId = '18560740-abcf-4649-a72e-6bcdb276bc97';

try {
  // Get product IDs
  const products = await sql`SELECT id, name, slug FROM store_products WHERE store_id = ${storeId} ORDER BY created_at`;
  console.log('Products:', JSON.stringify(products));

  const bagId = products.find(p => p.slug === 'luxury-leather-bag')?.id;
  const watchId = products.find(p => p.slug === 'classic-wristwatch')?.id;
  const glassesId = products.find(p => p.slug === 'sport-sunglasses')?.id;

  if (!bagId || !watchId || !glassesId) {
    throw new Error('Products not found');
  }

  // Add Upsell Rule: already added
  console.log('Upsell rule: already exists');

  // Add Cross-sell relations
  // Bag <-> Watch
  const cs1 = await sql`INSERT INTO store_product_relations (store_id, product_id, related_product_id, relation_type)
    VALUES (${storeId}, ${bagId}, ${watchId}, 'cross_sell')
    RETURNING id`;
  // Bag <-> Glasses
  const cs2 = await sql`INSERT INTO store_product_relations (store_id, product_id, related_product_id, relation_type)
    VALUES (${storeId}, ${bagId}, ${glassesId}, 'cross_sell')
    RETURNING id`;
  // Watch <-> Glasses
  const cs3 = await sql`INSERT INTO store_product_relations (store_id, product_id, related_product_id, relation_type)
    VALUES (${storeId}, ${watchId}, ${glassesId}, 'cross_sell')
    RETURNING id`;

  console.log('Cross-sell relations:', JSON.stringify([cs1, cs2, cs3]));
  console.log('✅ Done - Upsell rule + 3 cross-sell relations added');
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await sql.end();
}
