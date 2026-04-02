const { default: postgres } = await import('postgres');
const sql = postgres('postgresql://postgres.bhxbdarpzwbhrodaamxm:cveeezg123%40@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true', { ssl: 'require', prepare: false });
const storeId = '18560740-abcf-4649-a72e-6bcdb276bc97';

const govs = [
  'القاهرة','الجيزة','الإسكندرية','الشرقية','المنوفية','الدقهلية','الغربية',
  'القليوبية','البحيرة','كفر الشيخ','المنيا','أسيوط','سوهاج','قنا','الأقصر',
  'أسوان','الفيوم','بني سويف','بورسعيد','السويس','الإسماعيلية','دمياط',
  'شمال سيناء','جنوب سيناء','البحر الأحمر','الوادي الجديد','مطروح'
];

try {
  const r = await sql`
    INSERT INTO store_shipping_zones (store_id, name, governorates, shipping_fee, free_shipping_minimum, estimated_days, is_active, sort_order)
    VALUES (${storeId}, ${'شحن داخل مصر'}, ${JSON.stringify(govs)}::jsonb, ${30.00}, ${500.00}, ${'2-5 أيام عمل'}, ${true}, ${0})
    RETURNING id
  `;
  console.log('Shipping zone created:', r[0].id);
} catch (e) {
  console.error(e);
} finally {
  await sql.end();
}
