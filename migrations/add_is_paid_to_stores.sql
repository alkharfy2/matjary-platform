-- Migration: إضافة حقول الاشتراك على جدول stores
-- التاريخ: 3 مارس 2026

ALTER TABLE stores ADD COLUMN is_paid BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE stores ADD COLUMN subscription_amount DECIMAL(10,2);
ALTER TABLE stores ADD COLUMN subscription_paid_at TIMESTAMPTZ;
ALTER TABLE stores ADD COLUMN subscription_transaction_id TEXT;

-- المتاجر الموجودة على خطة free تكون مدفوعة تلقائياً (مش محتاجة دفع)
UPDATE stores SET is_paid = true WHERE plan = 'free';
