-- Migration: add "most popular" flag to platform plans
-- Date: 2026-03-09

ALTER TABLE platform_plans
  ADD COLUMN IF NOT EXISTS is_most_popular BOOLEAN NOT NULL DEFAULT false;

UPDATE platform_plans
SET is_most_popular = true
WHERE id = 'basic'
  AND NOT EXISTS (
    SELECT 1
    FROM platform_plans
    WHERE is_most_popular = true
  );

CREATE UNIQUE INDEX IF NOT EXISTS uniq_platform_plans_most_popular_true
  ON platform_plans (is_most_popular)
  WHERE is_most_popular = true;
