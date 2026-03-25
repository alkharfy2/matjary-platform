/**
 * Kashier Payment Session — Integration Test
 * يختبر إنشاء جلسة دفع مع Kashier API مباشرة
 *
 * Usage: node scripts/test-kashier.mjs
 */

const MERCHANT_ID = 'MID-31202-773'
const API_KEY = 'a3a25d72-c3bb-4168-96dd-3267bd3bcf1a'
const SECRET = '861929a48e71c181cea03fbba1057803' + String.fromCharCode(36) + '7919d489dddf89b2a4965bdfb666256a35bc05a3303b9b57629bf3067d329cc38cc780a3a761d7feb0130af91ccfecdb'
const API_URL = 'https://api.kashier.io/v3/payment/sessions'

const orderNumber = 'TEST-' + Date.now()

const body = {
  expireAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  maxFailureAttempts: 3,
  paymentType: 'credit',
  amount: '25.00',
  currency: 'EGP',
  order: orderNumber,
  merchantId: MERCHANT_ID,
  merchantRedirect: 'https://placeholder.example.com/store/order-success?orderId=test-123',
  display: 'ar',
  type: 'external',
  allowedMethods: 'card,wallet',
  failureRedirect: 'true',
  customer: {
    email: 'test@example.com',
    reference: 'cust-test-001',
  },
  metaData: {
    orderId: 'test-123',
    storeId: 'store-test',
    customerName: 'Test User',
  },
}

console.log('=== Kashier Session Test ===')
console.log('Merchant ID:', MERCHANT_ID)
console.log('API Key:', API_KEY)
console.log('Secret length:', SECRET.length, '| char@32:', SECRET[32])
console.log('API URL:', API_URL)
console.log('Order:', orderNumber)
console.log('')

try {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': SECRET,
      'api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()

  if (res.ok) {
    const data = JSON.parse(text)
    console.log('✅ Session created successfully!')
    console.log('   Session ID:', data._id)
    console.log('   Status:', data.status)
    console.log('   Payment URL:', data.sessionUrl || `https://payments.kashier.io/session/${data._id}?mode=live`)
    console.log('   Amount:', data.paymentParams?.amount, data.paymentParams?.currency)
  } else {
    console.log('❌ Failed! Status:', res.status)
    console.log('   Response:', text)
  }
} catch (err) {
  console.log('❌ Error:', err.message)
}
