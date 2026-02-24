-- =====================================================
-- 005: リビジョン番号カラム追加
-- =====================================================
ALTER TABLE ks_requests
  ADD COLUMN IF NOT EXISTS revision_number integer NOT NULL DEFAULT 1;
