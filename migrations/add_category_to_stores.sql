-- إضافة عمود category لجدول stores
-- التصنيف اختياري — يُحدد عند إنشاء المتجر من Onboarding

ALTER TABLE stores ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN stores.category IS 'تصنيف المتجر: clothing, electronics, food, beauty, other';
