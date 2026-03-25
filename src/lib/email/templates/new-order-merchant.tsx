/**
 * Template: طلب جديد — يتبعت للتاجر عند إنشاء طلب
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

type NewOrderMerchantProps = {
  storeName: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  items: Array<{
    name: string
    quantity: number
    price: number
    total: number
  }>
  total: number
  currency: string
  paymentMethod: 'cod' | 'kashier'
  shippingAddress: string
}

export function NewOrderMerchantEmail(props: NewOrderMerchantProps) {
  const currencyLabel = props.currency === 'EGP' ? 'ج.م' : props.currency

  return (
    <Html lang="ar" dir="rtl">
      <Head />
      <Body style={{ fontFamily: 'Cairo, Arial, sans-serif', backgroundColor: '#f4f4f5', padding: '20px 0' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px' }}>

          <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Heading style={{ fontSize: '24px', color: '#1f2937', margin: '0 0 8px' }}>
              🛒 طلب جديد!
            </Heading>
            <Text style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              وصل طلب جديد لمتجر {props.storeName}
            </Text>
          </Section>

          <Section style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <Text style={{ margin: '0 0 4px', fontWeight: 'bold' }}>رقم الطلب: #{props.orderNumber}</Text>
            <Text style={{ margin: '0 0 4px' }}>العميل: {props.customerName}</Text>
            <Text style={{ margin: '0 0 4px' }}>الهاتف: {props.customerPhone}</Text>
            {props.customerEmail && <Text style={{ margin: '0 0 4px' }}>الإيميل: {props.customerEmail}</Text>}
            <Text style={{ margin: '0 0 4px' }}>العنوان: {props.shippingAddress}</Text>
            <Text style={{ margin: 0 }}>
              الدفع: {props.paymentMethod === 'cod' ? 'عند الاستلام' : 'إلكتروني'}
            </Text>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb' }} />

          <Section style={{ marginBottom: '24px' }}>
            <Heading as="h3" style={{ fontSize: '16px', marginBottom: '12px' }}>المنتجات</Heading>
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

          <Section>
            <Row>
              <Column><Text style={{ fontWeight: 'bold', fontSize: '18px' }}>الإجمالي</Text></Column>
              <Column style={{ textAlign: 'left' }}><Text style={{ fontWeight: 'bold', fontSize: '18px' }}>{props.total} {currencyLabel}</Text></Column>
            </Row>
          </Section>

          <Section style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px', marginTop: '24px' }}>
            <Text>منصة متجري — إشعار تلقائي</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
