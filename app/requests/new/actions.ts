"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function submitRequest(
    formData: FormData
): Promise<{ error: string | null }> {
    // ── 1. 認証チェック ──
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: "認証エラー: ログインし直してください" };
    }

    // ── 2. ks_users 取得 ──
    const admin = createAdminClient();
    const { data: ksUser } = await admin
        .from("ks_users")
        .select("id, club_id")
        .eq("auth_uid", user.id)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

    if (!ksUser) {
        return { error: "ユーザー情報が見つかりません。初期設定を完了してください。" };
    }

    // ── 3. フォームデータの解析 ──
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

    // 明細の解析
    let items: { item_name: string; quantity: number; unit_price: number }[] = [];
    try {
        items = JSON.parse(itemsJson || "[]");
    } catch {
        return { error: "明細データの形式が不正です。" };
    }

    // 品名が入力された行のみ
    const validItems = items.filter((item) => item.item_name.trim() !== "");
    if (validItems.length === 0) {
        return { error: "少なくとも1つの明細を入力してください。" };
    }

    // 合計金額を計算
    const totalAmount = validItems.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        0
    );

    // ── 4. 領収書のアップロード（任意） ──
    let receiptPath: string | null = null;

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
            console.error("❌ 領収書アップロード失敗:", uploadError.message);
            return { error: `領収書のアップロードに失敗しました: ${uploadError.message}` };
        }

        receiptPath = storagePath;
    }

    // ── 5. ks_requests に INSERT ──
    const { data: request, error: requestError } = await admin
        .from("ks_requests")
        .insert({
            club_id: ksUser.club_id,
            user_id: ksUser.id,
            date,
            job_title: jobTitle,
            applicant_name: applicantName,
            category: category || "",
            reason: reason || "",
            payee: payee || "",
            total_amount: totalAmount,
            status: "submitted",
            receipt_url: receiptPath,
        })
        .select("id")
        .single();

    if (requestError || !request) {
        console.error("❌ ks_requests INSERT 失敗:", requestError);
        return { error: `申請の登録に失敗しました: ${requestError?.message}` };
    }

    // ── 6. ks_request_items に一括 INSERT ──
    const itemRows = validItems.map((item, index) => ({
        request_id: request.id,
        item_name: item.item_name,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        amount: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        sort_order: index,
    }));

    const { error: itemsError } = await admin
        .from("ks_request_items")
        .insert(itemRows);

    if (itemsError) {
        console.error("❌ ks_request_items INSERT 失敗:", itemsError);
        // リクエスト自体は作成済みなので、エラーログだけ残す
    }

    // ── 7. キャッシュクリア → ダッシュボードへ ──
    revalidatePath("/", "layout");
    redirect("/dashboard");
}
