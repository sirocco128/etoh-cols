import { actorMay, ROLE_LABELS, type OpsActor } from "@/lib/ops-roles";
import { isNavActive } from "@/lib/nav";
import { getStrapiAdminUrl } from "@/lib/strapi-url";

export type OpsNavLink = {
  href: string;
  label: string;
  group: "primary" | "more";
  external?: boolean;
};

export function buildOpsNavLinks(actor: OpsActor): OpsNavLink[] {
  const links: OpsNavLink[] = [
    { href: "/ops", label: "ภาพรวม", group: "primary" },
    { href: "/ops/quotes", label: "ใบเสนอราคา", group: "primary" },
    { href: "/ops/orders", label: "ออเดอร์ / รับชำระ", group: "primary" },
    { href: "/ops/approvals", label: "อนุมัติยอด", group: "primary" },
    { href: "/ops/customers", label: "ลูกค้า", group: "primary" },
    { href: "/ops/cycle", label: "ปฏิบัติการ", group: "primary" },
  ];

  if (actorMay(actor, "factory.read")) {
    links.push({ href: "/ops/factory-po", label: "ใบสั่งโรงงาน", group: "more" });
  }
  if (actorMay(actor, "customers.write")) {
    links.push({ href: "/ops/line-lab", label: "ทดลองไลน์", group: "more" });
  }
  if (actorMay(actor, "finance.read")) {
    links.push({ href: "/ops/finance", label: "งบผู้บริหาร", group: "more" });
  }
  links.push({ href: "/ops/seo", label: "SEO", group: "more" });
  if (actorMay(actor, "catalog.write")) {
    links.push({
      href: getStrapiAdminUrl(),
      label: "เข้า Strapi",
      group: "primary",
      external: true,
    });
    links.push({ href: "/ops/catalog-images", label: "รูปโรงงาน", group: "more" });
  }
  if (actorMay(actor, "assistant.use")) {
    links.push({ href: "/ops/assistant", label: "ผู้ช่วยเซลล์", group: "more" });
  }
  if (actorMay(actor, "audit.read")) {
    links.push({ href: "/ops/audit", label: "บันทึกการใช้งาน", group: "more" });
  }
  if (actorMay(actor, "users.read")) {
    links.push({ href: "/ops/users", label: "ผู้ใช้ / สิทธิ์", group: "more" });
  }
  links.push({ href: "/", label: "เว็บสาธารณะ", group: "more" });
  return links;
}

export function isOpsNavActive(pathname: string, href: string): boolean {
  if (href.startsWith("http://") || href.startsWith("https://")) return false;
  if (href === "/ops") return pathname === "/ops";
  if (href === "/") return pathname === "/";
  return isNavActive(pathname, href);
}

export function opsActorLabel(actor: OpsActor): string {
  return `${actor.email} · ${ROLE_LABELS[actor.role]}`;
}
