"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function getGlobalAdmin() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data: ksUser } = await admin
        .from("ks_users")
        .select("id, role")
        .eq("auth_uid", user.id)
        .eq("role", "global_admin")
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

    return ksUser;
}

export async function approveRequest(
    requestId: string
): Promise<{ error: string | null }> {
    const ksUser = await getGlobalAdmin();
    if (!ksUser) {
        return { error: "権限がありません。全体管理者のみ実行できます。" };
    }

    const admin = createAdminClient();
    const { error } = await admin
        .from("ks_requests")
        .update({ status: "approved" })
        .eq("id", requestId)
        .eq("status", "submitted");

    if (error) {
        console.error("❌ 承認失敗:", error.message);
        return { error: `承認処理に失敗しました: ${error.message}` };
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { error: null };
}

export async function rejectRequest(
    requestId: string
): Promise<{ error: string | null }> {
    const ksUser = await getGlobalAdmin();
    if (!ksUser) {
        return { error: "権限がありません。全体管理者のみ実行できます。" };
    }

    const admin = createAdminClient();
    const { error } = await admin
        .from("ks_requests")
        .update({ status: "rejected" })
        .eq("id", requestId)
        .eq("status", "submitted");

    if (error) {
        console.error("❌ 差し戻し失敗:", error.message);
        return { error: `差し戻し処理に失敗しました: ${error.message}` };
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { error: null };
}
