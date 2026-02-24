"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * 差し戻し申請を編集して再提出する
 * 内容を更新し、status を submitted、revision_number +1、approval_flow をリセット
 */
export async function updateRequestAndResubmit(
    requestId: string,
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

    const { data: original } = await admin
        .from("ks_requests")
        .select("id, user_id, status, revision_number")
        .eq("id", requestId)
        .eq("user_id", ksUser.id)
        .eq("status", "rejected")
        .single();

    if (!original) {
        return { error: "修正対象の申請が見つからないか、編集権限がありません。" };
    }

    const date = formData.get("date") as string;
    const jobTitle = formData.get("job_title") as string;
    const applicantName = formData.get("applicant_name") as string;
    const category = formData.get("category") as string;
    const reason = formData.get("reason") as string;
    const payee = formData.get("payee") as string;
    const itemsJson = formData.get("items") as string;
    const receiptFile = formData.get("receipt") as File | null;

    if (!date || !jobTitle || !applicantName) {
        return { error: "記載日、職名、申請者氏名は必須です。" };
    }

    let items: { item_name: string; quantity: number; unit_price: number }[] = [];
    try {
        items = JSON.parse(itemsJson || "[]");
    } catch {
        return { error: "明細データの形式が不正です。" };
    }

    const validItems = items.filter((item) => item.item_name.trim() !== "");
    if (validItems.length === 0) {
        return { error: "少なくとも1つの明細を入力してください。" };
    }

    const totalAmount = validItems.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        0
    );

    let receiptPath: string | null = null;
    const { data: existingRequest } = await admin
        .from("ks_requests")
        .select("receipt_url")
        .eq("id", requestId)
        .single();

    if (receiptFile && receiptFile.size > 0) {
        const timestamp = Date.now();
        const safeName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${ksUser.club_id}/${timestamp}_${safeName}`;

        const { error: uploadError } = await admin.storage
            .from("ks_receipts")
            .upload(storagePath, receiptFile, {
                cacheControl: "3600",
                upsert: false,
            });

        if (uploadError) {
            return { error: `領収書のアップロードに失敗しました: ${uploadError.message}` };
        }
        receiptPath = storagePath;
    } else if (existingRequest?.receipt_url) {
        receiptPath = existingRequest.receipt_url;
    }

    await admin.from("ks_request_items").delete().eq("request_id", requestId);

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

    const updatePayload: Record<string, unknown> = {
        date,
        job_title: jobTitle,
        applicant_name: applicantName,
        category: category || "",
        reason: reason || "",
        payee: payee || "",
        total_amount: totalAmount,
        status: "submitted",
        revision_number: (original.revision_number || 1) + 1,
        approval_flow: [],
        rejection_reason: null,
        receipt_url: receiptPath,
    };

    const { error: updateError } = await admin
        .from("ks_requests")
        .update(updatePayload)
        .eq("id", requestId);

    if (updateError) {
        console.error("❌ 再提出失敗:", updateError);
        return { error: `再提出に失敗しました: ${updateError.message}` };
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
}
