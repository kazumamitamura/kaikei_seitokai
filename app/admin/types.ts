// 承認フロー共通型定義
// "use server" ファイルからは非同期関数以外をExportできないため、型と定数はここに分離

export const APPROVAL_ROLES = [
    "部署担当者",
    "教頭",
    "副校長",
    "校長",
    "理事長",
] as const;

export type ApprovalRole = (typeof APPROVAL_ROLES)[number];

export interface ApprovalEntry {
    role: ApprovalRole;
    name: string;
    approved_at: string;
}
