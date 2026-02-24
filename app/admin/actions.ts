"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { APPROVAL_ROLES } from "./types";
import type { ApprovalRole, ApprovalEntry } from "./types";

async function getCurrentUser() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data: ksUser } = await admin
        .from("ks_users")
        .select("id, display_name, role")
        .eq("auth_uid", user.id)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

    return ksUser;
}

/**
 * 指定された役職として申請を承認する
 * approval_flow JSONB に承認記録を追加。全5役職が承認済みなら status → 'approved'
 */
export async function approveAsRole(
    requestId: string,
    role: ApprovalRole,
    approverName: string
): Promise<{ error: string | null }> {
    const ksUser = await getCurrentUser();
    if (!ksUser) {
        return { error: "認証エラー: ログインし直してください。" };
    }

    const admin = createAdminClient();

    // 現在の approval_flow を取得
    const { data: request, error: fetchError } = await admin
        .from("ks_requests")
        .select("approval_flow, status")
        .eq("id", requestId)
        .single();

    if (fetchError || !request) {
        return { error: "申請データの取得に失敗しました。" };
    }

    if (request.status === "rejected") {
        return { error: "差し戻し済みの申請は承認できません。" };
    }

    const currentFlow: ApprovalEntry[] = Array.isArray(request.approval_flow)
        ? request.approval_flow
        : [];

    // 同じ役職での重複承認を防ぐ
    if (currentFlow.some((entry) => entry.role === role)) {
        return { error: `「${role}」は既に承認済みです。` };
    }

    // 新しい承認記録を追加
    const newEntry: ApprovalEntry = {
        role,
        name: approverName || ksUser.display_name || "不明",
        approved_at: new Date().toISOString(),
    };

    const updatedFlow = [...currentFlow, newEntry];

    // 全5役職が承認済みか判定
    const approvedRoles = new Set(updatedFlow.map((e) => e.role));
    const allApproved = APPROVAL_ROLES.every((r) => approvedRoles.has(r));

    const updateData: Record<string, unknown> = {
        approval_flow: updatedFlow,
    };

    if (allApproved) {
        updateData.status = "approved";
    }

    const { error: updateError } = await admin
        .from("ks_requests")
        .update(updateData)
        .eq("id", requestId);

    if (updateError) {
        console.error("❌ 承認失敗:", updateError.message);
        return { error: `承認処理に失敗しました: ${updateError.message}` };
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { error: null };
}

/**
 * 申請を差し戻す（理由必須）
 */
export async function rejectWithReason(
    requestId: string,
    reason: string,
    rejectorName: string
): Promise<{ error: string | null }> {
    const ksUser = await getCurrentUser();
    if (!ksUser) {
        return { error: "認証エラー: ログインし直してください。" };
    }

    if (!reason.trim()) {
        return { error: "返却理由を入力してください。" };
    }

    const admin = createAdminClient();

    const { error: updateError } = await admin
        .from("ks_requests")
        .update({
            status: "rejected",
            rejection_reason: `${rejectorName || ksUser.display_name || "不明"}: ${reason.trim()}`,
        })
        .eq("id", requestId)
        .in("status", ["submitted", "draft"]);

    if (updateError) {
        console.error("❌ 差し戻し失敗:", updateError.message);
        return { error: `差し戻し処理に失敗しました: ${updateError.message}` };
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { error: null };
}
