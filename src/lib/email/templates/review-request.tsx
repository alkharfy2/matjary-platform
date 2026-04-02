import * as React from 'react'

type ReviewRequestEmailProps = {
  storeName: string
  customerName: string
  reviewUrl: string
}

export function ReviewRequestEmail({ storeName, customerName, reviewUrl }: ReviewRequestEmailProps) {
  return (
    <div dir="rtl" style={{ fontFamily: 'Tahoma, Arial, sans-serif', lineHeight: 1.8, color: '#1a1a1a', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ padding: '32px 24px', backgroundColor: '#f7f7f7', borderRadius: '12px' }}>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>شكراً لتسوقك من {storeName}! ⭐</h1>
        <p style={{ fontSize: 15, color: '#4a4a4a' }}>
          مرحباً {customerName}،
        </p>
        <p style={{ fontSize: 15, color: '#4a4a4a' }}>
          يسعدنا أنك استلمت طلبك! نحب نسمع رأيك عن تجربتك معنا.
          تقييمك يساعد عملاء آخرين في اتخاذ قرار الشراء.
        </p>
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <a
            href={reviewUrl}
            style={{
              backgroundColor: '#000',
              color: '#fff',
              padding: '14px 32px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 'bold',
              display: 'inline-block',
            }}
          >
            ⭐ قيّم تجربتك
          </a>
        </div>
        <p style={{ fontSize: 13, color: '#888' }}>
          هذا الرابط صالح لمدة 14 يوم.
        </p>
      </div>
    </div>
  )
}
