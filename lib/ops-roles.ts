/**
 * Ops console roles. Not TMS roles and not Strapi CMS roles.
 * admin = full console including factory PO + finance
 * sales = quotes/customers/orders (no factory CNY, no GP)
 * viewer = read only (no factory, no finance)
 */

export const OPS_ROLES = ["admin", "sales", "viewer"] as const;

export type OpsRole = (typeof OPS_ROLES)[number];

export const OPS_PERMISSIONS = [
  "quotes.read",
  "quotes.write",
  "customers.read",
  "customers.write",
  "customers.merge",
  "customers.import",
  "orders.read",
  "orders.write",
  "audit.read",
  "assistant.use",
  "seo.write",
  "factory.read",
  "factory.write",
  "finance.read",
  "finance.write",
  "catalog.write",
  "users.read",
  "users.write",
] as const;

export type OpsPermission = (typeof OPS_PERMISSIONS)[number];

export type OpsActor = {
  email: string;
  name: string;
  role: OpsRole;
  staffId?: number;
  extraGrants?: OpsPermission[];
  extraDenies?: OpsPermission[];
};

export const ROLE_PERMISSIONS: Record<OpsRole, OpsPermission[]> = {
  admin: [...OPS_PERMISSIONS],
  sales: [
    "quotes.read",
    "quotes.write",
    "customers.read",
    "customers.write",
    "orders.read",
    "orders.write",
    "assistant.use",
    "seo.write",
    "catalog.write",
  ],
  viewer: ["quotes.read", "customers.read", "orders.read"],
};

export const ROLE_LABELS: Record<OpsRole, string> = {
  admin: "ผู้ดูแล",
  sales: "เซลล์",
  viewer: "ดูอย่างเดียว",
};

export const PERMISSION_LABELS: Record<OpsPermission, string> = {
  "quotes.read": "ดูใบเสนอราคา",
  "quotes.write": "แก้ใบเสนอราคา",
  "customers.read": "ดูลูกค้า",
  "customers.write": "แก้ลูกค้า",
  "customers.merge": "รวมลูกค้าซ้ำ",
  "customers.import": "นำเข้าลูกค้า",
  "orders.read": "ดูออเดอร์ / รับชำระ",
  "orders.write": "แก้ออเดอร์ / อนุมัติยอด",
  "audit.read": "ดูบันทึกการใช้งาน",
  "assistant.use": "ใช้ผู้ช่วยเซลล์",
  "seo.write": "แก้ SEO",
  "factory.read": "ดูใบสั่งโรงงาน",
  "factory.write": "แก้ใบสั่งโรงงาน",
  "finance.read": "ดูงบผู้บริหาร",
  "finance.write": "แก้บัญชี / ทรัพย์สิน",
  "catalog.write": "จัดการรูปโรงงาน",
  "users.read": "ดูรายชื่อพนักงาน",
  "users.write": "เพิ่ม/แก้สิทธิ์พนักงาน",
};

export const STAFF_DEPARTMENTS = [
  "sales",
  "accounting",
  "warehouse",
  "office",
  "other",
] as const;

export type StaffDepartment = (typeof STAFF_DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<StaffDepartment, string> = {
  sales: "ขาย",
  accounting: "บัญชี",
  warehouse: "คลัง / จัดส่ง",
  office: "สำนักงาน",
  other: "อื่น ๆ",
};

export function isStaffDepartment(
  value: string | null | undefined,
): value is StaffDepartment {
  return (STAFF_DEPARTMENTS as readonly string[]).includes(String(value || ""));
}

export function isOpsPermission(
  value: string | null | undefined,
): value is OpsPermission {
  return (OPS_PERMISSIONS as readonly string[]).includes(String(value || ""));
}

export function isOpsRole(value: string | null | undefined): value is OpsRole {
  return (OPS_ROLES as readonly string[]).includes(String(value || ""));
}

export function permissionsFor(role: OpsRole): OpsPermission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function actorMay(actor: OpsActor, permission: OpsPermission): boolean {
  if (actor.extraDenies?.includes(permission)) return false;
  if (actor.extraGrants?.includes(permission)) return true;
  return ROLE_PERMISSIONS[actor.role].includes(permission);
}

export function effectivePermissions(actor: OpsActor): OpsPermission[] {
  return OPS_PERMISSIONS.filter((permission) => actorMay(actor, permission));
}

export type OpsUserSeed = OpsActor & { password: string };

function parseOpsUsersJson(raw: string): OpsUserSeed[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: OpsUserSeed[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const email = String(row.email || "").trim().toLowerCase();
      const password = String(row.password || "");
      const name = String(row.name || "").trim() || email;
      const role = String(row.role || "").trim();
      if (!email || password.length < 12 || !isOpsRole(role)) continue;
      out.push({ email, password, role, name });
    }
    return out;
  } catch {
    return [];
  }
}

export function listOpsUserSeeds(): OpsUserSeed[] {
  const users = parseOpsUsersJson(process.env.OPS_USERS || "");
  const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();
  const adminEmail = (process.env.ADMIN_EMAIL || "admin").trim().toLowerCase();
  if (adminPassword.length >= 12) {
    const already = users.some((u) => u.email === adminEmail);
    if (!already) {
      users.unshift({
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        name: (process.env.ADMIN_NAME || "").trim() || "ผู้ดูแล",
      });
    }
  }
  return users;
}

export function findOpsUserByEmail(email: string): OpsUserSeed | null {
  const wanted = email.trim().toLowerCase();
  if (!wanted) return null;
  return listOpsUserSeeds().find((user) => user.email === wanted) ?? null;
}
