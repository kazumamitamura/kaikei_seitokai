-- =====================================================
-- 004: 承認フロー JSONB + 返却理由カラム追加
-- =====================================================
-- approval_flow: 承認履歴を保存する JSONB 配列
-- Format: [{"role":"部署担当者","name":"田中太郎","approved_at":"2026-02-24T09:00:00+09:00"}, ...]
-- rejection_reason: 返却時の理由テキスト

ALTER TABLE ks_requests
  ADD COLUMN IF NOT EXISTS approval_flow jsonb DEFAULT '[]'::jsonb;

ALTER TABLE ks_requests
  ADD COLUMN IF NOT EXISTS rejection_reason text;
