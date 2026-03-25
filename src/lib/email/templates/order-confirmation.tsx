/**
 * Template: تأكيد الطلب — يتبعت للعميل بعد إنشاء الطلب
 */

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Row,
  Column,
} from '@react-email/components'

type OrderConfirmationProps = {
  storeName: string
  orderNumber: string
  customerName: string
  items: Array<{
    name: string
    quantity: number
    price: number
    total: number
  }>
  subtotal: number
  shippingCost: number
  discount: number
  total: number
  currency: string
  paymentMethod: 'cod' | 'kashier'
  shippingAddress: string
}

export function OrderConfirmationEmail(props: OrderConfirmationProps) {
  const currencyLabel = props.currency === 'EGP' ? 'ج.م' : props.currency

  return (
    <Html lang="ar" dir="rtl">
      <Head />
      <Body style={{ fontFamily: 'Cairo, Arial, sans-serif', backgroundColor: '#f4f4f5', padding: '20px 0' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px' }}>

          <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Heading style={{ fontSize: '24px', color: '#1f2937', margin: '0 0 8px' }}>
              تم تأكيد طلبك بنجاح ✅
            </Heading>
            <Text style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              شكراً لتسوقك من {props.storeName}
            </Text>
          </Section>

          <Section style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <Text style={{ margin: '0 0 4px', fontWeight: 'bold' }}>رقم الطلب: #{props.orderNumber}</Text>
            <Text style={{ margin: '0 0 4px' }}>الاسم: {props.customerName}</Text>
            <Text style={{ margin: '0 0 4px' }}>العنوان: {props.shippingAddress}</Text>
            <Text style={{ margin: 0 }}>
              طريقة الدفع: {props.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'دفع إلكتروني'}
            </Text>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb' }} />

          <Section style={{ marginBottom: '24px' }}>
            <Heading as="h3" style={{ fontSize: '16px', marginBottom: '12px' }}>تفاصيل الطلب</Heading>
            {props.items.map((item, i) => (
              <Row key={i} style={{ marginBottom: '8px' }}>
                <Column style={{ width: '60%' }}>
                  <Text style={{ margin: 0 }}>{item.name} × {item.quantity}</Text>
                </Column>
                <Column style={{ width: '40%', textAlign: 'left' }}>
                  <Text style={{ margin: 0 }}>{item.total} {currencyLabel}</Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={{ borderColor: '#e5e7eb' }} />

          <Section style={{ marginBottom: '24px' }}>
            <Row><Column><Text>المجموع الفرعي</Text></Column><Column style={{ textAlign: 'left' }}><Text>{props.subtotal} {currencyLabel}</Text></Column></Row>
            <Row><Column><Text>الشحن</Text></Column><Column style={{ textAlign: 'left' }}><Text>{props.shippingCost} {currencyLabel}</Text></Column></Row>
            {props.discount > 0 && (
              <Row><Column><Text>الخصم</Text></Column><Column style={{ textAlign: 'left' }}><Text style={{ color: '#16a34a' }}>-{props.discount} {currencyLabel}</Text></Column></Row>
            )}
            <Hr style={{ borderColor: '#e5e7eb' }} />
            <Row>
              <Column><Text style={{ fontWeight: 'bold', fontSize: '18px' }}>الإجمالي</Text></Column>
              <Column style={{ textAlign: 'left' }}><Text style={{ fontWeight: 'bold', fontSize: '18px' }}>{props.total} {currencyLabel}</Text></Column>
            </Row>
          </Section>

          <Section style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
            <Text>هذا الإيميل تم إرساله تلقائياً من {props.storeName} عبر منصة متجري</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
