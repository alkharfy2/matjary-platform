-- migrations/add_upsell_crosssell.sql
-- P1: Upsell Rules + Product Relations (Cross-sell)

CREATE TABLE IF NOT EXISTS store_upsell_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  trigger_product_id UUID,  -- null = أي منتج
  offer_product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_upsell_store ON store_upsell_rules(store_id);
CREATE INDEX idx_upsell_trigger ON store_upsell_rules(trigger_product_id);

CREATE TABLE IF NOT EXISTS store_product_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  related_product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'cross_sell',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, product_id, related_product_id, relation_type)
);

CREATE INDEX idx_relations_product ON store_product_relations(product_id);
