export type Role = "member" | "admin" | "owner";

export const ROLE_LABEL: Record<Role, string> = { owner: "Inhaber", admin: "Admin", member: "Mitglied" };
