// env loaded via --env-file flag in tsx
import { db } from '@/db'
import { platformPlans } from '@/db/schema'

async function seed() {
  console.log('🌱 Seeding platform plans...')

  await db.insert(platformPlans).values([
    {
      id: 'free',
      name: 'مجاني',
      nameEn: 'Free',
      priceMonthly: '0',
      priceYearly: '0',
      orderFee: '2.00',
      maxProducts: 25,
      maxOrdersPerMonth: 100,
      features: [
        'متجر إلكتروني كامل',
        'رابط متجر مجاني',
        'الدفع عند الاستلام',
        'إشعارات الطلبات',
        'دعم واتساب',
      ],
      isActive: true,
      sortOrder: 0,
    },
    {
      id: 'basic',
      name: 'أساسي',
      nameEn: 'Basic',
      priceMonthly: '199',
      priceYearly: '1990',
      orderFee: '0',
      maxProducts: 500,
      maxOrdersPerMonth: 2000,
      features: [
        'كل مميزات المجاني',
        'بدون عمولة على الطلبات',
        'ربط دومين مخصص',
        'بوابة دفع إلكتروني',
        'كوبونات خصم',
        'تقارير وإحصائيات',
        'مناطق شحن متقدمة',
      ],
      isMostPopular: true,
      isActive: true,
      sortOrder: 1,
    },
    {
      id: 'pro',
      name: 'احترافي',
      nameEn: 'Pro',
      priceMonthly: '499',
      priceYearly: '4990',
      orderFee: '0',
      maxProducts: null,
      maxOrdersPerMonth: null,
      features: [
        'كل مميزات الأساسي',
        'منتجات غير محدودة',
        'طلبات غير محدودة',
        'صفحات هبوط',
        'تقييمات العملاء',
        'دعم أولوية',
        'تصدير البيانات',
        'API للمطورين',
      ],
      isActive: true,
      sortOrder: 2,
    },
  ]).onConflictDoNothing()

  console.log('✅ Seed complete!')
  process.exit(0)
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error)
  process.exit(1)
})
