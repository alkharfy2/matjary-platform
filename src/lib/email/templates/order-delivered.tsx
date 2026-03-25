/**
 * Template: تأكيد التوصيل — يتبعت للعميل عند تحديث حالة الطلب لـ delivered
 */

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
} from '@react-email/components'

type OrderDeliveredProps = {
  storeName: string
  orderNumber: string
  customerName: string
}

export function OrderDeliveredEmail(props: OrderDeliveredProps) {
  return (
    <Html lang="ar" dir="rtl">
      <Head />
      <Body style={{ fontFamily: 'Cairo, Arial, sans-serif', backgroundColor: '#f4f4f5', padding: '20px 0' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px' }}>

          <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Heading style={{ fontSize: '24px', color: '#1f2937', margin: '0 0 8px' }}>
              ✅ تم توصيل طلبك!
            </Heading>
            <Text style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              طلبك #{props.orderNumber} من {props.storeName} تم توصيله بنجاح
            </Text>
          </Section>

          <Section style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <Text style={{ margin: '0 0 4px' }}>مرحباً {props.customerName}،</Text>
            <Text style={{ margin: 0 }}>نأمل أن تكون راضياً عن طلبك. شكراً لتسوقك من {props.storeName}!</Text>
          </Section>

          <Section style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
            <Text>هذا الإيميل تم إرساله تلقائياً من {props.storeName} عبر منصة متجري</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
