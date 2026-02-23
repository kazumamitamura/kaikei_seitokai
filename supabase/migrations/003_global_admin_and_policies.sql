-- =====================================================
-- 003: global_admin ロールの追加 + RLS ポリシー
-- =====================================================
-- 全体管理者（生徒会本部/教員）が全クラブのデータを閲覧・承認できるようにする

-- ── 1. role CHECK 制約の更新 ──
ALTER TABLE ks_users DROP CONSTRAINT IF EXISTS ks_users_role_check;
ALTER TABLE ks_users ADD CONSTRAINT ks_users_role_check
  CHECK (role IN ('admin', 'member', 'advisor', 'approver', 'global_admin'));

-- ── 2. global_admin は全クラブを参照可能 ──
CREATE POLICY "ks_clubs_global_admin_select" ON ks_clubs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ks_users
      WHERE auth_uid = auth.uid()
        AND role = 'global_admin'
        AND deleted_at IS NULL
    )
  );

-- ── 3. global_admin は全申請を参照可能 ──
CREATE POLICY "ks_requests_global_admin_select" ON ks_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ks_users
      WHERE auth_uid = auth.uid()
        AND role = 'global_admin'
        AND deleted_at IS NULL
    )
  );

-- ── 4. global_admin は全申請のステータスを変更可能 ──
CREATE POLICY "ks_requests_global_admin_update" ON ks_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM ks_users
      WHERE auth_uid = auth.uid()
        AND role = 'global_admin'
        AND deleted_at IS NULL
    )
  );

-- ── 5. global_admin は全申請の明細を参照可能 ──
CREATE POLICY "ks_request_items_global_admin_select" ON ks_request_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ks_users
      WHERE auth_uid = auth.uid()
        AND role = 'global_admin'
        AND deleted_at IS NULL
    )
  );

-- ── 6. global_admin は全領収書ファイルを参照可能 ──
CREATE POLICY "ks_receipts_global_admin_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'ks_receipts'
    AND EXISTS (
      SELECT 1 FROM ks_users
      WHERE auth_uid = auth.uid()
        AND role = 'global_admin'
        AND deleted_at IS NULL
    )
  );
