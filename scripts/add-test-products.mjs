const { default: postgres } = await import('postgres');
const sql = postgres('postgresql://postgres.bhxbdarpzwbhrodaamxm:cveeezg123%40@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true', { ssl: 'require', prepare: false });
const storeId = '18560740-abcf-4649-a72e-6bcdb276bc97';

try {
  const p1 = await sql`INSERT INTO store_products (store_id, name, slug, price, description, stock, is_active, is_featured, images, track_inventory)
    VALUES (${storeId}, 'حقيبة جلدية فاخرة', 'luxury-leather-bag', 250.00, 'حقيبة جلدية أصلية بتصميم عصري أنيق، مناسبة للاستخدام اليومي والمناسبات.', 50, true, true, '[]', true)
    RETURNING id, name`;

  const p2 = await sql`INSERT INTO store_products (store_id, name, slug, price, description, stock, is_active, is_featured, images, track_inventory)
    VALUES (${storeId}, 'ساعة يد كلاسيكية', 'classic-wristwatch', 450.00, 'ساعة يد أنيقة بتصميم كلاسيكي ومقاومة للماء.', 30, true, false, '[]', true)
    RETURNING id, name`;

  const p3 = await sql`INSERT INTO store_products (store_id, name, slug, price, description, stock, is_active, is_featured, images, track_inventory)
    VALUES (${storeId}, 'نظارة شمسية رياضية', 'sport-sunglasses', 120.00, 'نظارة شمسية خفيفة الوزن مناسبة للرياضة والأنشطة الخارجية.', 100, true, false, '[]', true)
    RETURNING id, name`;

  console.log('Product 1:', JSON.stringify(p1));
  console.log('Product 2:', JSON.stringify(p2));
  console.log('Product 3:', JSON.stringify(p3));
  console.log('✅ Done - 3 products added');
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await sql.end();
}
