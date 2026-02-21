"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function setupClub(
    _prevState: { error: string | null },
    formData: FormData
): Promise<{ error: string | null }> {
    console.log("━━━ 1. Setup Action 開始 ━━━");

    // ── 1. 標準クライアント（Cookie認証）でユーザーID取得 ──
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error("❌ ユーザー取得失敗:", authError?.message);
        return { error: "認証エラー: ログインし直してください" };
    }
    console.log("✅ 2. ユーザーID取得成功:", user.id);

    // ── 2. フォームデータ取得 ──
    const lastName = (formData.get("last_name") as string)?.trim();
    const firstName = (formData.get("first_name") as string)?.trim();
    const clubName = (formData.get("club_name") as string)?.trim();
    const budgetStr = formData.get("total_budget") as string;
    const totalBudget = parseInt(budgetStr, 10);
    const displayName = `${lastName} ${firstName}`;
    console.log("📝 3. フォームデータ:", { lastName, firstName, clubName, totalBudget });

    if (!lastName || !firstName) {
        return { error: "姓と名を入力してください" };
    }
    if (!clubName) {
        return { error: "部活動名を入力してください" };
    }
    if (isNaN(totalBudget) || totalBudget < 0) {
        return { error: "有効な予算額を入力してください" };
    }

    // ── 3. Admin client (RLS bypass) ──
    let admin;
    try {
        admin = createAdminClient();
        console.log("✅ 4. Admin クライアント生成成功");
    } catch (e) {
        console.error("❌ Admin クライアント生成失敗:", e);
        return { error: "サーバー設定エラー: SUPABASE_SERVICE_ROLE_KEY を確認してください" };
    }

    // ── 4. 既存ユーザーチェック ──
    const { data: existingUser } = await admin
        .from("ks_users")
        .select("id, club_id")
        .eq("auth_uid", user.id)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

    if (existingUser) {
        // 既存ユーザー → display_name を UPDATE してダッシュボードへ
        console.log("⚠️ ユーザー既に登録済み → UPDATE して dashboard へ");
        await admin
            .from("ks_users")
            .update({ display_name: displayName })
            .eq("id", existingUser.id);

        revalidatePath("/", "layout");
        redirect("/dashboard");
    }

    // ── 5. ks_clubs に INSERT ──
    console.log("📤 5. ks_clubs INSERT 実行...");
    const { data: club, error: clubError } = await admin
        .from("ks_clubs")
        .insert({ name: clubName, total_budget: totalBudget })
        .select("id")
        .single();

    if (clubError || !club) {
        console.error("❌ ks_clubs INSERT 失敗:", clubError);
        return { error: `部活動の登録に失敗しました: ${clubError?.message}` };
    }
    console.log("✅ 6. ks_clubs INSERT 成功, club_id:", club.id);

    // ── 6. ks_users に UPSERT（auth_uid で一意性を確保） ──
    console.log("📤 7. ks_users UPSERT 実行...");
    const { error: userError } = await admin.from("ks_users").upsert(
        {
            auth_uid: user.id,
            club_id: club.id,
            display_name: displayName,
            role: "admin",
        },
        { onConflict: "auth_uid,club_id" }
    );

    if (userError) {
        console.error("❌ ks_users UPSERT 失敗:", userError);
        await admin.from("ks_clubs").delete().eq("id", club.id);
        return { error: `ユーザー登録に失敗しました: ${userError.message}` };
    }
    console.log("✅ 8. ks_users UPSERT 成功");

    // ── 7. キャッシュクリア → ダッシュボードへ ──
    console.log("🧹 9. revalidatePath 実行");
    revalidatePath("/", "layout");

    console.log("🚀 10. redirect('/dashboard') 実行");
    redirect("/dashboard");
}
