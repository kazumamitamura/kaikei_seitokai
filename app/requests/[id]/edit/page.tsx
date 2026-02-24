import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import EditRequestForm from "./edit-form";

export default async function EditRequestPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const admin = createAdminClient();

    const { data: ksUser } = await admin
        .from("ks_users")
        .select("id")
        .eq("auth_uid", user.id)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

    if (!ksUser) redirect("/setup");

    const { data: request, error } = await admin
        .from("ks_requests")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !request) notFound();

    if (request.user_id !== ksUser.id) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center max-w-md">
                    <p className="text-slate-300 mb-4">この申請の編集権限がありません。</p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        ダッシュボードへ
                    </Link>
                </div>
            </div>
        );
    }

    if (request.status !== "rejected") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center max-w-md">
                    <p className="text-slate-300 mb-4">
                        差し戻し（rejected）の申請のみ編集・再提出できます。
                    </p>
                    <Link
                        href={`/admin/${id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        詳細に戻る
                    </Link>
                </div>
            </div>
        );
    }

    const { data: items } = await admin
        .from("ks_request_items")
        .select("*")
        .eq("request_id", id)
        .order("sort_order");

    const initialItems = (items ?? []).map((row) => ({
        item_name: row.item_name || "",
        quantity: Number(row.quantity) || 1,
        unit_price: Number(row.unit_price) || 0,
    }));

    const defaultRows = 5;
    const paddedItems =
        initialItems.length >= defaultRows
            ? initialItems
            : [
                  ...initialItems,
                  ...Array.from({ length: defaultRows - initialItems.length }, () => ({
                      item_name: "",
                      quantity: 1,
                      unit_price: 0,
                  })),
              ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
            <div className="relative max-w-5xl mx-auto px-4 py-8">
                <header className="mb-8">
                    <Link
                        href={`/admin/${id}`}
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        詳細に戻る
                    </Link>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 text-sm font-bold">
                            編
                        </span>
                        修正・再提出
                        <span className="text-sm font-normal text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                            第{(request.revision_number ?? 1) + 1}版として再提出
                        </span>
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        内容を修正してから再提出してください。
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <span className="text-xs text-slate-400">現在</span>
                        <span className="text-sm font-bold text-indigo-300">第{request.revision_number ?? 1}版（{request.revision_number ?? 1}回目の提出）</span>
                    </div>
                </header>

                <EditRequestForm
                    requestId={id}
                    defaultValues={{
                        date: (request.date || "").toString().substring(0, 10),
                        job_title: request.job_title || "",
                        applicant_name: request.applicant_name || "",
                        category: request.category || "",
                        reason: request.reason || "",
                        payee: request.payee || "",
                        items: paddedItems,
                    }}
                />
            </div>
        </div>
    );
}
