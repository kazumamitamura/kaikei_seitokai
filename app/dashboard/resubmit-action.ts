"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * 差し戻された申請を修正・再提出する
 * ステータスを submitted に戻し、revision_number を +1、approval_flow をリセット
 */
export async function resubmitRequest(
    formData: FormData
): Promise<{ error: string | null }> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "認証エラー: ログインし直してください。" };
    }

    const admin = createAdminClient();

    // ks_users 取得
    const { data: ksUser } = await admin
        .from("ks_users")
        .select("id, club_id")
        .eq("auth_uid", user.id)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

    if (!ksUser) {
        return { error: "ユーザー情報が見つかりません。" };
    }

    const requestId = formData.get("request_id") as string;
    const reason = formData.get("reason") as string;
    const category = formData.get("category") as string;
    const payee = formData.get("payee") as string;
    const itemsJson = formData.get("items") as string;

    if (!requestId) {
        return { error: "申請IDが不正です。" };
    }

    // 元の申請を取得してオーナー確認
    const { data: original } = await admin
        .from("ks_requests")
        .select("id, user_id, status, revision_number")
        .eq("id", requestId)
        .eq("user_id", ksUser.id)
        .eq("status", "rejected")
        .single();

    if (!original) {
        return { error: "修正対象の申請が見つからないか、修正権限がありません。" };
    }

    // 明細を更新（渡された場合のみ）
    let totalAmount: number | undefined;
    if (itemsJson) {
        try {
            const items: { item_name: string; quantity: number; unit_price: number }[] = JSON.parse(itemsJson);
            const validItems = items.filter((i) => i.item_name.trim() !== "");
            totalAmount = validItems.reduce(
                (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0
            );

            // 旧明細を削除
            await admin.from("ks_request_items").delete().eq("request_id", requestId);

            // 新明細を挿入
            if (validItems.length > 0) {
                await admin.from("ks_request_items").insert(
                    validItems.map((item, index) => ({
                        request_id: requestId,
                        item_name: item.item_name,
                        quantity: Number(item.quantity) || 1,
                        unit_price: Number(item.unit_price) || 0,
                        amount: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
                        sort_order: index,
                    }))
                );
            }
        } catch {
            return { error: "明細データの形式が不正です。" };
        }
    }

    // 申請データを更新
    const updateData: Record<string, unknown> = {
        status: "submitted",
        revision_number: (original.revision_number || 1) + 1,
        approval_flow: [],
        rejection_reason: null,
    };

    if (reason !== undefined && reason !== null) updateData.reason = reason;
    if (category !== undefined && category !== null) updateData.category = category;
    if (payee !== undefined && payee !== null) updateData.payee = payee;
    if (totalAmount !== undefined) updateData.total_amount = totalAmount;

    const { error: updateError } = await admin
        .from("ks_requests")
        .update(updateData)
        .eq("id", requestId);

    if (updateError) {
        console.error("❌ 再提出失敗:", updateError);
        return { error: `再提出に失敗しました: ${updateError.message}` };
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
}
