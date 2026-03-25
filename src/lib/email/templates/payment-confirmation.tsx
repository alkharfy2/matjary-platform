/**
 * Template: تأكيد الدفع — يتبعت للعميل بعد نجاح الدفع الإلكتروني
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

type PaymentConfirmationProps = {
  storeName: string
  orderNumber: string
  customerName: string
  total: number
  currency: string
}

export function PaymentConfirmationEmail(props: PaymentConfirmationProps) {
  const currencyLabel = props.currency === 'EGP' ? 'ج.م' : props.currency

  return (
    <Html lang="ar" dir="rtl">
      <Head />
      <Body style={{ fontFamily: 'Cairo, Arial, sans-serif', backgroundColor: '#f4f4f5', padding: '20px 0' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px' }}>

          <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Heading style={{ fontSize: '24px', color: '#1f2937', margin: '0 0 8px' }}>
              💳 تم تأكيد الدفع!
            </Heading>
            <Text style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              تم استلام دفعتك بنجاح لطلب #{props.orderNumber}
            </Text>
          </Section>

          <Section style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
            <Text style={{ margin: '0 0 4px' }}>مرحباً {props.customerName}،</Text>
            <Text style={{ margin: '0 0 4px' }}>تم تأكيد دفعتك بقيمة {props.total} {currencyLabel} لطلب #{props.orderNumber}.</Text>
            <Text style={{ margin: 0 }}>سيتم تحضير طلبك وشحنه في أقرب وقت.</Text>
          </Section>

          <Section style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
            <Text>هذا الإيميل تم إرساله تلقائياً من {props.storeName} عبر منصة متجري</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
