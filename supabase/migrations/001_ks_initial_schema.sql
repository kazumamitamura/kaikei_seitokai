-- =====================================================
--  KS (Kaikei Seitokai) 部活動会計・予算管理システム
--  初期スキーマ — 共有Supabase DB 用 (ks_ プレフィックス)
-- =====================================================

-- =====================================================
-- 0. 共通 updated_at トリガー関数（存在しなければ作成）
-- =====================================================
CREATE OR REPLACE FUNCTION ks_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. ks_clubs — 部活動マスタ
-- =====================================================
CREATE TABLE IF NOT EXISTS ks_clubs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  total_budget  numeric(12,0) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE TRIGGER ks_clubs_updated_at
  BEFORE UPDATE ON ks_clubs
  FOR EACH ROW EXECUTE FUNCTION ks_set_updated_at();

-- =====================================================
-- 2. ks_users — ユーザー（auth.uid に紐づく）
-- =====================================================
-- role: 'admin' (事務担当/管理者), 'member' (一般部員),
--        'advisor' (顧問), 'approver' (承認者)
CREATE TABLE IF NOT EXISTS ks_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id       uuid NOT NULL REFERENCES ks_clubs(id) ON DELETE CASCADE,
  display_name  text NOT NULL DEFAULT '',
  role          text NOT NULL DEFAULT 'member'
                  CHECK (role IN ('admin', 'member', 'advisor', 'approver')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  UNIQUE (auth_uid, club_id)
);

CREATE TRIGGER ks_users_updated_at
  BEFORE UPDATE ON ks_users
  FOR EACH ROW EXECUTE FUNCTION ks_set_updated_at();

-- auth_uid で高速検索
CREATE INDEX IF NOT EXISTS idx_ks_users_auth_uid ON ks_users(auth_uid);

-- =====================================================
-- 3. ks_requests — 申請書
-- =====================================================
-- status: 'draft', 'submitted', 'approved', 'rejected', 'paid'
-- 各承認者カラム: 'pending', 'approved', 'rejected'
CREATE TABLE IF NOT EXISTS ks_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           uuid NOT NULL REFERENCES ks_clubs(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES ks_users(id) ON DELETE CASCADE,
  date              date NOT NULL DEFAULT CURRENT_DATE,
  job_title         text NOT NULL DEFAULT '',
  applicant_name    text NOT NULL DEFAULT '',
  category          text NOT NULL DEFAULT '',
  reason            text NOT NULL DEFAULT '',
  payee             text NOT NULL DEFAULT '',
  total_amount      numeric(12,0) NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  receipt_url       text,

  -- 10役職分の承認ステータス
  -- 'pending' = 未承認, 'approved' = 承認済, 'rejected' = 却下, NULL = 不要
  approval_club_president      text DEFAULT 'pending',  -- 部長
  approval_club_treasurer      text DEFAULT 'pending',  -- 部会計
  approval_advisor             text DEFAULT 'pending',  -- 顧問
  approval_council_treasurer   text DEFAULT 'pending',  -- 生徒会会計
  approval_council_vice        text DEFAULT 'pending',  -- 生徒会副会長
  approval_council_president   text DEFAULT 'pending',  -- 生徒会長
  approval_accounting_director text DEFAULT 'pending',  -- 会計部長
  approval_office              text DEFAULT 'pending',  -- 事務局
  approval_vice_principal      text DEFAULT 'pending',  -- 副校長/教頭
  approval_principal           text DEFAULT 'pending',  -- 校長

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE TRIGGER ks_requests_updated_at
  BEFORE UPDATE ON ks_requests
  FOR EACH ROW EXECUTE FUNCTION ks_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ks_requests_club_id ON ks_requests(club_id);
CREATE INDEX IF NOT EXISTS idx_ks_requests_user_id ON ks_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ks_requests_status  ON ks_requests(status);

-- =====================================================
-- 4. ks_request_items — 申請書明細
-- =====================================================
CREATE TABLE IF NOT EXISTS ks_request_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    uuid NOT NULL REFERENCES ks_requests(id) ON DELETE CASCADE,
  item_name     text NOT NULL DEFAULT '',
  quantity      integer NOT NULL DEFAULT 1,
  unit_price    numeric(12,0) NOT NULL DEFAULT 0,
  amount        numeric(12,0) NOT NULL DEFAULT 0,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE TRIGGER ks_request_items_updated_at
  BEFORE UPDATE ON ks_request_items
  FOR EACH ROW EXECUTE FUNCTION ks_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_ks_request_items_request_id ON ks_request_items(request_id);

-- =====================================================
-- 5. Row Level Security (RLS)
-- =====================================================
-- 方針: すべてのデータアクセスは ks_users.club_id で制限。
-- ユーザーは自分が所属する部活動のデータのみ操作可能。

-- ---- ks_clubs ----
ALTER TABLE ks_clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ks_clubs_select" ON ks_clubs
  FOR SELECT USING (
    id IN (
      SELECT club_id FROM ks_users
      WHERE auth_uid = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "ks_clubs_update" ON ks_clubs
  FOR UPDATE USING (
    id IN (
      SELECT club_id FROM ks_users
      WHERE auth_uid = auth.uid() AND deleted_at IS NULL
        AND role IN ('admin', 'advisor')
    )
  );

-- ---- ks_users ----
ALTER TABLE ks_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ks_users_select" ON ks_users
  FOR SELECT USING (
    club_id IN (
      SELECT club_id FROM ks_users AS u2
      WHERE u2.auth_uid = auth.uid() AND u2.deleted_at IS NULL
    )
  );

CREATE POLICY "ks_users_insert" ON ks_users
  FOR INSERT WITH CHECK (
    auth_uid = auth.uid()
  );

CREATE POLICY "ks_users_update" ON ks_users
  FOR UPDATE USING (
    auth_uid = auth.uid() AND deleted_at IS NULL
  );

-- ---- ks_requests ----
ALTER TABLE ks_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ks_requests_select" ON ks_requests
  FOR SELECT USING (
    club_id IN (
      SELECT club_id FROM ks_users
      WHERE auth_uid = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "ks_requests_insert" ON ks_requests
  FOR INSERT WITH CHECK (
    club_id IN (
      SELECT club_id FROM ks_users
      WHERE auth_uid = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "ks_requests_update" ON ks_requests
  FOR UPDATE USING (
    club_id IN (
      SELECT club_id FROM ks_users
      WHERE auth_uid = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "ks_requests_delete" ON ks_requests
  FOR DELETE USING (
    club_id IN (
      SELECT club_id FROM ks_users
      WHERE auth_uid = auth.uid() AND deleted_at IS NULL
    )
  );

-- ---- ks_request_items ----
ALTER TABLE ks_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ks_request_items_select" ON ks_request_items
  FOR SELECT USING (
    request_id IN (
      SELECT r.id FROM ks_requests r
      WHERE r.club_id IN (
        SELECT club_id FROM ks_users
        WHERE auth_uid = auth.uid() AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY "ks_request_items_insert" ON ks_request_items
  FOR INSERT WITH CHECK (
    request_id IN (
      SELECT r.id FROM ks_requests r
      WHERE r.club_id IN (
        SELECT club_id FROM ks_users
        WHERE auth_uid = auth.uid() AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY "ks_request_items_update" ON ks_request_items
  FOR UPDATE USING (
    request_id IN (
      SELECT r.id FROM ks_requests r
      WHERE r.club_id IN (
        SELECT club_id FROM ks_users
        WHERE auth_uid = auth.uid() AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY "ks_request_items_delete" ON ks_request_items
  FOR DELETE USING (
    request_id IN (
      SELECT r.id FROM ks_requests r
      WHERE r.club_id IN (
        SELECT club_id FROM ks_users
        WHERE auth_uid = auth.uid() AND deleted_at IS NULL
      )
    )
  );

-- =====================================================
-- 6. ストレージバケット: ks_receipts
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ks_receipts', 'ks_receipts', false)
ON CONFLICT (id) DO NOTHING;

-- バケットRLS: 自分の部活のファイルのみアクセス
-- パス規則: /{club_id}/{request_id}/{filename}
CREATE POLICY "ks_receipts_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'ks_receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT club_id::text FROM ks_users
      WHERE auth_uid = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "ks_receipts_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ks_receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT club_id::text FROM ks_users
      WHERE auth_uid = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "ks_receipts_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'ks_receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT club_id::text FROM ks_users
      WHERE auth_uid = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "ks_receipts_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'ks_receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT club_id::text FROM ks_users
      WHERE auth_uid = auth.uid() AND deleted_at IS NULL
    )
  );

-- =====================================================
-- 完了
-- =====================================================
